/**
 * Router Choice Handler
 * 
 * Handles processing of user's choice from router form
 */

import {logger} from '../../../../utils/logger.js';
import {actionProcessor} from '../../../../actions/action-processor.js';
import {actionRegistry} from '../../../../actions/action-registry.js';
import type {ActionDefinition} from '../../../../actions/types.js';
import type {
    RequestContext,
    ProcessResult,
    ProcessOutcome,
} from '../request-processor.interfaces.js';
import {buildRouterForm, LLM_PIPELINE_ACTIONS, ROUTER_CONFIG, ACTION_TO_SCHEMA} from '../../../../config/router-static.js';
import {dialogRequestProcessor} from '../dialog-request-processor.js';

/**
 * Handle router choice submission - process user's choice from router form
 */
export async function handleRouterChoice(
    sessionId: string,
    _promiseId: string,
    ctx: Record<string, unknown>,
    request: RequestContext
): Promise<ProcessResult> {
    const choiceId = pickRouterSubmitChoice(ctx);
    const inner = ctx['context'] as Record<string, unknown> | undefined;
    const taskText =
        (typeof ctx['task'] === 'string' ? ctx['task'] : '') ||
        (inner && typeof inner['task'] === 'string' ? (inner['task'] as string) : '');

    logger.info('[RouterChoiceHandler] Processing router choice', {
        choice: choiceId,
        sessionId,
    });

    if (!choiceId) {
        logger.warn('[RouterChoiceHandler] Missing choice in router submission');
        return {
            outcome: 'failed' as ProcessOutcome,
            error: 'Missing choice'
        } as ProcessResult;
    }

    // LLM pipelines: run request transforms + LLM (same as direct dialog routing)
    if (LLM_PIPELINE_ACTIONS.includes(choiceId)) {
        logger.info('[RouterChoiceHandler] Delegating router choice to dialog pipeline', {choiceId});
        // CRITICAL FIX: Pre-apply router pipeline choice before delegating to dialog processor.
        // The dialog processor's normalizeContext also calls applyRouterPipelineChoice, but we ensure
        // the request context is properly seeded with the choice and transformSchema hint here.
        // This prevents the transform from re-emitting the router form.
        const patchedContext = {
            ...ctx,
            transformSchema: ACTION_TO_SCHEMA[choiceId] ?? choiceId,
            execution: { action: choiceId, step: 'start' },
            result: { ...(ctx['result'] as Record<string, unknown> ?? {}), choice: choiceId },
        };
        const patchedRequest: RequestContext = {
            ...request,
            context: patchedContext,
        };
        return dialogRequestProcessor.process(patchedRequest);
    }

    // Get action definition for scripted actions
    const actionDef = actionRegistry.getAction(choiceId);
    if (!actionDef) {
        logger.warn('[RouterChoiceHandler] Action not found for choice', { choiceId });
        return {
            outcome: 'failed' as ProcessOutcome,
            error: `Action not found: ${choiceId}`
        } as ProcessResult;
    }

    // Execute the selected scripted action directly
    try {
        // Process as a task request to start the action
        const actionResult = await actionProcessor.processTaskRequest(sessionId, taskText);

        if (actionResult.continue) {
            // Action is executing, return the execute command
            const resultContext = { ...(actionResult.context ?? {}) } as Record<string, unknown>;
            return {
                outcome: 'completed',
                context: resultContext,
                execute: actionResult.execute ?? {
                    form: {
                        title: 'Action Started',
                        description: actionResult.message || 'Action started',
                        input: [{ name: 'message', type: 'text', label: 'Message', required: true }],
                    },
                },
                activated_neuron_ids: actionResult.actionId ? [actionResult.actionId] : undefined,
            };
        } else {
            // Action completed immediately
            const resultContext = { ...(actionResult.context ?? {}) } as Record<string, unknown>;
            return {
                outcome: 'completed',
                context: resultContext,
                execute: actionResult.execute ?? {
                    form: {
                        title: 'Action Completed',
                        description: actionResult.message || 'Action completed',
                        input: [{ name: 'message', type: 'text', label: 'Message', required: true }],
                    },
                },
                activated_neuron_ids: actionResult.actionId ? [actionResult.actionId] : undefined,
            };
        }
    } catch (error) {
        logger.error('[RouterChoiceHandler] Error executing router choice', { error, choiceId });
        const errorContext: Record<string, unknown> = {};
        return {
            outcome: 'failed' as ProcessOutcome,
            context: errorContext,
            error: `Failed to execute action: ${error instanceof Error ? error.message : String(error)}`
        } as ProcessResult;
    }
}

/**
 * Extract router submit choice from context
 * Checks various places where choice might be stored in form submissions
 */
export function pickRouterSubmitChoice(ctx: Record<string, unknown>): string | undefined {
    // Check direct choice property
    if (ctx['choice'] && typeof ctx['choice'] === 'string') {
        return ctx['choice'];
    }

    // Check result.choice (common in form submissions)
    const result = ctx['result'];
    if (result && typeof result === 'object' && 'choice' in result && typeof (result as any)['choice'] === 'string') {
        return (result as any)['choice'];
    }

    // Check message.choice
    const message = ctx['message'];
    if (message && typeof message === 'object' && 'choice' in message && typeof (message as any)['choice'] === 'string') {
        return (message as any)['choice'];
    }

    // Check execute.choice
    const execute = ctx['execute'];
    if (execute && typeof execute === 'object' && 'choice' in execute && typeof (execute as any)['choice'] === 'string') {
        return (execute as any)['choice'];
    }

    // Check task as shorthand for choice (when form had choices)
    if (ctx['task'] && typeof ctx['task'] === 'string') {
        // This follows the same logic as in buildSubmitResult function
        // where task is interpreted as choice when there were choices in previous step
        return ctx['task'];
    }

    return undefined;
}
