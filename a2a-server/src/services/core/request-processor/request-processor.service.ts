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
    // DIAGNOSTIC: Log all relevant context values
    const exec = context['execution'] as Record<string, unknown> | undefined;
    const result = context['result'] as Record<string, unknown> | undefined;
    const transformSchema = context['transformSchema'] as string | undefined;
    const action = (exec?.action ?? context['action']) as string | undefined;
    const task = context['task'] as string | undefined;
    const message = context['message'] as string | undefined;
    const hasMessage = result?.message ?? task ?? message;
    
    console.log('[DEBUG determineRequestType] Context values:', {
        action,
        'exec.action': exec?.action,
        'context.action': context['action'],
        transformSchema,
        hasMessage,
        resultKeys: result ? Object.keys(result) : [],
        task: task?.substring(0, 50),
        simulation: context['simulation'],
        replay: context['replay'],
        form_submission: context['form_submission'],
        form_data: context['form_data'],
        selected_choice: context['selected_choice'],
        choice_id: context['choice_id'],
        step_result: context['step_result'],
        continue: context['continue']
    });

    // Check for simulation requests first
    if (context['simulation'] || context['replay'] || context['simulation_name'] || context['simulation_step']) {
        console.log('[DEBUG determineRequestType] → SIMULATION (simulation context detected)');
        return 'simulation';
    }

    // Transform pipeline / LLM: transformSchema, action=dialog+message, or ai_action (auto-ai, coder, etc.)
    const llmActions = ['dialog', 'auto-ai', 'coder', 'analyze', 'task-decomposition'];
    console.log('[DEBUG determineRequestType] Dialog check:', {
        hasTransformSchema: !!transformSchema,
        hasAction: !!action,
        actionInLlmActions: action ? llmActions.includes(action) : false,
        hasMessage: !!hasMessage
    });
    if (transformSchema || (action && hasMessage && llmActions.includes(action))) {
        console.log('[DEBUG determineRequestType] → DIALOG (matched)');
        return 'dialog';
    }

    // Check for form requests
    console.log('[DEBUG determineRequestType] Form check:', {
        form_submission: !!context['form_submission'],
        form_data: !!context['form_data'],
        form_id: !!context['form_id'],
        selected_choice: !!context['selected_choice'],
        choice_id: !!context['choice_id']
    });
    if (context['form_submission'] || context['form_data'] || context['form_id'] ||
        context['selected_choice'] || context['choice_id']) {
        console.log('[DEBUG determineRequestType] → FORM (matched)');
        return 'form';
    }


    // Check for action requests
    const actionType = (context['action'] ?? exec?.action) as string | undefined;
    console.log('[DEBUG determineRequestType] Action check:', {
        actionType,
        isStepResult: actionType === 'step_result',
        isApproveAction: actionType === 'approve_action',
        isTaskRequest: actionType === 'task_request',
        hasContinueAndStepResult: !!(context['continue'] && context['step_result'])
    });
    if (actionType === 'step_result' || actionType === 'approve_action' ||
        actionType === 'task_request' ||
        (context['continue'] && context['step_result'])) {
        console.log('[DEBUG determineRequestType] → ACTION (matched)');
        return 'action';
    }

    // Default to action processing for simulations
    console.log('[DEBUG determineRequestType] → ACTION (default)');
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
        requestType
    });

    const processor = processorRegistry.get(requestType);

    console.log('[DEBUG routeRequest] Processor selection:', {
        requestType,
        processorName: processor?.constructor.name ?? 'undefined',
        hasProcessor: !!processor
    });

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
    console.log('[RequestProcessor] Processing request', { promiseId, action: context?.action, resultKeys: context?.result ? Object.keys(context.result as object) : [] });

    try {
        const requestContext: RequestContext = {
            promiseId,
            context: context as Record<string, unknown>,
            codeBlocks,
            message
        };

        const result = await routeRequest(requestContext);

        // Handle AI-Actions continuation (form choice -> LLM processing)
        if (result.outcome === 'ai_action_ready' && result.aiActions?.action) {
            logger.info('[RequestProcessor] AI-Action ready, creating LLM follow-up request', {
                promiseId,
                action: result.aiActions.action
            });

            // Create new request for neuron processor with LLM
            const followUpRequest = await requestService.create({
                clientId: promiseId, // Link to original
                context: {
                    ...context,
                    action: result.aiActions.action,
                    ai_action: true,
                    previousChoice: result.selection,
                    task: message ?? context?.task ?? result.aiActions.action,
                },
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
    }
}

/**
 * Recover processing requests that have llmPromiseId (e.g. after server restart during polling)
 */
async function recoverProcessingRequests(): Promise<void> {
    const base = (process.env.AI_HUB_URL || 'http://localhost:11435').replace(/\/$/, '');
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
            } catch {
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
