/**
 * Promise polling utilities for API Client
 */

import type { ProgressInfo, ProgressCallbacks } from './types/session.js';

export interface PollingOptions {
    interval?: number;
    maxAttempts?: number;
}

export interface PollCallbacks {
    onComplete?: (result: unknown) => void;
    onError?: (error: { message?: string }) => void;
    onStatus?: (status: unknown) => void;
    onProgress?: (progress: ProgressInfo) => void;
}

interface PollState {
    timerId: ReturnType<typeof setTimeout> | null;
    callbacks: PollCallbacks;
    attempts: number;
    startTime: number;
    lastProgress?: number;
}

export class PromisePoller {
    private api: AsyncApiClient;
    private interval: number;
    private maxAttempts: number;
    private activePollers = new Map<string, PollState>();

    constructor(apiClient: AsyncApiClient, options: PollingOptions = {}) {
        this.api = apiClient;
        this.interval = options.interval ?? Number(process.env.REQUEST_PROCESSOR_INTERVAL_MS) ?? 5000;
        this.maxAttempts = options.maxAttempts ?? 720;
    }

    start(promiseId: string, callbacks: PollCallbacks): void {
        if (this.activePollers.has(promiseId)) return;
        this.activePollers.set(promiseId, {
            timerId: null,
            callbacks,
            attempts: 0,
            startTime: Date.now()
        });
        this._poll(promiseId);
    }

    private _buildProgressInfo(status: Record<string, unknown>, attempts: number, startTime: number): ProgressInfo {
        const st = status as { status?: string; progress?: number; message?: string };
        const progress = st.progress ?? Math.min((attempts / this.maxAttempts) * 100, 95);
        const elapsed = Date.now() - startTime;
        
        return {
            promiseId: '', // Will be set by caller
            status: st.status ?? 'pending',
            progress,
            message: st.message ?? `Processing... (${attempts} attempts, ${Math.round(elapsed / 1000)}s elapsed)`,
        };
    }

    private async _poll(promiseId: string): Promise<void> {
        const pollState = this.activePollers.get(promiseId);
        if (!pollState) return;
        pollState.attempts++;
        try {
            const status = await this.api.getRequestStatus(promiseId);
            pollState.callbacks.onStatus?.(status);
            
            // Build and emit progress info
            const progressInfo: ProgressInfo = {
                promiseId,
                status: (status as { status?: string }).status ?? 'pending',
                progress: Math.min((pollState.attempts / this.maxAttempts) * 100, 95),
                message: `Status: ${(status as { status?: string }).status ?? 'unknown'}`,
            };
            pollState.callbacks.onProgress?.(progressInfo);
            
            const st = status as { status?: string };
            if (st.status === 'completed') {
                const result = await this.api.getRequestResult(promiseId);
                progressInfo.status = 'completed';
                progressInfo.progress = 100;
                progressInfo.message = 'Request completed successfully';
                progressInfo.result = result;
                pollState.callbacks.onProgress?.(progressInfo);
                pollState.callbacks.onComplete?.(result);
                this.stop(promiseId);
            } else if (st.status === 'failed') {
                const result = (await this.api.getRequestResult(promiseId)) as { error?: { message?: string } };
                progressInfo.status = 'failed';
                progressInfo.error = result?.error?.message ?? 'Request failed';
                pollState.callbacks.onProgress?.(progressInfo);
                pollState.callbacks.onError?.(result?.error ?? {message: 'Request failed'});
                this.stop(promiseId);
            } else if (st.status === 'cancelled') {
                progressInfo.status = 'cancelled';
                progressInfo.error = 'Request was cancelled';
                pollState.callbacks.onProgress?.(progressInfo);
                pollState.callbacks.onError?.({message: 'Request was cancelled'});
                this.stop(promiseId);
            } else if (pollState.attempts >= this.maxAttempts) {
                progressInfo.status = 'timeout';
                progressInfo.error = 'Polling timeout exceeded';
                pollState.callbacks.onProgress?.(progressInfo);
                pollState.callbacks.onError?.({message: 'Polling timeout exceeded'});
                this.stop(promiseId);
            } else {
                pollState.timerId = setTimeout(() => this._poll(promiseId), this.interval);
            }
        } catch (error) {
            const progressInfo: ProgressInfo = {
                promiseId,
                status: 'error',
                error: (error as Error).message,
            };
            pollState.callbacks.onProgress?.(progressInfo);
            pollState.callbacks.onError?.({message: (error as Error).message});
            this.stop(promiseId);
        }
    }

    stop(promiseId: string): void {
        const pollState = this.activePollers.get(promiseId);
        if (pollState) {
            if (pollState.timerId) clearTimeout(pollState.timerId);
            this.activePollers.delete(promiseId);
        }
    }

    stopAll(): void {
        for (const promiseId of this.activePollers.keys()) this.stop(promiseId);
    }

    getActiveCount(): number {
        return this.activePollers.size;
    }
}