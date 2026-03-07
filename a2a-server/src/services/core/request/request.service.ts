/**
 * Request Service - Stateless Edition
 * No database, no storage. Just in-memory processing.
 * Client holds all state.
 */

import {logger} from '../../../utils/logger.js';

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
}

// In-memory storage only - lost on restart
const requests = new Map<string, RequestResult>();

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
            codeBlocks: data.codeBlocks || null,
            result: null,
            error: null,
            createdAt: new Date(),
            startedAt: null,
            completedAt: null,
        };
        
        requests.set(promiseId, req);
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
        const req = requests.get(promiseId);
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
        return requests.get(promiseId) || null;
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
        const req = requests.get(promiseId);
        if (!req) return false;
        
        const now = new Date();
        req.status = status;
        
        if (status === 'processing') req.startedAt = now;
        if (status === 'completed' || status === 'failed') req.completedAt = now;
        if (result !== undefined) req.result = result;
        if (error !== undefined) req.error = error;
        
        logger.info('Request status updated', {promiseId, status});
        return true;
    }

    /**
     * Cancel a pending request
     */
    async cancel(promiseId: string): Promise<boolean> {
        const req = requests.get(promiseId);
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
        let count = 0;
        for (const [promiseId, req] of requests) {
            if (req.status === 'pending') {
                req.status = 'cancelled';
                req.completedAt = new Date();
                count++;
            }
        }
        logger.warn('Cancelled all pending requests', {cancelledCount: count});
        return {cancelledCount: count};
    }

    /**
     * Get next pending request for processing
     */
    async getNextPending(): Promise<RequestResult | null> {
        for (const [promiseId, req] of requests) {
            if (req.status === 'pending') {
                req.status = 'processing';
                req.startedAt = new Date();
                logger.info('Processing request', {promiseId});
                return req;
            }
        }
        return null;
    }

    /**
     * Get queue length
     */
    async getQueueLength(): Promise<number> {
        let count = 0;
        for (const req of requests.values()) {
            if (req.status === 'pending') count++;
        }
        return count;
    }
}

export const requestService = new RequestService();
