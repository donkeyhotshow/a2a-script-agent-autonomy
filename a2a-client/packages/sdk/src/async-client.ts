/**
 * Async client for handling long-running operations with promiseId support
 */

import type { AsyncClientOptions, AsyncOperationResult, AsyncOperationStatus } from './types/async-client.js';
import { AsyncClientError } from './types/async-client.js';

/**
 * Async client for handling long-running operations
 */
export class AsyncClient {
    private options: AsyncClientOptions;
    private pendingOperations: Map<string, Promise<AsyncOperationResult>> = new Map();

    constructor(options: AsyncClientOptions) {
        this.options = options;
    }

    /**
     * Execute an async operation and wait for completion
     */
    async executeAsyncOperation<T = unknown>(
        operation: () => Promise<{ promiseId: string }>,
        options?: {
            timeout?: number;
            pollInterval?: number;
            onProgress?: (status: AsyncOperationStatus) => void;
        }
    ): Promise<AsyncOperationResult<T>> {
        const { timeout = 300000, pollInterval = 1000, onProgress } = options || {};

        // Execute the operation to get promiseId
        const { promiseId } = await operation();

        // Check if we already have a pending operation for this promiseId
        if (this.pendingOperations.has(promiseId)) {
            return this.pendingOperations.get(promiseId) as Promise<AsyncOperationResult<T>>;
        }

        // Create new operation promise
        const operationPromise = this.waitForOperationCompletion<T>(promiseId, {
            timeout,
            pollInterval,
            onProgress
        });

        this.pendingOperations.set(promiseId, operationPromise);

        try {
            const result = await operationPromise;
            this.pendingOperations.delete(promiseId);
            return result;
        } catch (error) {
            this.pendingOperations.delete(promiseId);
            throw error;
        }
    }

    /**
     * Wait for an operation to complete
     */
    private async waitForOperationCompletion<T = unknown>(
        promiseId: string,
        options: {
            timeout: number;
            pollInterval: number;
            onProgress?: (status: AsyncOperationStatus) => void;
        }
    ): Promise<AsyncOperationResult<T>> {
        const { timeout, pollInterval, onProgress } = options;
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            try {
                const status = await this.checkOperationStatus<T>(promiseId);
                
                if (onProgress) {
                    onProgress(status);
                }

                if (status.status === 'completed') {
                    return {
                        success: true,
                        data: status.data,
                        metadata: status.metadata
                    };
                } else if (status.status === 'failed') {
                    return {
                        success: false,
                        error: status.error,
                        metadata: status.metadata
                    };
                }

                // Wait before polling again
                await new Promise(resolve => setTimeout(resolve, pollInterval));

            } catch (error) {
                throw new AsyncClientError(`Failed to check operation status: ${error instanceof Error ? error.message : String(error)}`, {
                    promiseId,
                    originalError: error
                });
            }
        }

        throw new AsyncClientError(`Operation ${promiseId} timed out after ${timeout}ms`, {
            promiseId,
            timeout
        });
    }

    /**
     * Check the status of an async operation
     */
    private async checkOperationStatus<T = unknown>(promiseId: string): Promise<AsyncOperationStatus<T>> {
        try {
            const response = await this.options.httpClient.get(`/async/status/${promiseId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            return {
                promiseId,
                status: data.status,
                progress: data.progress,
                data: data.data,
                error: data.error,
                metadata: data.metadata,
                createdAt: new Date(data.createdAt),
                updatedAt: new Date(data.updatedAt)
            };
        } catch (error) {
            throw new AsyncClientError(`Failed to check operation status: ${error instanceof Error ? error.message : String(error)}`, {
                promiseId,
                originalError: error
            });
        }
    }

    /**
     * Cancel an async operation
     */
    async cancelOperation(promiseId: string): Promise<boolean> {
        try {
            const response = await this.options.httpClient.post(`/async/cancel/${promiseId}`, {});
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return true;
        } catch (error) {
            throw new AsyncClientError(`Failed to cancel operation: ${error instanceof Error ? error.message : String(error)}`, {
                promiseId,
                originalError: error
            });
        }
    }

    /**
     * Get status of an operation without waiting
     */
    async getOperationStatus<T = unknown>(promiseId: string): Promise<AsyncOperationStatus<T>> {
        return this.checkOperationStatus<T>(promiseId);
    }

    /**
     * List all pending operations
     */
    async listPendingOperations(): Promise<string[]> {
        try {
            const response = await this.options.httpClient.get('/async/pending');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data.pendingOperations || [];
        } catch (error) {
            throw new AsyncClientError(`Failed to list pending operations: ${error instanceof Error ? error.message : String(error)}`, {
                originalError: error
            });
        }
    }

    /**
     * Clean up all pending operations
     */
    async cleanup(): Promise<void> {
        const pendingOperations = Array.from(this.pendingOperations.keys());
        
        for (const promiseId of pendingOperations) {
            try {
                await this.cancelOperation(promiseId);
            } catch (error) {
                // Log error but don't throw to allow cleanup to continue
                console.warn(`Failed to cancel operation ${promiseId}:`, error);
            }
        }
        
        this.pendingOperations.clear();
    }
}

/**
 * Create an async client instance
 */
export function createAsyncClient(options: AsyncClientOptions): AsyncClient {
    return new AsyncClient(options);
}