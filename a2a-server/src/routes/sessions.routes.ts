import {Router, Request, Response, NextFunction} from 'express';
import {actionProcessor} from '../actions/action-processor.js';
import type {ActionProcessorResult} from '../actions/action-processor.js';
import {logger} from '../utils/logger.js';

const router = Router({mergeParams: true});

/**
 * POST /api/a2a/sessions/:sessionId/next
 * Process next step result for session
 */
router.post('/:sessionId/next', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const sessionId = String(req.params.sessionId || '');
        if (!sessionId) {
            res.status(400).json({error: 'Session ID required'});
            return;
        }

        const result = req.body.result;
        if (!result) {
            res.status(400).json({error: 'Result required'});
            return;
        }

        logger.info(`[Sessions API] Processing step result for session: ${sessionId}`, {resultKeys: Object.keys(result)});

        // Use existing action processor
        const processorResult: ActionProcessorResult = await actionProcessor.processStepResult(sessionId, result);

        if (!processorResult.continue) {
            res.json({
                success: true,
                data: {
                    completed: true,
                    message: processorResult.message,
                }
            });
            return;
        }

        res.json({
            success: true,
            data: {
                completed: false,
                message: processorResult.message,
                actionId: processorResult.actionId,
                currentStep: processorResult.currentStep,
                code: processorResult.code,
                nextSteps: processorResult.message.nextSteps,
            }
        });
    } catch (error) {
        logger.error(`[Sessions API] Error processing ${req.params.sessionId}:`, error);
        next(error);
    }
});

export default router;

