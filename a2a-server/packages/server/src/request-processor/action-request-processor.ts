/**
 * Action Request Processor
 *
 * Handles action-based request processing including:
 * - step_result - processing results from executed steps
 * - task_request - proposing actions for new tasks
 * - approve_action - starting action execution after approval
 * - step_complete - confirming step completion
 */

import {logger} from '@a2a/server-utils/logger.js';
import {actionProcessor} from '../../../actions/src'/action-processor.js';
import {actionRegistry} from '../../../actions/src'/action-registry.js';
import type {ActionDefinition} from '../../../actions/src'/types.js';
import type {
    RequestContext,
    ProcessResult,
    ProcessOutcome,
} from './request-processor.interfaces.js';
import {BaseRequestProcessor, type RequestType} from './base-processor.js';
import {buildRouterForm, LLM_PIPELINE_ACTIONS, ROUTER_CONFIG, ACTION_TO_SCHEMA} from '../../../packages/config/router-static.js';
import {applySequenceStepComplete} from './sequence-workbench.js';
import {resolveExecution, resolveResultObject} from './normalization.js';
import {dialogRequestProcessor} from './dialog-request-processor.js';

// Import extracted handlers
import {
    handleStepResult as handleStepResultFn
} from './handlers/step-result-handler.js';
import {
    handleRouterChoice as handleRouterChoiceFn,
    pickRouterSubmitChoice as pickRouterSubmitChoiceFn
} from './handlers/router-choice-handler.js';
import {
    handleTaskRequest as handleTaskRequestFn,
    parseTaskText as parseTaskTextFn,
    analyzeTaskForAutoRouting as analyzeTaskForAutoRoutingFn
} from './handlers/task-request-handler.js';
import {
    handleStepComplete as handleStepCompleteFn
} from './handlers/step-complete-handler.js';
import {
    handleApproveAction as handleApproveActionFn
} from './handlers/approve-action-handler.js';

/**
 * Action request processor configuration
 */
export interface ActionProcessorConfig {
    maxRetries: number;
    enableStepTracking: boolean;
    retryDelay: number;
    timeout: number;
    enableValidation: boolean;
}

/**
 * Action Request Processor
 * Handles all action-related request processing
 */
export class ActionRequestProcessor extends BaseRequestProcessor {
    constructor(config: Partial<ActionProcessorConfig> = {}) {
        super('ActionRequestProcessor', config);
        this.config = {
            maxRetries: 3,
            retryDelay: 1000,
            timeout: 30000,
            enableValidation: true,
            enableStepTracking: true,
            ...config
        };
    }

    /**
     * Determine if this processor can handle the request
     */
    canProcess(request: RequestContext): boolean {
        const ctx = request.context;
        const actionType = this.getActionType(ctx);

        // Can handle action-specific types
        if (actionType === 'step_result' || actionType === 'task_request' || actionType === 'approve_action' || actionType === 'step_complete') {
            return true;
        }

        // Can handle step_result pattern (continue + step_result)
        if (ctx['continue'] && ctx['step_result']) {
            return true;
        }

        // Can handle undefined action type (treat as task_request)
        if (actionType === undefined) {
            return true;
        }

        return false;
    }

    /**
     * Get the request type this processor handles
     */
    getRequestType(): RequestType {
        return 'action';
    }

    /**
     * Main processing logic for action requests
     */
    protected async doProcess(request: RequestContext): Promise<ProcessResult> {
        const {promiseId, context, message} = request;
        const ctx = context;

        // Add message to context if provided
        if (message) {
            ctx['message'] = message;
        }

        const actionType = this.getActionType(ctx);
        // Client session ids are confidential and must not participate in server routing.
        // We correlate request execution strictly by promiseId.
        const sessionId = promiseId;

        logger.info('[ActionRequestProcessor] Processing request', {
            actionType,
            sessionId,
            promiseId
        });

        // Handle router choice (invoke also sets choice_id; result may be absent on some paths)
        const execForRouter = resolveExecution(ctx);
        const routerChoice = this.pickRouterSubmitChoice(ctx);
        const onRouterStep = execForRouter?.['step'] === 'router';
        if (onRouterStep && routerChoice) {
            logger.info('[ActionRequestProcessor] Router choice detected', {
                choice: routerChoice,
                execution: execForRouter,
            });
            return this.handleRouterChoice(sessionId, promiseId, ctx, request);
        }

        // Handle step_result
        if (this.isStepResult(ctx)) {
            return this.handleStepResult(sessionId, promiseId, ctx);
        }

        // Handle approve_action
        if (this.isApproveAction(ctx)) {
            return this.handleApproveAction(sessionId, promiseId, ctx);
        }

        // Handle step_complete
        if (this.isStepComplete(ctx)) {
            return this.handleStepComplete(sessionId, promiseId, ctx);
        }

        // Handle task_request (default)
        if (this.isTaskRequest(ctx)) {
            return this.handleTaskRequest(sessionId, promiseId, ctx);
        }

        // Handle direct LLM pipeline action (session seeded with mode:agent/mode:dialog without explicit action type)
        const execDirect = resolveExecution(ctx);
        const directAction = execDirect?.['action'] as string | undefined;
        if (directAction && LLM_PIPELINE_ACTIONS.includes(directAction)) {
            logger.info('[ActionRequestProcessor] Direct LLM pipeline action detected', {
                action: directAction,
                sessionId,
            });
            const patchedContext = {
                ...ctx,
                transformSchema: ACTION_TO_SCHEMA[directAction] ?? directAction,
                execution: { ...execDirect, action: directAction, step: execDirect?.['step'] ?? 'start' },
            };
            const patchedRequest: RequestContext = {
                ...request,
                context: patchedContext,
            };
            return dialogRequestProcessor.process(patchedRequest);
        }

        // Unknown action type
        logger.warn('[ActionRequestProcessor] Unknown action type', {actionType});
        return {
            outcome: 'failed' as ProcessOutcome,
            error: `Unknown action type: ${actionType}`
        } as ProcessResult;
    }

    /**
     * Handle step_result - client sends step result after executing code
     */
    private async handleStepResult(
        sessionId: string,
        _promiseId: string,
        ctx: Record<string, unknown>
    ): Promise<ProcessResult> {
        return handleStepResultFn(sessionId, _promiseId, ctx);
    }

    /**
     * Handle router choice submission - process user's choice from router form
     */
    private async handleRouterChoice(
        sessionId: string,
        _promiseId: string,
        ctx: Record<string, unknown>,
        request: RequestContext
    ): Promise<ProcessResult> {
        return handleRouterChoiceFn(sessionId, _promiseId, ctx, request);
    }

    /**
     * Handle task_request - client sends new task, propose actions
     */
    private async handleTaskRequest(
        sessionId: string,
        _promiseId: string,
        ctx: Record<string, unknown>
    ): Promise<ProcessResult> {
        return handleTaskRequestFn(sessionId, _promiseId, ctx);
    }

    /**
     * Parse task text from various context formats
     */
    protected parseTaskText(ctx: Record<string, unknown>): string {
        return parseTaskTextFn(ctx);
    }

    /**
     * Analyze task description to determine suitability for automatic router selection
     * @param taskDescription - The task text to analyze
     * @returns Analysis result with suitability score and preferred choice
     */
    private analyzeTaskForAutoRouting(taskDescription: string): {
        suitable: boolean;
        confidence: number;
        preferredChoice: string | null;
        reason: string;
    } {
        return analyzeTaskForAutoRoutingFn(taskDescription);
    }

    /**
     * Check if this is a step complete request
     */
    protected isStepComplete(ctx: Record<string, unknown>): boolean {
        return this.getActionType(ctx) === 'step_complete';
    }

    /**
     * Handle step_complete - client confirms step completion
     */
    private handleStepComplete(
        sessionId: string,
        _promiseId: string,
        ctx: Record<string, unknown>
    ): ProcessResult {
        return handleStepCompleteFn(sessionId, _promiseId, ctx);
    }

    /**
     * Handle approve_action - client confirms action execution
     */
    private async handleApproveAction(
        sessionId: string,
        _promiseId: string,
        ctx: Record<string, unknown>
    ): Promise<ProcessResult> {
        return handleApproveActionFn(sessionId, _promiseId, ctx);
    }

    /**
     * Extract router submit choice from context
     * Checks various places where choice might be stored in form submissions
     */
    private pickRouterSubmitChoice(ctx: Record<string, unknown>): string | undefined {
        return pickRouterSubmitChoiceFn(ctx);
    }
}

export const actionRequestProcessor = new ActionRequestProcessor();
