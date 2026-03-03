/**
 * SSE (Server-Sent Events) Routes
 * Real-time event streaming to clients
 */

import {Router, Request, Response} from 'express';
import {authenticate} from '../middleware/auth.middleware.js';
import {logger} from '../utils/logger.js';
import {sseManager} from '../services/sse.service.js';

const router = Router();

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
    res.write(`event: connected\ndata: ${JSON.stringify({sessionId, timestamp: new Date().toISOString()})}\n\n`);

    // Subscribe client
    sseManager.subscribe(sessionId, res);

    const clientId = (req.client?.id as string) || 'unknown';
    logger.info('SSE connection established', {sessionId, clientId});

    // Handle client disconnect
    req.on('close', () => {
        sseManager.unsubscribe(sessionId, res);
        logger.info('SSE connection closed', {sessionId});
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
    res.write(`event: connected\ndata: ${JSON.stringify({clientId, timestamp: new Date().toISOString()})}\n\n`);

    // Subscribe to global events
    sseManager.subscribe('global', res);

    logger.info('SSE global connection established', {clientId});

    // Handle client disconnect
    req.on('close', () => {
        sseManager.unsubscribe('global', res);
        logger.info('SSE global connection closed', {clientId});
    });
});

export default router;
