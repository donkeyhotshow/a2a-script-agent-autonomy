/**
 * Retry Utilities
 * Provides retry mechanisms with exponential backoff and jitter
 */
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
export declare const DEFAULT_BACKOFF_OPTIONS: BackoffOptions;
export declare const AGGRESSIVE_BACKOFF: BackoffOptions;
export declare const GENTLE_BACKOFF: BackoffOptions;
/**
 * Calculate delay for a specific retry attempt using exponential backoff
 */
export declare function calculateDelay(attempt: number, options?: Partial<BackoffOptions>): number;
/**
 * Calculate all delays for all retry attempts
 */
export declare function calculateDelaySequence(options?: Partial<BackoffOptions>): number[];
/**
 * Sleep for a specified duration
 */
export declare function sleep(ms: number): Promise<void>;
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
export declare function retryWithBackoff<T>(options: RetryFunctionOptions<T>): Promise<T>;
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
 * Compute delay for attempt (0-based). Exponential: delayMs * backoff^attempt.
 */
export declare function backoffDelay(attempt: number, delayMs: number, backoff: number): number;
/**
 * Execute async fn with retries and optional exponential backoff.
 * Simple API for common retry patterns.
 * @throws Last error if all attempts fail.
 */
export declare function withRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>;
//# sourceMappingURL=retry.d.ts.map