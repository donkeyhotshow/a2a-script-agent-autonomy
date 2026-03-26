/**
 * Action Request Processor
 *
 * Handles action-based request processing including:
 * - step_result - processing results from executed steps
 * - task_request - proposing actions for new tasks
 * - approve_action - starting action execution after approval
 */

import {logger} from '../../../utils/logger.js';
import {actionProcessor} from '../../../actions/action-processor.js';
import {actionRegistry} from '../../../actions/action-registry.js';
import type {ActionDefinition} from '../../../actions/types.js';
import {dialogRequestProcessor} from './dialog-request-processor.js';
import type {RequestContext, ProcessResult, ProcessOutcome} from '../request-processor.interfaces.js';
import {BaseRequestProcessor, type RequestType} from './base-processor.js';
import {buildRouterForm} from '../../../config/router-static.js';
import {
    shouldEnforceTransformStrictMode,
    validateRouterResultShape,
} from './validators/transform-execute-validator.js';

/**
 * Action request processor configuration
 */
export interface ActionProcessorConfig {
    maxRetries: number;
    enableStepTracking: boolean;
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
        if (actionType === 'step_result' || actionType === 'task_request' || actionType === 'approve_action') {
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
        const sessionId = ctx['session_id'] as string || promiseId;

        logger.info('[ActionRequestProcessor] Processing request', {
            actionType,
            sessionId,
            promiseId
        });

        // Handle step_result
        if (this.isStepResult(ctx)) {
            return this.handleStepResult(sessionId, promiseId, ctx);
        }

        // Handle approve_action
        if (this.isApproveAction(ctx)) {
            return this.handleApproveAction(sessionId, promiseId, ctx);
        }

        // Handle task_request (default)
        if (this.isTaskRequest(ctx)) {
            return this.handleTaskRequest(sessionId, promiseId, ctx);
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
        promiseId: string,
        ctx: Record<string, unknown>
    ): Promise<ProcessResult> {
        const stepId = ctx['stepId'] as string || ctx['step_id'] as string;
        const stepResult = ctx['stepResult'] || ctx['step_result'];

        logger.info('[ActionRequestProcessor] Processing step_result', {stepId, sessionId});

        if (!stepId || !stepResult) {
            logger.warn('[ActionRequestProcessor] Missing stepId or stepResult', {stepId, stepResult});
        }

        const result = await actionProcessor.processStepResult(sessionId, stepId, stepResult);

        if (result.continue) {
            const fromMessage = result.message.execute;
            return {
                outcome: 'completed',
                context: result.message.context,
                activated_neuron_ids: result.actionId ? [result.actionId] : undefined,
                execute: fromMessage,
            };
        }
        return {
            outcome: 'completed',
            context: result.message.context,
            activated_neuron_ids: result.actionId ? [result.actionId] : undefined,
            execute: result.message.execute ?? {
                message: result.message.message || 'Action completed',
            },
        };
    }

    /**
     * Handle approve_action - client approved selected action, start execution
     */
    private async handleApproveAction(
        sessionId: string,
        promiseId: string,
        ctx: Record<string, unknown>
    ): Promise<ProcessResult> {
        logger.info('[ActionRequestProcessor] Processing approve_action', {
            selectedAction: ctx['selectedAction'],
        });

        const selectedAction = ctx['selectedAction'] as { actionId: string } | undefined;

        if (!selectedAction?.actionId) {
            logger.warn('[ActionRequestProcessor] Missing selectedAction.actionId');
        }

        // Start action execution
        const actionResult = await actionProcessor.approveAction(sessionId, selectedAction?.actionId || '');

        const fromMessage = actionResult.message.execute;
        return {
            outcome: 'completed',
            context: actionResult.message.context,
            activated_neuron_ids: actionResult.actionId ? [actionResult.actionId] : undefined,
            execute: fromMessage,
        };
    }

    /**
     * Handle task_request - client sends new task, propose actions
     */
    private async handleTaskRequest(
        sessionId: string,
        promiseId: string,
        ctx: Record<string, unknown>
    ): Promise<ProcessResult> {
        const taskText = this.parseTaskText(ctx);

        if (!taskText) {
            logger.warn('[ActionRequestProcessor] No task text found in request');
            return {
                outcome: 'failed',
                error: 'No task text found in request'
            } as ProcessResult;
        }

        logger.info('[ActionRequestProcessor] Processing task_request', {
            taskText: taskText.substring(0, 50)
        });

        // Use transform schema for routing - all requests go through router transform
        // 1. candidates = actionRegistry.findActions(task) - collect for transform context
        const keywordMatches = actionRegistry.findAction(taskText);
        const candidates = keywordMatches.filter(m => m.matchScore >= 0.3);
        const actionsToUse: ActionDefinition[] = candidates.map(m => m.action);

        // 2. ctx.availableActions = actionsToUse // inject into context for transform
        //    run DialogRequestProcessor with transformSchema = 'router'
        const enrichedCtx = {
            ...ctx,
            availableActions: actionsToUse.map(action => ({
                id: action.id,
                title: action.title,
                description: action.description
            }))
        };

        try {
            // Run the router transform pipeline via DialogRequestProcessor
            const routerRequestContext = {
                ...enrichedCtx,
                transformSchema: 'router' // This will trigger the router transform
            };
            
            const routerRequest = {
                context: routerRequestContext,
                codeBlocks: [],
                promiseId: promiseId + '-router' // Generate a unique promiseId for the router step
            };
            
            // Process the router request through the dialog/request processor (which handles transforms)
            const routerResult = await dialogRequestProcessor.process(routerRequest);
            const routerIssues = validateRouterResultShape(routerResult);
            if (routerIssues.length > 0) {
                if (shouldEnforceTransformStrictMode()) {
                    const codes = routerIssues.map((i) => i.code).join(', ');
                    throw new Error(`Router transform contract violation: ${codes}`);
                }
                logger.warn('[ActionRequestProcessor] Router transform validation warnings', {
                    issues: routerIssues.map((i) => i.code),
                });
            }
            
            if (routerResult.outcome === 'completed' && routerResult.execute?.form?.choices) {
                // Extract the ranked choices from the router result
                const rankedChoices = routerResult.execute.form.choices;
                logger.info('[ActionRequestProcessor] Router transform completed, returning ranked choices', {
                    rankedChoiceCount: rankedChoices.length
                });
                return {
                    outcome: 'action_proposal',
                    context: {
                        execution: {
                            action: 'task',
                            step: 'router'
                        },
                        task: taskText
                    },
                    execute: {
                        form: buildRouterForm(rankedChoices)
                    }
                };
            }
            
            // Router transform failed - throw error, no fallback
            logger.error('[ActionRequestProcessor] Router transform failed', {
                outcome: routerResult.outcome,
                hasFormChoices: !!routerResult.execute?.form?.choices
            });
            throw new Error(`Router transform failed: outcome=${routerResult.outcome}`);
        } catch (error) {
            logger.error('[ActionRequestProcessor] Router transform threw error', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
}
export const actionRequestProcessor = new ActionRequestProcessor();
