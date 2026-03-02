/**
 * Requests Routes
 * API endpoints for async request processing
 */

import {Router, Request, Response, NextFunction} from 'express';
import {authenticate} from '../middleware/auth.middleware.js';
import {requestService} from '../services/request.service.js';
import {logger} from '../utils/logger.js';

const router = Router();

/**
 * POST /api/v1/requests
 * Create a new request and return promiseId
 */
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {context, message, codeBlocks, priority} = req.body;
        const clientId = req.client?.id || 'anonymous';

        // Validate required fields
        if (!context) {
            return res.status(400).json({
                success: false,
                error: {code: 'INVALID_REQUEST', message: 'context is required'},
            });
        }

        // Create request
        const {promiseId, id} = await requestService.create({
            clientId,
            context,
            message,
            codeBlocks,
            priority,
        });

        logger.info('Request created via API', {promiseId, requestId: id, clientId});

        res.status(201).json({
            success: true,
            data: {
                promiseId,
                requestId: id,
                status: 'pending',
            },
        });
    } catch (error) {
        logger.error('Request create failed', {error: String(error), stack: (error as Error)?.stack});
        next(error);
    }
});

/**
 * GET /api/v1/requests/:promiseId/status
 * Get request status
 */
router.get('/:promiseId/status', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {promiseId} = req.params;

        const status = await requestService.getStatus(promiseId);

        if (!status) {
            return res.status(404).json({
                success: false,
                error: {code: 'NOT_FOUND', message: 'Request not found'},
            });
        }

        res.json({
            success: true,
            data: status,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/v1/requests/:promiseId/result
 * Get full request result
 */
router.get('/:promiseId/result', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {promiseId} = req.params;

        const result = await requestService.getResult(promiseId);

        if (!result) {
            return res.status(404).json({
                success: false,
                error: {code: 'NOT_FOUND', message: 'Request not found'},
            });
        }

        if (result.status !== 'completed' && result.status !== 'failed') {
            return res.status(400).json({
                success: false,
                error: {code: 'NOT_READY', message: `Request is still ${result.status}`},
                data: {status: result.status},
            });
        }

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/v1/requests/queue/pending
 * Cancel all pending requests (queue clear)
 */
router.delete('/queue/pending', authenticate, async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const {cancelledCount} = await requestService.cancelAllPending();

        res.json({
            success: true,
            data: {cancelledCount},
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/v1/requests/:promiseId
 * Cancel a pending request
 */
router.delete('/:promiseId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {promiseId} = req.params;

        const cancelled = await requestService.cancel(promiseId);

        if (!cancelled) {
            return res.status(400).json({
                success: false,
                error: {code: 'CANNOT_CANCEL', message: 'Request cannot be cancelled (not found or not pending)'},
            });
        }

        res.json({
            success: true,
            data: {promiseId, status: 'cancelled'},
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/v1/requests/queue/stats
 * Get queue statistics (for monitoring)
 */
router.get('/queue/stats', authenticate, async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const queueLength = await requestService.getQueueLength();

        res.json({
            success: true,
            data: {
                pendingCount: queueLength,
            },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
