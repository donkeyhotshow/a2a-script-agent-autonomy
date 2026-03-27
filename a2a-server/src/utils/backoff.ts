/**
 * Exponential Backoff Utilities
 *
 * Provides retry mechanisms with exponential backoff, jitter,
 * and circuit breaker patterns for resilient operations.
 *
 * This module re-exports from specialized modules:
 * - retry.ts - retry logic
 * - circuit-breaker.ts - circuit breaker
 * - adaptive-polling.ts - adaptive polling
 */

import { logger } from './logger.js';

// Re-export from retry.ts
export {
    BackoffOptions,
    RetryState,
    DEFAULT_BACKOFF_OPTIONS,
    AGGRESSIVE_BACKOFF,
    GENTLE_BACKOFF,
    calculateDelay,
    calculateDelaySequence,
    sleep,
    RetryFunctionOptions,
    retryWithBackoff,
    RetryOptions,
    backoffDelay,
    withRetry
} from './retry.js';

// Re-export from circuit-breaker.ts
export {
    CircuitBreakerOptions,
    RetryMetrics,
    DEFAULT_CIRCUIT_BREAKER_OPTIONS,
    CircuitBreaker,
    CircuitBreakerOpenError,
    withCircuitBreaker
} from './circuit-breaker.js';

// Re-export from adaptive-polling.ts
export {
    AdaptivePollingOptions,
    DEFAULT_ADAPTIVE_POLLING,
    AdaptivePolling
} from './adaptive-polling.js';

// ===========================================
// Batch Processing with Backoff (kept here due to dependency on retry.ts)
// ===========================================

export interface BatchProcessorOptions<T, R> {
    items: T[];
    processor: (item: T) => Promise<R>;
    batchSize: number;
    concurrency: number;
    backoff?: Partial<import('./retry.js').BackoffOptions>;
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
    const { items, processor, batchSize, concurrency, backoff } = options;
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
    
    // Import retryWithBackoff dynamically to avoid circular dependency
    const { retryWithBackoff } = await import('./retry.js');
    
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
                            backoff
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
// Metrics
// ===========================================

const globalMetrics: import('./circuit-breaker.js').RetryMetrics = {
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

export function getGlobalRetryMetrics(): import('./circuit-breaker.js').RetryMetrics {
    return { ...globalMetrics };
}

export function resetGlobalMetrics(): void {
    globalMetrics.totalAttempts = 0;
    globalMetrics.successfulRetries = 0;
    globalMetrics.failedRetries = 0;
    globalMetrics.circuitBreakerOpens = 0;
    globalMetrics.averageDelay = 0;
}
