/**
 * Request Service - File-based storage.
 * Each request stored as {promiseId}.json in storage/requests/
 */

import * as path from 'path';
import {logger} from '../../../utils/logger.js';
import {RequestFileStorage} from './request-file-storage.js';

export type RequestStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface CreateRequestData {
    clientId: string;
    context: Record<string, unknown>;
    message?: string;
    codeBlocks?: Array<{ path: string; content: string }>;
    priority?: number;
}

export interface RequestResult {
    id: string;
    promiseId: string;
    clientId: string;
    status: RequestStatus;
    priority: number;
    context: Record<string, unknown>;
    message: string | null;
    codeBlocks: Array<{ path: string; content: string }> | null;
    result: Record<string, unknown> | null;
    error: Record<string, unknown> | null;
    createdAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
    retryCount?: number;
    retryAfter?: string;
}

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 8000;

export function isRetryableError(err: string): boolean {
    const s = err.toLowerCase();
    return /fetch failed|econnrefused|etimedout|network|timeout|socket hang up/.test(s);
}

const storageDir = process.env.REQUESTS_STORAGE_PATH ?? path.resolve(process.cwd(), 'storage', 'requests');
const storage = new RequestFileStorage(storageDir);

export class RequestService {
    /**
     * Create a new request and return promiseId
     */
    async create(data: CreateRequestData): Promise<{ promiseId: string; id: string }> {
        const id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const promiseId = `prom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const req: RequestResult = {
            id,
            promiseId,
            clientId: data.clientId,
            status: 'pending',
            priority: data.priority ?? 0,
            context: data.context,
            message: data.message || null,
            codeBlocks: data.codeBlocks ?? null,
            result: null,
            error: null,
            createdAt: new Date(),
            startedAt: null,
            completedAt: null,
        };

        await storage.save(req);
        logger.info('Request created', {requestId: id, promiseId, clientId: data.clientId});
        return {promiseId, id};
    }

    /**
     * Get request status by promiseId
     */
    async getStatus(promiseId: string): Promise<{
        promiseId: string;
        status: RequestStatus;
        createdAt: Date;
        startedAt: Date | null;
        completedAt: Date | null;
    } | null> {
        const req = await storage.load(promiseId);
        if (!req) return null;

        return {
            promiseId: req.promiseId,
            status: req.status,
            createdAt: req.createdAt,
            startedAt: req.startedAt,
            completedAt: req.completedAt,
        };
    }

    /**
     * Get full request result by promiseId
     */
    async getResult(promiseId: string): Promise<RequestResult | null> {
        return storage.load(promiseId);
    }

    /**
     * Update request status
     */
    async updateStatus(
        promiseId: string,
        status: RequestStatus,
        result?: Record<string, unknown>,
        error?: Record<string, unknown>
    ): Promise<boolean> {
        const req = await storage.load(promiseId);
        if (!req) return false;

        const now = new Date();
        req.status = status;
        if (status === 'processing') req.startedAt = now;
        if (status === 'completed' || status === 'failed') req.completedAt = now;
        if (result !== undefined) req.result = result;
        if (error !== undefined) req.error = error;

        await storage.save(req);
        logger.info('Request status updated', {promiseId, status});
        return true;
    }

    /**
     * Cancel a pending request
     */
    async cancel(promiseId: string): Promise<boolean> {
        const req = await storage.load(promiseId);
        if (!req) return false;
        if (req.status !== 'pending') {
            logger.warn('Cannot cancel request - not in pending state', {promiseId, currentStatus: req.status});
            return false;
        }
        return this.updateStatus(promiseId, 'cancelled');
    }

    /**
     * Cancel all pending requests
     */
    async cancelAllPending(): Promise<{ cancelledCount: number }> {
        const ids = await storage.listPending();
        let count = 0;
        for (const promiseId of ids) {
            await this.updateStatus(promiseId, 'cancelled');
            count++;
        }
        if (count > 0) {
            logger.warn('Cancelled all pending requests', {cancelledCount: count});
        }
        return {cancelledCount: count};
    }

    /**
     * Schedule retry for a failed request (transient error)
     */
    async scheduleRetry(promiseId: string, delayMs: number = RETRY_DELAY_MS): Promise<boolean> {
        const req = await storage.load(promiseId);
        if (!req) return false;
        const count = (req.retryCount ?? 0) + 1;
        if (count > MAX_RETRIES) {
            logger.warn('Max retries exceeded', {promiseId, count});
            return false;
        }
        req.status = 'pending';
        req.startedAt = null;
        req.completedAt = null;
        req.result = null;
        req.error = null;
        (req as RequestResult).retryCount = count;
        (req as RequestResult).retryAfter = new Date(Date.now() + delayMs).toISOString();
        await storage.save(req);
        logger.info('Scheduled retry', {promiseId, retryCount: count, delayMs});
        return true;
    }

    /**
     * Revive retryable failed requests (e.g. after server restart)
     */
    async scheduleRetryForFailed(): Promise<number> {
        const ids = await storage.listFailed();
        let revived = 0;
        for (const id of ids) {
            const req = await storage.load(id);
            if (!req) continue;
            const errMsg = req.error ? String((req.error as Record<string, unknown>).message ?? (req.error as Record<string, unknown>).error ?? '') : '';
            const resultError = req.result ? String((req.result as Record<string, unknown>).error ?? '') : '';
            const err = errMsg || resultError;
            if (!isRetryableError(err)) continue;
            const count = (req.retryCount ?? 0);
            if (count >= MAX_RETRIES) continue;
            const ok = await this.scheduleRetry(id, RETRY_DELAY_MS);
            if (ok) revived++;
        }
        if (revived > 0) logger.info('Revived failed requests for retry', {count: revived});
        return revived;
    }

    /**
     * Get next pending request for processing
     */
    async getNextPending(): Promise<RequestResult | null> {
        const ids = await storage.listPending();
        if (ids.length === 0) return null;

        const all = await Promise.all(ids.map((id) => storage.load(id)));
        const withCreated = all
            .filter((r): r is RequestResult => r !== null)
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

        const next = withCreated[0];
        if (!next) return null;

        next.status = 'processing';
        next.startedAt = new Date();
        (next as RequestResult).retryAfter = undefined; // clear when processing
        await storage.save(next);
        logger.info('Processing request', {promiseId: next.promiseId, retryCount: next.retryCount});
        return next;
    }

    /**
     * Get queue length
     */
    async getQueueLength(): Promise<number> {
        const ids = await storage.listPending();
        return ids.length;
    }

    /**
     * Get status for multiple promiseIds in one call
     */
    async getStatusBatch(promiseIds: string[]): Promise<Array<{
        promiseId: string;
        status: RequestStatus;
        createdAt: Date;
        startedAt: Date | null;
        completedAt: Date | null;
    } | null>> {
        return Promise.all(promiseIds.map((id) => this.getStatus(id)));
    }
}

export const requestService = new RequestService();
