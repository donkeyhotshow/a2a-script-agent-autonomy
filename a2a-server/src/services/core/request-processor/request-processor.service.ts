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

import {requestService} from '../request/request.service.js';
import {logger} from '../../../utils/logger.js';
import type {RequestContext, ProcessResult, ProcessOutcome, Task, TaskAnalysis} from './request-processor.interfaces.js';
import {
    actionRequestProcessor,
    simulationRequestProcessor,
    formRequestProcessor,
    neuronRequestProcessor,
    processorRegistry
} from './index.js';
import type {RequestType} from './request-processor.interfaces.js';
import {trackRequestComplete, trackRequestError} from '../../utils/pipeline-observability.service.js';

const DEFAULT_INTERVAL_MS = 5000;
let timerId: ReturnType<typeof setInterval> | null = null;

// Register processors
processorRegistry.register('action', actionRequestProcessor);
processorRegistry.register('simulation', simulationRequestProcessor);
processorRegistry.register('form', formRequestProcessor);
processorRegistry.register('neuron', neuronRequestProcessor);

/**
 * Determine the request type based on context
 */
function determineRequestType(context: Record<string, unknown>): RequestType {
    // Check for simulation requests first
    if (context['simulation'] || context['replay'] || context['simulation_name'] || context['simulation_step']) {
        return 'simulation';
    }

    // Check for form requests
    if (context['form_submission'] || context['form_data'] || context['form_id'] ||
        context['selected_choice'] || context['choice_id']) {
        return 'form';
    }

    // Check for action requests
    const actionType = context['action'] as string | undefined;
    if (actionType === 'step_result' || actionType === 'approve_action' ||
        actionType === 'task_request' ||
        (context['continue'] && context['step_result'])) {
        return 'action';
    }

    // Default to neuron processing
    return 'neuron';
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
            context: context as Record<string, unknown>,
            codeBlocks,
            message
        };

        const result = await routeRequest(requestContext);

        // Update request status based on result
        await requestService.updateStatus(
            promiseId,
            result.outcome === 'failed' ? 'failed' : 'completed',
            result
        );
        
        // Track request completion for observability
        trackRequestComplete(promiseId, result.outcome !== 'failed');

        return result;

    } catch (err) {
        logger.error('[RequestProcessor] Error', {promiseId, error: String(err)});
        await requestService.updateStatus(promiseId, 'failed', undefined, {
            code: 'PROCESS_ERROR',
            message: String(err),
        });
        // Track request error for observability
        trackRequestError(promiseId, 'PROCESS_ERROR');
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
}

/**
 * Start the request processor
 */
export function startRequestProcessor(intervalMs: number = DEFAULT_INTERVAL_MS): void {
    if (timerId) return;
    logger.info('[RequestProcessor] Started', {intervalMs});
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
