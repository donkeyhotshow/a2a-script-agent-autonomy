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
import type {RequestContext, ProcessResult, ProcessOutcome} from '../request-processor.interfaces.js';
import {BaseRequestProcessor, type RequestType} from './base-processor.js';
import {buildRouterForm} from '../../../config/router-static.js';

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
        _promiseId: string,
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
        _promiseId: string,
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
        _sessionId: string,
        _promiseId: string,
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

        // Use keyword-based routing - skip LLM transform
        // Find matching actions based on task keywords
        const keywordMatches = actionRegistry.findAction(taskText);
        const candidates = keywordMatches.filter(m => m.matchScore >= 0.3);
        const actionsToUse: ActionDefinition[] = candidates.map(m => m.action);

        // Build choices from keyword matches
        let rankedChoices: Array<{id: string, label: string, description: string}> = [];
        
        if (actionsToUse.length > 0) {
            // Use keyword-matched actions as choices, sorted by score
            rankedChoices = actionsToUse.map(action => ({
                id: action.id,
                label: action.title || action.id,
                description: action.description || ''
            }));
            logger.info('[ActionRequestProcessor] Found keyword-matched actions', {
                count: rankedChoices.length,
                actionIds: rankedChoices.map(c => c.id)
            });
        } else {
            // No keyword matches - use default fallback choices
            logger.info('[ActionRequestProcessor] No keyword matches, using default choices');
            rankedChoices = [
                { id: 'dialog', label: 'AI діалог з користувачем', description: 'Вільний текстовий діалог з моделлю без інструментів коду.' },
                { id: 'agent', label: 'Agent (універсальний режим)', description: 'Агент з інструментами: пошук по коду, файли, команди.' },
                { id: 'task-decomposition', label: 'Декомпозиція задачі', description: 'Розбиття задачі на підзадачі та план виконання.' }
            ];
        }
        
        return {
            outcome: 'completed',
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
}
export const actionRequestProcessor = new ActionRequestProcessor();
