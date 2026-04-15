/**
 * Retry Utilities
 * Provides retry mechanisms with exponential backoff and jitter
 */

import { logger } from "./logger.js";

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

export const DEFAULT_BACKOFF_OPTIONS: BackoffOptions = {
  initialDelay: 1000,
  multiplier: 2,
  maxDelay: 60000,
  maxRetries: 5,
  jitter: true,
  jitterFactor: 0.1,
};

export const AGGRESSIVE_BACKOFF: BackoffOptions = {
  initialDelay: 100,
  multiplier: 2,
  maxDelay: 10000,
  maxRetries: 10,
  jitter: true,
  jitterFactor: 0.2,
};

export const GENTLE_BACKOFF: BackoffOptions = {
  initialDelay: 5000,
  multiplier: 1.5,
  maxDelay: 300000,
  maxRetries: 3,
  jitter: true,
  jitterFactor: 0.05,
};

export function calculateDelay(
  attempt: number,
  options: Partial<BackoffOptions> = {},
): number {
  const opts = { ...DEFAULT_BACKOFF_OPTIONS, ...options };
  let delay = opts.initialDelay * Math.pow(opts.multiplier, attempt);
  delay = Math.min(delay, opts.maxDelay);

  if (opts.jitter) {
    const jitterAmount = delay * opts.jitterFactor;
    const jitter = (Math.random() * 2 - 1) * jitterAmount;
    delay = Math.max(0, delay + jitter);
  }

  return Math.round(delay);
}

export function calculateDelaySequence(options: Partial<BackoffOptions> = {}): number[] {
  const opts = { ...DEFAULT_BACKOFF_OPTIONS, ...options };
  const delays: number[] = [];
  for (let i = 0; i < opts.maxRetries; i++) {
    delays.push(calculateDelay(i, opts));
  }
  return delays;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface RetryFunctionOptions<T> {
  fn: () => Promise<T>;
  onAttempt?: (attempt: number, delay: number) => void;
  onFailure?: (attempt: number, error: Error) => void;
  onSuccess?: (attempt: number, result: T) => void;
  retryIf?: (error: Error) => boolean;
  backoff?: Partial<BackoffOptions>;
}

export async function retryWithBackoff<T>(options: RetryFunctionOptions<T>): Promise<T> {
  const opts = { ...DEFAULT_BACKOFF_OPTIONS, ...options.backoff };
  const state: RetryState = {
    attempt: 0,
    lastDelay: 0,
    totalDelay: 0,
    startTime: Date.now(),
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

      if (options.retryIf && !options.retryIf(err)) {
        throw err;
      }

      state.attempt++;
      if (state.attempt > opts.maxRetries) {
        options.onFailure?.(state.attempt, err);
        throw err;
      }

      const delay = calculateDelay(state.attempt - 1, opts);
      state.lastDelay = delay;
      state.totalDelay += delay;

      options.onAttempt?.(state.attempt, delay);

      logger.debug("[Backoff] Retrying after delay", {
        attempt: state.attempt,
        delay,
        error: err.message,
      });

      await sleep(delay);
    }
  }

  throw new Error("Max retries exceeded");
}

export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoff?: number;
  shouldRetry?: (error: unknown) => boolean;
}

export function backoffDelay(attempt: number, delayMs: number, backoff: number): number {
  return delayMs * Math.pow(backoff, attempt);
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
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
