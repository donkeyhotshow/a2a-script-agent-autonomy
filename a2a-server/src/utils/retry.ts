/**
 * Retry Utilities
 * Provides retry mechanisms with exponential backoff and jitter
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
