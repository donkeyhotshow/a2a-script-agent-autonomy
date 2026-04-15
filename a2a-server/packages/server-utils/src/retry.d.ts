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
export declare function calculateDelay(attempt: number, options?: Partial<BackoffOptions>): number;
export declare function calculateDelaySequence(options?: Partial<BackoffOptions>): number[];
export declare function sleep(ms: number): Promise<void>;
export interface RetryFunctionOptions<T> {
    fn: () => Promise<T>;
    onAttempt?: (attempt: number, delay: number) => void;
    onFailure?: (attempt: number, error: Error) => void;
    onSuccess?: (attempt: number, result: T) => void;
    retryIf?: (error: Error) => boolean;
    backoff?: Partial<BackoffOptions>;
}
export declare function retryWithBackoff<T>(options: RetryFunctionOptions<T>): Promise<T>;
export interface RetryOptions {
    maxAttempts?: number;
    delayMs?: number;
    backoff?: number;
    shouldRetry?: (error: unknown) => boolean;
}
export declare function backoffDelay(attempt: number, delayMs: number, backoff: number): number;
export declare function withRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>;
//# sourceMappingURL=retry.d.ts.map