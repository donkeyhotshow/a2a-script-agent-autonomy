/**
 * Exponential Backoff Utilities
 */

import { logger } from "./logger.js";

export {
  AGGRESSIVE_BACKOFF,
  DEFAULT_BACKOFF_OPTIONS,
  GENTLE_BACKOFF,
  backoffDelay,
  calculateDelay,
  calculateDelaySequence,
  retryWithBackoff,
  sleep,
  withRetry,
  type BackoffOptions,
  type RetryFunctionOptions,
  type RetryOptions,
  type RetryState,
} from "./retry.js";

export {
  CircuitBreaker,
  CircuitBreakerOpenError,
  DEFAULT_CIRCUIT_BREAKER_OPTIONS,
  withCircuitBreaker,
  type CircuitBreakerOptions,
  type RetryMetrics,
} from "./circuit-breaker.js";

export {
  AdaptivePolling,
  DEFAULT_ADAPTIVE_POLLING,
  type AdaptivePollingOptions,
} from "./adaptive-polling.js";

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

export async function processBatchWithBackoff<T, R>(
  options: BatchProcessorOptions<T, R>,
): Promise<R[]> {
  const { items, processor, batchSize, concurrency, backoff } = options;
  const results: R[] = [];
  const batches: T[][] = [];

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
        const batchResults = await Promise.all(
          batch.map((item) =>
            retryWithBackoff({
              fn: () => processor(item),
              backoff,
            }),
          ),
        );

        options.onBatchComplete?.(batch, batchResults, batchIndex);
        return batchResults;
      } catch (error) {
        options.onBatchError?.(batch, error as Error, batchIndex);
        throw error;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.flat());
  }

  return results;
}

const globalMetrics: import("./circuit-breaker.js").RetryMetrics = {
  totalAttempts: 0,
  successfulRetries: 0,
  failedRetries: 0,
  circuitBreakerOpens: 0,
  averageDelay: 0,
};

export function recordRetryAttempt(success: boolean, delay: number): void {
  globalMetrics.totalAttempts++;
  if (success) {
    globalMetrics.successfulRetries++;
  } else {
    globalMetrics.failedRetries++;
  }

  const totalDelay =
    globalMetrics.averageDelay * (globalMetrics.totalAttempts - 1) + delay;
  globalMetrics.averageDelay = totalDelay / globalMetrics.totalAttempts;
}

export function getGlobalRetryMetrics(): import("./circuit-breaker.js").RetryMetrics {
  return { ...globalMetrics };
}

export function resetGlobalMetrics(): void {
  globalMetrics.totalAttempts = 0;
  globalMetrics.successfulRetries = 0;
  globalMetrics.failedRetries = 0;
  globalMetrics.circuitBreakerOpens = 0;
  globalMetrics.averageDelay = 0;
}
