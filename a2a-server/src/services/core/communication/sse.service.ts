import type {Response} from 'express';
import {logger} from '../../../utils/logger.js';

class SSEManager {
    private clients: Map<string, Set<Response>> = new Map();

    subscribe(sessionId: string, res: Response): void {
        if (!this.clients.has(sessionId)) {
            this.clients.set(sessionId, new Set());
        }
        this.clients.get(sessionId)!.add(res);
        logger.info('SSE client subscribed', {sessionId});
    }

    unsubscribe(sessionId: string, res: Response): void {
        const sessionClients = this.clients.get(sessionId);
        if (sessionClients) {
            sessionClients.delete(res);
            if (sessionClients.size === 0) {
                this.clients.delete(sessionId);
            }
        }
        logger.info('SSE client unsubscribed', {sessionId});
    }

    emit(sessionId: string, event: string, data: unknown): void {
        const sessionClients = this.clients.get(sessionId);
        if (!sessionClients) return;

        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

        sessionClients.forEach((res) => {
            res.write(message);
        });

        logger.debug('SSE event emitted', {sessionId, event});
    }

    log(sessionId: string, message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
        this.emit(sessionId, 'log', {message, level, timestamp: new Date().toISOString()});
    }

    progress(sessionId: string, current: number, total: number, message?: string): void {
        this.emit(sessionId, 'progress', {current, total, message, timestamp: new Date().toISOString()});
    }

    status(sessionId: string, status: string, details?: unknown): void {
        this.emit(sessionId, 'status', {status, details, timestamp: new Date().toISOString()});
    }

    complete(sessionId: string, result: unknown): void {
        this.emit(sessionId, 'complete', {result, timestamp: new Date().toISOString()});
    }

    error(sessionId: string, errorMsg: string): void {
        this.emit(sessionId, 'error', {error: errorMsg, timestamp: new Date().toISOString()});
    }
}

export const sseManager = new SSEManager();
