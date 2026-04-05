/**
 * Step Result Handler
 * 
 * Handles processing of step results from executed steps
 */

import {logger} from '../../../../utils/logger.js';
import {actionProcessor} from '../../../../actions/action-processor.js';
import type {
    RequestContext,
    ProcessResult,
    ProcessOutcome,
} from '../request-processor.interfaces.js';
import {resolveExecution} from './normalization.js';

/**
 * Handle step_result - client sends step result after executing code
 */
export async function handleStepResult(
    sessionId: string,
    _promiseId: string,
    ctx: Record<string, unknown>
): Promise<ProcessResult> {
    const stepId = ctx['stepId'] as string || ctx['step_id'] as string;
    const stepResult = ctx['stepResult'] || ctx['step_result'];

    logger.info('[StepResultHandler] Processing step_result', {stepId, sessionId});

    if (!stepId || !stepResult) {
        logger.warn('[StepResultHandler] Missing stepId or stepResult', {stepId, stepResult});
    }

    const result = await actionProcessor.processStepResult(sessionId, stepId, stepResult);

    if (result.continue) {
        const fromMessage = result.message.execute;
        const resultContext = { ...result.message.context };
        // Include sessionId in context if it exists in input
        const sessionIdValue = ctx['session_id'];
        if (sessionIdValue && typeof sessionIdValue === 'string') {
            (resultContext as Record<string, unknown>)['session_id'] = sessionIdValue;
        }
        return {
            outcome: 'completed',
            context: resultContext,
            activated_neuron_ids: result.actionId ? [result.actionId] : undefined,
            execute: fromMessage,
        };
    }
    const resultContext = { ...result.message.context };
    const sessionIdValue = ctx['session_id'];
    if (sessionIdValue && typeof sessionIdValue === 'string') {
        (resultContext as Record<string, unknown>)['session_id'] = sessionIdValue;
    }
    return {
        outcome: 'completed',
        context: resultContext,
        activated_neuron_ids: result.actionId ? [result.actionId] : undefined,
        execute: result.message.execute ?? {
            message: result.message.message || 'Action completed',
        },
    };
}