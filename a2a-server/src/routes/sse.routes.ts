/**
 * SSE (Server-Sent Events) Routes
 * Real-time event streaming to clients
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Event emitter for broadcasting events to all clients
class SSEManager {
  private clients: Map<string, Set<Response>> = new Map();

  subscribe(sessionId: string, res: Response): void {
    if (!this.clients.has(sessionId)) {
      this.clients.set(sessionId, new Set());
    }
    this.clients.get(sessionId)!.add(res);
    logger.info('SSE client subscribed', { sessionId });
  }

  unsubscribe(sessionId: string, res: Response): void {
    const sessionClients = this.clients.get(sessionId);
    if (sessionClients) {
      sessionClients.delete(res);
      if (sessionClients.size === 0) {
        this.clients.delete(sessionId);
      }
    }
    logger.info('SSE client unsubscribed', { sessionId });
  }

  emit(sessionId: string, event: string, data: unknown): void {
    const sessionClients = this.clients.get(sessionId);
    if (!sessionClients) return;

    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    
    sessionClients.forEach((res) => {
      res.write(message);
    });
    
    logger.debug('SSE event emitted', { sessionId, event });
  }

  log(sessionId: string, message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    this.emit(sessionId, 'log', { message, level, timestamp: new Date().toISOString() });
  }

  progress(sessionId: string, current: number, total: number, message?: string): void {
    this.emit(sessionId, 'progress', { current, total, message, timestamp: new Date().toISOString() });
  }

  status(sessionId: string, status: string, details?: unknown): void {
    this.emit(sessionId, 'status', { status, details, timestamp: new Date().toISOString() });
  }

  complete(sessionId: string, result: unknown): void {
    this.emit(sessionId, 'complete', { result, timestamp: new Date().toISOString() });
  }

  error(sessionId: string, errorMsg: string): void {
    this.emit(sessionId, 'error', { error: errorMsg, timestamp: new Date().toISOString() });
  }
}

export const sseManager = new SSEManager();

/**
 * GET /api/v1/sse/:sessionId
 * Stream events for a specific session
 */
router.get('/:sessionId', authenticate, (req: Request, res: Response) => {
  const sessionId = (req.params['sessionId'] as string) ?? 'default';
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  // Send initial connection event
  res.write(`event: connected\ndata: ${JSON.stringify({ sessionId, timestamp: new Date().toISOString() })}\n\n`);
  
  // Subscribe client
  sseManager.subscribe(sessionId, res);
  
  const clientId = (req.client?.id as string) || 'unknown';
  logger.info('SSE connection established', { sessionId, clientId });

  // Handle client disconnect
  req.on('close', () => {
    sseManager.unsubscribe(sessionId, res);
    logger.info('SSE connection closed', { sessionId });
  });
});

/**
 * GET /api/v1/sse
 * Stream global events (no session)
 */
router.get('/', authenticate, (req: Request, res: Response) => {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const clientId = (req.client?.id as string) || 'anonymous';
  
  // Send initial connection event
  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, timestamp: new Date().toISOString() })}\n\n`);
  
  // Subscribe to global events
  sseManager.subscribe('global', res);
  
  logger.info('SSE global connection established', { clientId });

  // Handle client disconnect
  req.on('close', () => {
    sseManager.unsubscribe('global', res);
    logger.info('SSE global connection closed', { clientId });
  });
});

export default router;
