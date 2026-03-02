import {Router, Request, Response, NextFunction} from 'express';
import {authenticate} from '../middleware/auth.middleware.js';
import {invoke} from '../services/invoke.service.js';

// Import routes
import requestsRoutes from './requests.routes.js';
import actionsRoutes from './actions.routes.js';
import sseRoutes from './sse.routes.js';

/**
 * a2a-server: async protocol with requests.
 * Accepts markdown + context + optional code blocks.
 */
const router = Router();

// Mount request routes  
router.use('/requests', requestsRoutes);

// Mount actions routes
router.use('/actions', actionsRoutes);

// Mount SSE routes
router.use('/sse', sseRoutes);


async function handleInvoke(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const body = req.body as { task?: string; context?: unknown; message?: string; code_blocks?: unknown };
        const clientId = (req as any).client?.id || 'anonymous';
        const {promiseId} = await invoke(clientId, {
            task: body.task,
            context: body.context,
            message: body.message,
            code_blocks: body.code_blocks as { path: string; content?: string }[] | undefined,
        });
        res.status(201).json({
            success: true,
            data: {
                promiseId,
                status: 'pending',
                message: 'Request queued for processing. Poll /api/v1/requests/:promiseId/status for status.',
            },
        });
    } catch (error) {
        next(error);
    }
}

router.post('/invoke', authenticate, handleInvoke);

// Health check - no auth required
router.get('/health', (_req: Request, res: Response) => {
    res.json({
        success: true,
        data: {
            status: 'healthy',
            mode: 'async',
            timestamp: new Date().toISOString(),
        },
    });
});

export default router;
