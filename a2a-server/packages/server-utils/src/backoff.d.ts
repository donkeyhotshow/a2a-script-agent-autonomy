/**
 * Exponential Backoff Utilities
 */
export { AGGRESSIVE_BACKOFF, DEFAULT_BACKOFF_OPTIONS, GENTLE_BACKOFF, backoffDelay, calculateDelay, calculateDelaySequence, retryWithBackoff, sleep, withRetry, type BackoffOptions, type RetryFunctionOptions, type RetryOptions, type RetryState, } from "./retry.js";
export { CircuitBreaker, CircuitBreakerOpenError, DEFAULT_CIRCUIT_BREAKER_OPTIONS, withCircuitBreaker, type CircuitBreakerOptions, type RetryMetrics, } from "./circuit-breaker.js";
export { AdaptivePolling, DEFAULT_ADAPTIVE_POLLING, type AdaptivePollingOptions, } from "./adaptive-polling.js";
export interface BatchProcessorOptions<T, R> {
    items: T[];
    processor: (item: T) => Promise<R>;
    batchSize: number;
    concurrency: number;
    backoff?: Partial<import("./retry.js").BackoffOptions>;
    onBatchStart?: (batch: T[], index: number) => void;
    onBatchComplete?: (batch: T[], results: R[], index: number) => void;
    onBatchError?: (batch: T[], error: Error, index: number) => void;
}
export declare function processBatchWithBackoff<T, R>(options: BatchProcessorOptions<T, R>): Promise<R[]>;
export declare function recordRetryAttempt(success: boolean, delay: number): void;
export declare function getGlobalRetryMetrics(): import("./circuit-breaker.js").RetryMetrics;
export declare function resetGlobalMetrics(): void;
//# sourceMappingURL=backoff.d.ts.map