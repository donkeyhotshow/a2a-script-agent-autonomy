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
export { BackoffOptions, RetryState, DEFAULT_BACKOFF_OPTIONS, AGGRESSIVE_BACKOFF, GENTLE_BACKOFF, calculateDelay, calculateDelaySequence, sleep, RetryFunctionOptions, retryWithBackoff, RetryOptions, backoffDelay, withRetry } from './retry.js';
export { CircuitBreakerOptions, RetryMetrics, DEFAULT_CIRCUIT_BREAKER_OPTIONS, CircuitBreaker, CircuitBreakerOpenError, withCircuitBreaker } from './circuit-breaker.js';
export { AdaptivePollingOptions, DEFAULT_ADAPTIVE_POLLING, AdaptivePolling } from './adaptive-polling.js';
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
export declare function processBatchWithBackoff<T, R>(options: BatchProcessorOptions<T, R>): Promise<R[]>;
export declare function recordRetryAttempt(success: boolean, delay: number): void;
export declare function getGlobalRetryMetrics(): import('./circuit-breaker.js').RetryMetrics;
export declare function resetGlobalMetrics(): void;
//# sourceMappingURL=backoff.d.ts.map