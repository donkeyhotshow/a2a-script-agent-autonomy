/**
 * Retry Utilities
 * Provides retry mechanisms with exponential backoff and jitter
 */
import { logger } from "./logger.js";
export const DEFAULT_BACKOFF_OPTIONS = {
    initialDelay: 1000,
    multiplier: 2,
    maxDelay: 60000,
    maxRetries: 5,
    jitter: true,
    jitterFactor: 0.1,
};
export const AGGRESSIVE_BACKOFF = {
    initialDelay: 100,
    multiplier: 2,
    maxDelay: 10000,
    maxRetries: 10,
    jitter: true,
    jitterFactor: 0.2,
};
export const GENTLE_BACKOFF = {
    initialDelay: 5000,
    multiplier: 1.5,
    maxDelay: 300000,
    maxRetries: 3,
    jitter: true,
    jitterFactor: 0.05,
};
export function calculateDelay(attempt, options = {}) {
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
export function calculateDelaySequence(options = {}) {
    const opts = { ...DEFAULT_BACKOFF_OPTIONS, ...options };
    const delays = [];
    for (let i = 0; i < opts.maxRetries; i++) {
        delays.push(calculateDelay(i, opts));
    }
    return delays;
}
export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
export async function retryWithBackoff(options) {
    const opts = { ...DEFAULT_BACKOFF_OPTIONS, ...options.backoff };
    const state = {
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
        }
        catch (error) {
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
export function backoffDelay(attempt, delayMs, backoff) {
    return delayMs * Math.pow(backoff, attempt);
}
export async function withRetry(fn, options = {}) {
    const maxAttempts = options.maxAttempts ?? 3;
    const delayMs = options.delayMs ?? 100;
    const backoff = options.backoff ?? 2;
    const shouldRetry = options.shouldRetry ?? (() => true);
    let lastError;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            return await fn();
        }
        catch (err) {
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
//# sourceMappingURL=retry.js.map