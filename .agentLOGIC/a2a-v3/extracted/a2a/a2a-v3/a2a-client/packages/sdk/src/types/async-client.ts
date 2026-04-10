/**
 * Async client types for handling long-running operations with promiseId support
 */

/**
 * Options for configuring the async client
 */
export interface AsyncClientOptions {
    httpClient: {
        get: (url: string) => Promise<Response>;
        post: (url: string, body: unknown) => Promise<Response>;
        put: (url: string, body: unknown) => Promise<Response>;
        delete: (url: string) => Promise<Response>;
    };
    baseUrl?: string;
}

/**
 * Status of an async operation
 */
export interface AsyncOperationStatus<T = unknown> {
    promiseId: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    progress?: {
        current: number;
        total: number;
        percentage: number;
        message?: string;
    };
    data?: T;
    error?: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Result of an async operation
 */
export interface AsyncOperationResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    metadata?: Record<string, unknown>;
}

/**
 * Error class for async client operations
 */
export class AsyncClientError extends Error {
    constructor(
        message: string,
        public readonly context: {
            promiseId?: string;
            timeout?: number;
            originalError?: unknown;
        }
    ) {
        super(message);
        this.name = 'AsyncClientError';
    }
}