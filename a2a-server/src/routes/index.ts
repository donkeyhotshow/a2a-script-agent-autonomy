import {Router, Request, Response, NextFunction} from 'express';
import {invoke} from '../services/utils/invoke.service.js';
import requestsRouter from './requests.routes.js';

const router = Router();

// Mount requests API (status, result, batch status)
router.use('/requests', requestsRouter);

/**
 * Main invoke endpoint - all processing happens here
 */
router.post('/invoke', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const body = req.body as {
            task?: string;
            context?: unknown;
            message?: string;
            code_blocks?: unknown;
            result?: unknown;
            action?: string;
            selectedAction?: { actionId: string };
            stepId?: string;
            stepResult?: unknown;
            sync?: boolean;
        };
        
        const clientId = 'anonymous';
        const resultKeys = body.result && typeof body.result === 'object' ? Object.keys(body.result) : [];
        console.log('[a2a-server] /invoke received', { resultKeys, task: body.task?.slice(0, 50) });
        
        const invokeResult = await invoke(clientId, {
            task: body.task,
            context: body.context,
            message: body.message,
            code_blocks: body.code_blocks as { path: string; content?: string }[] | undefined,
            action: body.action,
            selectedAction: body.selectedAction,
            stepId: body.stepId,
            stepResult: body.stepResult,
            result: body.result,
            sync: body.sync,
        });

        // Synchronous response
        if (invokeResult.sync || body.sync) {
            res.json({
                success: true,
                data: {
                    sync: true,
                    execute: invokeResult.execute,
                    message: invokeResult.message,
                    context: invokeResult.context,
                }
            });
            return;
        }

        // Async response with promiseId
        console.log('[a2a-server] /invoke returning promiseId', { promiseId: invokeResult.promiseId });
        res.json({
            success: true,
            data: {
                promiseId: invokeResult.promiseId,
                status: 'pending',
                pollUrl: `/requests/${invokeResult.promiseId}`,
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Health check - minimal
 */
router.get('/health', (_req: Request, res: Response): void => {
    res.json({status: 'ok', mode: 'stateless'});
});

export default router;
