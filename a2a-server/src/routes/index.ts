import {Router, Request, Response, NextFunction} from 'express';
import {authenticate} from '../middleware/auth.middleware.js';
import {invoke} from '../services/utils/invoke.service.js';

// Import routes
import requestsRoutes from './requests.routes.js';
import actionsRoutes from './actions.routes.js';
import sseRoutes from './sse.routes.js';
import authRoutes from './auth.routes.js';
import healthRoutes from './health.routes.js';

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

// Mount auth routes
router.use('/auth', authRoutes);

// Mount health routes
router.use('/health', healthRoutes);


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

// Metrics endpoint - no auth required for Prometheus
router.get('/metrics', async (_req: Request, res: Response) => {
    try {
        const { toPrometheusFormat, getSystemMetrics } = await import('../services/utils/metrics.service.js');
        const accept = _req.headers.accept || '';
        
        if (accept.includes('application/json')) {
            const metrics = getSystemMetrics();
            res.json({ success: true, data: metrics });
        } else {
            // Default to Prometheus format
            const metrics = toPrometheusFormat();
            res.set('Content-Type', 'text/plain');
            res.send(metrics);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: {
                code: 'METRICS_ERROR',
                message: error instanceof Error ? error.message : 'Failed to get metrics'
            }
        });
    }
});

// Queue metrics endpoint
router.get('/queue/metrics', async (_req: Request, res: Response) => {
    try {
        const { getQueueMetrics, getQueueStats } = await import('../services/core/state/request-queue.service.js');
        const [metrics, stats] = await Promise.all([getQueueMetrics(), getQueueStats()]);
        
        res.json({
            success: true,
            data: {
                metrics,
                stats,
                timestamp: Date.now()
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: {
                code: 'QUEUE_METRICS_ERROR',
                message: error instanceof Error ? error.message : 'Failed to get queue metrics'
            }
        });
    }
});

// Polling optimizer metrics
router.get('/polling/metrics', async (_req: Request, res: Response) => {
    try {
        const { getAllMetrics, getAllStatuses } = await import('../services/utils/polling-optimizer.service.js');
        const [metrics, statuses] = await Promise.all([getAllMetrics(), getAllStatuses()]);
        
        res.json({
            success: true,
            data: {
                metrics,
                statuses,
                timestamp: Date.now()
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: {
                code: 'POLLING_METRICS_ERROR',
                message: error instanceof Error ? error.message : 'Failed to get polling metrics'
            }
        });
    }
});

export default router;
