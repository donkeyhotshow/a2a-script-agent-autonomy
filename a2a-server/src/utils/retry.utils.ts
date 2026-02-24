/**
 * Retry/backoff utilities per plans/utils-improvements.md.
 */

export interface RetryOptions {
  /** Max attempts (default 3) */
  maxAttempts?: number;
  /** Initial delay in ms (default 100) */
  delayMs?: number;
  /** Backoff multiplier (default 2). Use 1 for fixed delay. */
  backoff?: number;
  /** Custom predicate: retry only when (error) => true (default: retry on any error) */
  shouldRetry?: (error: unknown) => boolean;
}

/**
 * Sleep for given milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Compute delay for attempt (0-based). Exponential: delayMs * backoff^attempt.
 */
export function backoffDelay(attempt: number, delayMs: number, backoff: number): number {
  return delayMs * Math.pow(backoff, attempt);
}

/**
 * Execute async fn with retries and optional exponential backoff.
 * @throws Last error if all attempts fail.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const delayMs = options.delayMs ?? 100;
  const backoff = options.backoff ?? 2;
  const shouldRetry = options.shouldRetry ?? (() => true);

  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts - 1 || !shouldRetry(err)) {
        throw err;
      }
      const wait = backoffDelay(attempt, delayMs, backoff);
      await sleep(wait);
    }
  }
  throw lastError;
}
