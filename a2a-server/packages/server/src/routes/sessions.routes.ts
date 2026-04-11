import {Router, Request, Response, NextFunction} from 'express';
import {actionProcessor} from '../../../actions/src/action-processor.js';
import type {ActionProcessorResult} from '../../../actions/src/action-processor.js';
import {actionRegistry} from '../../../actions/src/action-registry.js';
import {logger} from '../../lib/logger.js';
import {stripServerInternalWorkbenchFromContext} from '../services/core/request/client-visible-context.js';

const router = Router({mergeParams: true});

/** Remaining sub-steps after the current step (legacy sessions API helper). */
function upcomingStepsForApi(
    actionId: string | undefined,
    currentStepId: string | undefined
): Array<{actionId: string; title: string}> {
    if (!actionId) return [];
    const def = actionRegistry.getAction(actionId);
    if (!def?.subActions?.length) return [];
    if (!currentStepId) {
        return def.subActions.slice(1).map(s => ({actionId: s.id, title: s.title}));
    }
    const idx = def.subActions.findIndex(s => s.id === currentStepId);
    if (idx < 0) return [];
    return def.subActions.slice(idx + 1).map(s => ({actionId: s.id, title: s.title}));
}

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

        const processorResult: ActionProcessorResult = await actionProcessor.processStepResult(
            sessionId,
            '',
            result
        );

        const safeContext =
            processorResult.context && typeof processorResult.context === 'object'
                ? stripServerInternalWorkbenchFromContext(processorResult.context as Record<string, unknown>)
                : undefined;

        if (!processorResult.continue) {
            res.json({
                success: true,
                data: {
                    completed: true,
                    message: processorResult.message,
                    ...(safeContext ? { context: safeContext } : {}),
                    ...(processorResult.execute ? { execute: processorResult.execute } : {}),
                }
            });
            return;
        }

        res.json({
            success: true,
            data: {
                completed: false,
                message: processorResult.message,
                ...(safeContext ? { context: safeContext } : {}),
                ...(processorResult.execute ? { execute: processorResult.execute } : {}),
                actionId: processorResult.actionId,
                currentStep: processorResult.currentStep,
                code: processorResult.code,
                nextSteps: upcomingStepsForApi(
                    processorResult.actionId,
                    processorResult.currentStep?.id
                ),
            }
        });
    } catch (error) {
        logger.error(`[Sessions API] Error processing ${req.params.sessionId}:`, error);
        next(error);
    }
});

export default router;


