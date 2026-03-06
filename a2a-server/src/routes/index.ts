import {Router, Request, Response, NextFunction} from 'express';
import {authenticate} from '../middleware/auth.middleware.js';
import {invoke} from '../services/utils/invoke.service.js';
import { getSchemaValidator } from '../services/core/validation/schema-validator.service.js';

// Import routes
import requestsRoutes from './requests.routes.js';
import actionsRoutes from './actions.routes.js';
import sseRoutes from './sse.routes.js';
import authRoutes from './auth.routes.js';
import healthRoutes from './health.routes.js';
import versionsRoutes from './versions.routes.js';
import testerRoutes from './tester.routes.js';
import storageRoutes from './storage.routes.js';

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

// Mount versions routes
router.use('/versions', versionsRoutes);

// Mount tester routes
router.use('/tester', testerRoutes);

// Mount storage routes
router.use('/', storageRoutes);


async function handleInvoke(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const body = req.body as { 
            task?: string; 
            context?: unknown; 
            message?: string; 
            code_blocks?: unknown;
            result?: unknown;  // result с action-key shape
            action?: string;   // action_selection, step_result
            selectedAction?: { actionId: string };
            stepId?: string;
            stepResult?: unknown;
        };
        
        // Validate request against JSON schema (if validation is enabled)
        const schemaValidator = getSchemaValidator();
        const validationResult = schemaValidator.validateRequest(body);
        
        if (!validationResult.valid) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Request validation failed',
                    details: validationResult.errors
                }
            });
            return;
        }
        
        const clientId = (req as any).client?.id || 'anonymous';
        
        const invokeResult = await invoke(clientId, {
            task: body.task,
            context: body.context,
            message: body.message,
            code_blocks: body.code_blocks as { path: string; content?: string }[] | undefined,
            // Новые поля для поддержки нового протокола
            action: body.action,
            selectedAction: body.selectedAction,
            stepId: body.stepId,
            stepResult: body.stepResult,
            result: body.result,
        });

        // Synchronous response - return execute immediately
        if (invokeResult.sync) {
            return res.status(200).json({
                success: true,
                data: {
                    execute: invokeResult.execute,
                    context: invokeResult.context,
                    status: 'completed',
                    sync: true,
                },
            });
        }

        // Async response - return promiseId
        res.status(201).json({
            success: true,
            data: {
                promiseId: invokeResult.promiseId,
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

// Pipeline observability metrics
router.get('/pipeline/metrics', async (_req: Request, res: Response) => {
    try {
        const { getPipelineMetrics, getPipelineStatus } = await import('../services/utils/pipeline-observability.service.js');
        const [metrics, status] = await Promise.all([getPipelineMetrics(), getPipelineStatus()]);
        
        res.json({
            success: true,
            data: {
                metrics,
                activeRequests: status.activeRequests,
                timestamp: Date.now()
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: {
                code: 'PIPELINE_METRICS_ERROR',
                message: error instanceof Error ? error.message : 'Failed to get pipeline metrics'
            }
        });
    }
});

export default router;
