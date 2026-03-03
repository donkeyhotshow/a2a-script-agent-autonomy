/**
 * Exponential Backoff Utilities
 *
 * Provides retry mechanisms with exponential backoff, jitter,
 * and circuit breaker patterns for resilient operations.
 */

import { logger } from './logger.js';

// ===========================================
// Types
// ===========================================

export interface BackoffOptions {
    /** Initial delay in milliseconds */
    initialDelay: number;
    /** Multiplier for each retry */
    multiplier: number;
    /** Maximum delay in milliseconds */
    maxDelay: number;
    /** Maximum number of retries */
    maxRetries: number;
    /** Add random jitter to prevent thundering herd */
    jitter: boolean;
    /** Jitter factor (0-1) */
    jitterFactor: number;
}

export interface RetryState {
    attempt: number;
    lastDelay: number;
    totalDelay: number;
    startTime: number;
}

export interface CircuitBreakerOptions {
    /** Number of failures before opening circuit */
    failureThreshold: number;
    /** Time in ms before attempting reset */
    resetTimeout: number;
    /** Number of successful calls to close circuit */
    successThreshold: number;
}

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface RetryMetrics {
    totalAttempts: number;
    successfulRetries: number;
    failedRetries: number;
    circuitBreakerOpens: number;
    averageDelay: number;
}

// ===========================================
// Default Configurations
// ===========================================

export const DEFAULT_BACKOFF_OPTIONS: BackoffOptions = {
    initialDelay: 1000,
    multiplier: 2,
    maxDelay: 60000,
    maxRetries: 5,
    jitter: true,
    jitterFactor: 0.1
};

export const DEFAULT_CIRCUIT_BREAKER_OPTIONS: CircuitBreakerOptions = {
    failureThreshold: 5,
    resetTimeout: 30000,
    successThreshold: 3
};

export const AGGRESSIVE_BACKOFF: BackoffOptions = {
    initialDelay: 100,
    multiplier: 2,
    maxDelay: 10000,
    maxRetries: 10,
    jitter: true,
    jitterFactor: 0.2
};

export const GENTLE_BACKOFF: BackoffOptions = {
    initialDelay: 5000,
    multiplier: 1.5,
    maxDelay: 300000,
    maxRetries: 3,
    jitter: true,
    jitterFactor: 0.05
};

// ===========================================
// Delay Calculation
// ===========================================

/**
 * Calculate delay for a specific retry attempt using exponential backoff
 */
export function calculateDelay(
    attempt: number,
    options: Partial<BackoffOptions> = {}
): number {
    const opts = { ...DEFAULT_BACKOFF_OPTIONS, ...options };
    
    // Calculate exponential delay
    let delay = opts.initialDelay * Math.pow(opts.multiplier, attempt);
    
    // Cap at max delay
    delay = Math.min(delay, opts.maxDelay);
    
    // Add jitter to prevent thundering herd
    if (opts.jitter) {
        const jitterAmount = delay * opts.jitterFactor;
        const jitter = (Math.random() * 2 - 1) * jitterAmount;
        delay = Math.max(0, delay + jitter);
    }
    
    return Math.round(delay);
}

/**
 * Calculate all delays for all retry attempts
 */
export function calculateDelaySequence(
    options: Partial<BackoffOptions> = {}
): number[] {
    const opts = { ...DEFAULT_BACKOFF_OPTIONS, ...options };
    const delays: number[] = [];
    
    for (let i = 0; i < opts.maxRetries; i++) {
        delays.push(calculateDelay(i, opts));
    }
    
    return delays;
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===========================================
// Retry Function
// ===========================================

export interface RetryFunctionOptions<T> {
    /** Function to retry */
    fn: () => Promise<T>;
    /** Optional callback for each attempt */
    onAttempt?: (attempt: number, delay: number) => void;
    /** Optional callback on failure */
    onFailure?: (attempt: number, error: Error) => void;
    /** Optional callback on success */
    onSuccess?: (attempt: number, result: T) => void;
    /** Optional predicate to determine if error is retryable */
    retryIf?: (error: Error) => boolean;
    /** Backoff options */
    backoff?: Partial<BackoffOptions>;
}

/**
 * Execute a function with exponential backoff retry
 */
export async function retryWithBackoff<T>(
    options: RetryFunctionOptions<T>
): Promise<T> {
    const opts = { ...DEFAULT_BACKOFF_OPTIONS, ...options.backoff };
    const state: RetryState = {
        attempt: 0,
        lastDelay: 0,
        totalDelay: 0,
        startTime: Date.now()
    };
    
    while (state.attempt <= opts.maxRetries) {
        try {
            const result = await options.fn();
            
            if (state.attempt > 0 && options.onSuccess) {
                options.onSuccess(state.attempt, result);
            }
            
            return result;
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            
            // Check if we should retry this error
            if (options.retryIf && !options.retryIf(err)) {
                throw err;
            }
            
            state.attempt++;
            
            if (state.attempt > opts.maxRetries) {
                if (options.onFailure) {
                    options.onFailure(state.attempt, err);
                }
                throw err;
            }
            
            // Calculate and apply delay
            const delay = calculateDelay(state.attempt - 1, opts);
            state.lastDelay = delay;
            state.totalDelay += delay;
            
            if (options.onAttempt) {
                options.onAttempt(state.attempt, delay);
            }
            
            logger.debug('[Backoff] Retrying after delay', {
                attempt: state.attempt,
                delay,
                error: err.message
            });
            
            await sleep(delay);
        }
    }
    
    throw new Error('Max retries exceeded');
}

// ===========================================
// Circuit Breaker
// ===========================================

export class CircuitBreaker {
    private state: CircuitState = 'CLOSED';
    private failures = 0;
    private successes = 0;
    private nextAttempt = 0;
    private options: CircuitBreakerOptions;
    private metrics: RetryMetrics;

    constructor(options: Partial<CircuitBreakerOptions> = {}) {
        this.options = { ...DEFAULT_CIRCUIT_BREAKER_OPTIONS, ...options };
        this.metrics = {
            totalAttempts: 0,
            successfulRetries: 0,
            failedRetries: 0,
            circuitBreakerOpens: 0,
            averageDelay: 0
        };
    }

    getState(): CircuitState {
        if (this.state === 'OPEN' && Date.now() >= this.nextAttempt) {
            this.state = 'HALF_OPEN';
            logger.info('[CircuitBreaker] Transitioning to HALF_OPEN');
        }
        return this.state;
    }

    async execute<T>(fn: () => Promise<T>): Promise<T> {
        const currentState = this.getState();
        
        if (currentState === 'OPEN') {
            throw new CircuitBreakerOpenError('Circuit breaker is OPEN');
        }
        
        this.metrics.totalAttempts++;
        
        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    private onSuccess(): void {
        if (this.state === 'HALF_OPEN') {
            this.successes++;
            if (this.successes >= this.options.successThreshold) {
                this.reset();
                logger.info('[CircuitBreaker] Circuit CLOSED after successful calls');
            }
        } else {
            this.failures = 0;
        }
        this.metrics.successfulRetries++;
    }

    private onFailure(): void {
        this.failures++;
        this.metrics.failedRetries++;
        
        if (this.failures >= this.options.failureThreshold) {
            this.open();
        }
    }

    private open(): void {
        this.state = 'OPEN';
        this.nextAttempt = Date.now() + this.options.resetTimeout;
        this.metrics.circuitBreakerOpens++;
        logger.warn('[CircuitBreaker] Circuit OPENED', {
            failures: this.failures,
            resetTimeout: this.options.resetTimeout
        });
    }

    private reset(): void {
        this.state = 'CLOSED';
        this.failures = 0;
        this.successes = 0;
    }

    forceOpen(): void {
        this.open();
    }

    forceClose(): void {
        this.reset();
    }

    getMetrics(): RetryMetrics {
        return { ...this.metrics };
    }
}

export class CircuitBreakerOpenError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CircuitBreakerOpenError';
    }
}

// ===========================================
// Adaptive Polling
// ===========================================

export interface AdaptivePollingOptions {
    /** Minimum polling interval in ms */
    minInterval: number;
    /** Maximum polling interval in ms */
    maxInterval: number;
    /** Factor to increase interval on empty results */
    backoffFactor: number;
    /** Factor to decrease interval on activity */
    accelerationFactor: number;
    /** Number of consecutive empty results before backing off */
    emptyThreshold: number;
}

export const DEFAULT_ADAPTIVE_POLLING: AdaptivePollingOptions = {
    minInterval: 1000,
    maxInterval: 60000,
    backoffFactor: 1.5,
    accelerationFactor: 0.5,
    emptyThreshold: 3
};

export class AdaptivePolling {
    private currentInterval: number;
    private consecutiveEmpty = 0;
    private options: AdaptivePollingOptions;

    constructor(options: Partial<AdaptivePollingOptions> = {}) {
        this.options = { ...DEFAULT_ADAPTIVE_POLLING, ...options };
        this.currentInterval = this.options.minInterval;
    }

    /**
     * Record a polling result and get the next interval
     */
    onPollResult(hasData: boolean): number {
        if (hasData) {
            // Activity detected - decrease interval
            this.consecutiveEmpty = 0;
            this.currentInterval = Math.max(
                this.options.minInterval,
                this.currentInterval * this.options.accelerationFactor
            );
        } else {
            // No data - increase interval after threshold
            this.consecutiveEmpty++;
            if (this.consecutiveEmpty >= this.options.emptyThreshold) {
                this.currentInterval = Math.min(
                    this.options.maxInterval,
                    this.currentInterval * this.options.backoffFactor
                );
            }
        }
        
        return Math.round(this.currentInterval);
    }

    getCurrentInterval(): number {
        return Math.round(this.currentInterval);
    }

    reset(): void {
        this.currentInterval = this.options.minInterval;
        this.consecutiveEmpty = 0;
    }
}

// ===========================================
// Batch Processing with Backoff
// ===========================================

export interface BatchProcessorOptions<T, R> {
    items: T[];
    processor: (item: T) => Promise<R>;
    batchSize: number;
    concurrency: number;
    backoff?: Partial<BackoffOptions>;
    onBatchStart?: (batch: T[], index: number) => void;
    onBatchComplete?: (batch: T[], results: R[], index: number) => void;
    onBatchError?: (batch: T[], error: Error, index: number) => void;
}

/**
 * Process items in batches with retry and backoff
 */
export async function processBatchWithBackoff<T, R>(
    options: BatchProcessorOptions<T, R>
): Promise<R[]> {
    const { items, processor, batchSize, concurrency } = options;
    const results: R[] = [];
    const batches: T[][] = [];
    
    // Split into batches
    for (let i = 0; i < items.length; i += batchSize) {
        batches.push(items.slice(i, i + batchSize));
    }
    
    logger.info('[Backoff] Starting batch processing', {
        totalItems: items.length,
        batchCount: batches.length,
        batchSize
    });
    
    // Process batches with concurrency limit
    for (let i = 0; i < batches.length; i += concurrency) {
        const batchGroup = batches.slice(i, i + concurrency);
        
        const batchPromises = batchGroup.map(async (batch, index) => {
            const batchIndex = i + index;
            
            if (options.onBatchStart) {
                options.onBatchStart(batch, batchIndex);
            }
            
            try {
                const batchResults = await Promise.all(
                    batch.map(item => 
                        retryWithBackoff({
                            fn: () => processor(item),
                            backoff: options.backoff
                        })
                    )
                );
                
                if (options.onBatchComplete) {
                    options.onBatchComplete(batch, batchResults, batchIndex);
                }
                
                return batchResults;
            } catch (error) {
                if (options.onBatchError) {
                    options.onBatchError(batch, error as Error, batchIndex);
                }
                throw error;
            }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults.flat());
    }
    
    return results;
}

// ===========================================
// Convenience Functions
// ===========================================

/**
 * Create a retryable function wrapper
 */
export function withRetry<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    backoffOptions?: Partial<BackoffOptions>
): T {
    return (async (...args: unknown[]) => {
        return retryWithBackoff({
            fn: () => fn(...args) as Promise<unknown>,
            backoff: backoffOptions
        });
    }) as T;
}

/**
 * Create a function with circuit breaker
 */
export function withCircuitBreaker<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    breakerOptions?: Partial<CircuitBreakerOptions>
): { execute: T; breaker: CircuitBreaker } {
    const breaker = new CircuitBreaker(breakerOptions);
    
    const execute = (async (...args: unknown[]) => {
        return breaker.execute(() => fn(...args) as Promise<unknown>);
    }) as T;
    
    return { execute, breaker };
}

// ===========================================
// Metrics
// ===========================================

const globalMetrics: RetryMetrics = {
    totalAttempts: 0,
    successfulRetries: 0,
    failedRetries: 0,
    circuitBreakerOpens: 0,
    averageDelay: 0
};

export function recordRetryAttempt(success: boolean, delay: number): void {
    globalMetrics.totalAttempts++;
    if (success) {
        globalMetrics.successfulRetries++;
    } else {
        globalMetrics.failedRetries++;
    }
    
    // Update running average
    const totalDelay = globalMetrics.averageDelay * (globalMetrics.totalAttempts - 1) + delay;
    globalMetrics.averageDelay = totalDelay / globalMetrics.totalAttempts;
}

export function getGlobalRetryMetrics(): RetryMetrics {
    return { ...globalMetrics };
}

export function resetGlobalMetrics(): void {
    globalMetrics.totalAttempts = 0;
    globalMetrics.successfulRetries = 0;
    globalMetrics.failedRetries = 0;
    globalMetrics.circuitBreakerOpens = 0;
    globalMetrics.averageDelay = 0;
}
