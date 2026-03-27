/**
 * Request Processor Service
 *
 * Main entry point for request processing. Acts as a router/factory
 * that delegates to specialized processors based on request type.
 *
 * IMPORTANT: Server does NOT store client data!
 * Graph is passed in context and returned in response.
 * ContextManager is reset per request (resetContextManager) — no cache of context/code between iterations.
 */

import {requestService, isRetryableError} from '../request/request.service.js';
import {logger} from '../../../utils/logger.js';
import type {RequestContext, ProcessResult, ProcessOutcome, Task, TaskAnalysis} from './request-processor.interfaces.js';
import {
    actionRequestProcessor,
    simulationRequestProcessor,
    formRequestProcessor,
    dialogRequestProcessor,
    processorRegistry,
    recoverDialogFromLlmPromise,
} from './index.js';
import type {RequestType} from './request-processor.interfaces.js';
import { LLM_PIPELINE_ACTIONS, type LlmPipelineAction } from '../../../config/router-static.js';

export { LLM_PIPELINE_ACTIONS, type LlmPipelineAction };

const DEFAULT_INTERVAL_MS = 5000;
let timerId: ReturnType<typeof setInterval> | null = null;

// Register processors
processorRegistry.register('action', actionRequestProcessor);
processorRegistry.register('simulation', simulationRequestProcessor);
processorRegistry.register('form', formRequestProcessor);
processorRegistry.register('dialog', dialogRequestProcessor);

/**
 * Determine the request type based on context
 */
function determineRequestType(context: Record<string, unknown>): RequestType {
    const exec = context['execution'] as Record<string, unknown> | undefined;
    const result = context['result'] as Record<string, unknown> | undefined;
    const transformSchema = context['transformSchema'] as string | undefined;
    const action = (exec?.action ?? context['action']) as string | undefined;
    const task = context['task'] as string | undefined;
    const message = context['message'] as string | undefined;
    const hasMessage = Boolean(result?.message ?? task ?? message);
    const llmChoice =
        typeof result?.choice === 'string' && LLM_PIPELINE_ACTIONS.includes(result.choice as LlmPipelineAction)
            ? result.choice
            : undefined;

    // Check for simulation requests first
    if (context['simulation'] || context['replay'] || context['simulation_name'] || context['simulation_step']) {
        return 'simulation';
    }

    // Transform pipeline / LLM: transformSchema, or execution.action in LLM modes + (message/task or router choice)
    const llmActions = [...LLM_PIPELINE_ACTIONS] as string[];
    if (
        transformSchema ||
        (action && llmActions.includes(action) && (hasMessage || llmChoice !== undefined))
    ) {
        return 'dialog';
    }

    // Check for form requests
    if (context['form_submission'] || context['form_data'] || context['form_id'] ||
        context['selected_choice'] || context['choice_id']) {
        return 'form';
    }


    // Check for action requests
    const actionType = (context['action'] ?? exec?.action) as string | undefined;
    if (actionType === 'step_result' || actionType === 'approve_action' ||
        actionType === 'task_request' ||
        (context['continue'] && context['step_result'])) {
        return 'action';
    }

    // Default to action processing for simulations
    return 'action';
}

/**
 * Route request to appropriate processor
 */
async function routeRequest(request: RequestContext): Promise<ProcessResult> {
    const {promiseId, context} = request;
    const requestType = determineRequestType(context);

    logger.info('[RequestProcessor] Routing request', {
        promiseId,
        requestType,
        resultChoice: (context['result'] as Record<string, unknown> | undefined)?.choice,
        executionAction: (context['execution'] as Record<string, unknown> | undefined)?.action,
    });

    const processor = processorRegistry.get(requestType);

    if (!processor) {
        logger.error('[RequestProcessor] No processor found for type', {requestType});
        return {
            outcome: 'failed',
            error: `No processor available for request type: ${requestType}`
        } as ProcessResult;
    }

    return processor.process(request);
}

/**
 * Process a single request
 */
export async function processOneRequest(): Promise<ProcessResult | null> {
    const request = await requestService.getNextPending();
    if (!request) return null;

    const {promiseId, context, codeBlocks, message} = request;

    try {
        const requestContext: RequestContext = {
            promiseId,
            context,
            codeBlocks,
            message
        };

        const result = await routeRequest(requestContext);

        // Handle AI-Actions continuation (form choice -> LLM processing)
        if (result.outcome === 'ai_action_ready' && result.aiActions?.action) {
            if (context['ai_action'] === true) {
                logger.warn('[RequestProcessor] Prevented recursive AI-action follow-up loop', {
                    promiseId,
                    action: result.aiActions.action,
                });
                await requestService.updateStatus(
                    promiseId,
                    'failed',
                    {
                        outcome: 'failed',
                        error: 'Recursive ai_action_ready detected for follow-up request',
                    }
                );
                return {
                    ...result,
                    outcome: 'failed',
                    error: 'Recursive ai_action_ready detected for follow-up request',
                };
            }
            logger.info('[RequestProcessor] AI-Action ready, creating LLM follow-up request', {
                promiseId,
                action: result.aiActions.action
            });

            // Create new request for neuron processor with LLM
            const followUpContext: Record<string, unknown> = {
                ...context,
                action: result.aiActions.action,
                ai_action: true,
                previousChoice: result.selection,
                task: message ?? (context['task'] as string | undefined) ?? result.aiActions.action,
            };
            // Prevent form re-entry loop: follow-up LLM request must not carry stale choice/form payload.
            delete followUpContext['result'];
            delete followUpContext['choice_id'];
            delete followUpContext['selected_choice'];
            delete followUpContext['form_id'];
            delete followUpContext['form_data'];
            delete followUpContext['form_submission'];

            const followUpExecution = (followUpContext['execution'] as Record<string, unknown> | undefined) ?? {};
            followUpContext['execution'] = {
                ...followUpExecution,
                action: result.aiActions.action,
                step: 'start',
            };

            const followUpRequest = await requestService.create({
                clientId: promiseId, // Link to original
                context: followUpContext,
                message: message ?? `AI-Action: ${result.aiActions.action}`,
            });

            logger.info('[RequestProcessor] Created LLM follow-up request', {
                originalPromiseId: promiseId,
                followUpPromiseId: followUpRequest.promiseId,
                action: result.aiActions.action
            });

            // Complete current request with reference to follow-up
            await requestService.updateStatus(
                promiseId,
                'completed',
                {
                    ...result,
                    followUpRequestId: followUpRequest.promiseId,
                    note: 'AI-Action routed to LLM processing'
                }
            );

            return result;
        }

        // Update request status based on result
        if (result.outcome === 'failed') {
            const err = String(result.error ?? '');
            if (isRetryableError(err)) {
                const ok = await requestService.scheduleRetry(promiseId);
                if (ok) {
                    logger.info('[RequestProcessor] Scheduled retry for transient error', {promiseId});
                    return result;
                }
            }
        }
        await requestService.updateStatus(
            promiseId,
            result.outcome === 'failed' ? 'failed' : 'completed',
            result
        );
        return result;

    } catch (err) {
        const errStr = String(err);
        logger.error('[RequestProcessor] Error', {promiseId, error: errStr});
        if (isRetryableError(errStr)) {
            const ok = await requestService.scheduleRetry(promiseId);
            if (ok) {
                logger.info('[RequestProcessor] Scheduled retry for caught error', {promiseId});
                return {outcome: 'failed' as ProcessOutcome};
            }
        }
        await requestService.updateStatus(promiseId, 'failed', undefined, {
            code: 'PROCESS_ERROR',
            message: errStr,
        });
        return {outcome: 'failed' as ProcessOutcome};
    }
}

/**
 * Timer tick for background processing
 */
async function tick(): Promise<void> {
    const result = await processOneRequest();
    if (result?.outcome === 'failed') {
        logger.warn('[RequestProcessor] Request failed, continuing...');
    }
    // When idle, revive retryable failed requests (e.g. after ai-integration starts)
    if (!result) {
        await requestService.scheduleRetryForFailed();
        await requestService.reviveFailedAfterCooldown();
    }
}

/**
 * Recover processing requests that have llmPromiseId (e.g. after server restart during polling)
 */
async function recoverProcessingRequests(): Promise<void> {
    const base = (process.env.AI_HUB_URL || 'http://localhost:11434').replace(/\/$/, '');
    const ids = await requestService.listProcessing();
    for (const promiseId of ids) {
        const req = await requestService.getResult(promiseId);
        if (!req) continue;
        let llmPromiseId = (req.context as Record<string, unknown>)?.llmPromiseId as string | undefined;
        if (!llmPromiseId) {
            try {
                const lookupRes = await fetch(`${base}/promise/by-server-request/${encodeURIComponent(promiseId)}`);
                if (lookupRes.ok) {
                    const data = (await lookupRes.json()) as {promiseId?: string};
                    llmPromiseId = data?.promiseId;
                }
            } catch (err) {
                logger.error('Failed to fetch session during recovery:', err);
                continue;
            }
        }
        if (!llmPromiseId) continue;
        const result = await recoverDialogFromLlmPromise(promiseId, req.context, llmPromiseId);
        if (result) {
            if (result.outcome === 'failed') {
                const errMsg = (result as ProcessResult & {error?: string}).error ?? 'Recovery failed';
                await requestService.updateStatus(promiseId, 'failed', undefined, { message: errMsg });
            } else {
                await requestService.updateStatus(promiseId, 'completed', result as unknown as Record<string, unknown>);
            }
            logger.info('[RequestProcessor] Recovered stuck request', {promiseId, outcome: result.outcome});
        }
    }
}

/**
 * Start the request processor
 */
export function startRequestProcessor(intervalMs: number = DEFAULT_INTERVAL_MS): void {
    if (timerId) return;
    logger.info('[RequestProcessor] Started', {intervalMs});
    recoverProcessingRequests().catch((err) => logger.error('[RequestProcessor] Recovery failed', {error: String(err)}));
    timerId = setInterval(() => {
        tick().catch((err) => {
            logger.error('[RequestProcessor] Tick error', {error: String(err)});
        });
    }, intervalMs);
}

/**
 * Stop the request processor
 */
export function stopRequestProcessor(): void {
    if (timerId) {
        clearInterval(timerId);
        timerId = null;
        logger.info('[RequestProcessor] Stopped');
    }
}

// Re-export types for compatibility
export type {ProcessResult, ProcessOutcome, Task, TaskAnalysis};
