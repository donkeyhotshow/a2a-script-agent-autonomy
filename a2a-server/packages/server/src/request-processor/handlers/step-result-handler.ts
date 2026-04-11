/**
 * Step Result Handler
 * 
 * Handles processing of step results from executed steps
 */

import {logger} from "@a2a/server-utils/logger"';
import {actionProcessor} from '../../../../actions/src/action-processor.ts';
import type {
    RequestContext,
    ProcessResult,
    ProcessOutcome,
} from '../request-processor.interfaces';
import {resolveExecution} from '../normalization';

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
        const fromMessage = result.execute;
        const resultContext = { ...(result.context ?? {}) } as Record<string, unknown>;
        return {
            outcome: 'completed',
            context: resultContext,
            activated_neuron_ids: result.actionId ? [result.actionId] : undefined,
            execute: fromMessage,
        };
    }
    const resultContext = { ...(result.context ?? {}) } as Record<string, unknown>;
    return {
        outcome: 'completed',
        context: resultContext,
        activated_neuron_ids: result.actionId ? [result.actionId] : undefined,
        execute: result.execute ?? {
            form: {
                title: 'Action Completed',
                description: result.message || 'Action completed',
                input: [{ name: 'message', type: 'text', label: 'Message', required: true }],
            },
        },
    };
}
