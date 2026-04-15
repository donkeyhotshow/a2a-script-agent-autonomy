/**
 * Step Complete Handler
 * 
 * Handles processing of step completion confirmations
 */

import {logger} from "@a2a/server-utils/logger";
import {applySequenceStepComplete} from '../sequence-workbench.js';
import type {
    RequestContext,
    ProcessResult,
    ProcessOutcome,
} from '../request-processor.interfaces';

/**
 * Handle step_complete - client confirms step completion
 */
export function handleStepComplete(
    sessionId: string,
    _promiseId: string,
    ctx: Record<string, unknown>
): ProcessResult {
    logger.info('[StepCompleteHandler] Processing step_complete', {
        stepId: ctx['stepId'],
        sessionId
    });

    const stepId = ctx['stepId'] as string;

    if (!stepId) {
        logger.warn('[StepCompleteHandler] Missing stepId in step_complete');
        return {
            outcome: 'failed' as ProcessOutcome,
            error: 'Missing stepId'
        } as ProcessResult;
    }

    const applied = applySequenceStepComplete(ctx, stepId);
    if (!applied.ok) {
        logger.warn('[StepCompleteHandler] step_complete failed', {error: applied.error, sessionId});
        return {
            outcome: 'failed' as ProcessOutcome,
            error: applied.error,
        } as ProcessResult;
    }

    logger.info('[StepCompleteHandler] Step completed (workbench sequence)', {
        sessionId,
        completedStepId: stepId,
    });

    const resultContext = { ...(applied.context as ProcessResult['context']) };
    // Include sessionId in context if it exists in input
    if (ctx['session_id']) {
        (resultContext as Record<string, unknown>)['session_id'] = ctx['session_id'];
    }
    
    return {
        outcome: 'completed',
        context: resultContext as ProcessResult['context'],
        execute: {
            message: `Step ${stepId} completed successfully.`,
        },
    };
}