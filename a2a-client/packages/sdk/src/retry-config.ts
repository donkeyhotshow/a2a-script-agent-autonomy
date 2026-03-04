/**
 * Retry configuration and utilities for API Client
 */

export interface RetryConfig {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    retryOn?: (error: ApiError) => boolean;
}

export interface RequestTransformer {
    transformRequest?: (data: Record<string, unknown>) => Record<string, unknown>;
    transformResponse?: (data: Record<string, unknown>) => Record<string, unknown>;
}

export interface ProgressConfig {
    enabled?: boolean;
    interval?: number;
    onProgress?: (progress: ProgressInfo) => void;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryOn: (error) => {
        // Retry on network errors or 5xx status codes
        return error.status >= 500 || error.status === 0;
    },
};

/**
 * Calculate delay for exponential backoff
 */
export function calculateDelay(attempt: number, config: Required<RetryConfig>): number {
    const delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt);
    return Math.min(delay, config.maxDelay);
}

/**
 * Check if error is retryable
 */
export function isRetryable(error: ApiError, config: Required<RetryConfig>): boolean {
    return config.retryOn(error);
}