/**
 * Exponential Backoff Utilities
 */
import { logger } from "./logger.js";
export { AGGRESSIVE_BACKOFF, DEFAULT_BACKOFF_OPTIONS, GENTLE_BACKOFF, backoffDelay, calculateDelay, calculateDelaySequence, retryWithBackoff, sleep, withRetry, } from "./retry.js";
export { CircuitBreaker, CircuitBreakerOpenError, DEFAULT_CIRCUIT_BREAKER_OPTIONS, withCircuitBreaker, } from "./circuit-breaker.js";
export { AdaptivePolling, DEFAULT_ADAPTIVE_POLLING, } from "./adaptive-polling.js";
export async function processBatchWithBackoff(options) {
    const { items, processor, batchSize, concurrency, backoff } = options;
    const results = [];
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
        batches.push(items.slice(i, i + batchSize));
    }
    logger.info("[Backoff] Starting batch processing", {
        totalItems: items.length,
        batchCount: batches.length,
        batchSize,
    });
    const { retryWithBackoff } = await import("./retry.js");
    for (let i = 0; i < batches.length; i += concurrency) {
        const batchGroup = batches.slice(i, i + concurrency);
        const batchPromises = batchGroup.map(async (batch, index) => {
            const batchIndex = i + index;
            options.onBatchStart?.(batch, batchIndex);
            try {
                const batchResults = await Promise.all(batch.map((item) => retryWithBackoff({
                    fn: () => processor(item),
                    backoff,
                })));
                options.onBatchComplete?.(batch, batchResults, batchIndex);
                return batchResults;
            }
            catch (error) {
                options.onBatchError?.(batch, error, batchIndex);
                throw error;
            }
        });
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults.flat());
    }
    return results;
}
const globalMetrics = {
    totalAttempts: 0,
    successfulRetries: 0,
    failedRetries: 0,
    circuitBreakerOpens: 0,
    averageDelay: 0,
};
export function recordRetryAttempt(success, delay) {
    globalMetrics.totalAttempts++;
    if (success) {
        globalMetrics.successfulRetries++;
    }
    else {
        globalMetrics.failedRetries++;
    }
    const totalDelay = globalMetrics.averageDelay * (globalMetrics.totalAttempts - 1) + delay;
    globalMetrics.averageDelay = totalDelay / globalMetrics.totalAttempts;
}
export function getGlobalRetryMetrics() {
    return { ...globalMetrics };
}
export function resetGlobalMetrics() {
    globalMetrics.totalAttempts = 0;
    globalMetrics.successfulRetries = 0;
    globalMetrics.failedRetries = 0;
    globalMetrics.circuitBreakerOpens = 0;
    globalMetrics.averageDelay = 0;
}
//# sourceMappingURL=backoff.js.map