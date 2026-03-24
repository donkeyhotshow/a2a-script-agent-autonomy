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
import {dialogRequestProcessor} from './dialog-request-processor.js';
import type {
    RequestContext,
    ProcessResult,
    ProcessOutcome,
    ExecuteCommand
} from '../request-processor.interfaces.js';
import {BaseRequestProcessor, type RequestType} from './base-processor.js';

/**
 * Router tail: LLM pipeline modes + common scripted action when registry is empty.
 * Registry-backed actions are prepended when loaded; these stay as fallback (see ISSUE 01).
 */
const ROUTER_CHOICES = [
    {id: 'dialog', label: 'AI діалог з користувачем'},
    {id: 'auto-ai', label: 'AI Action Generator'},
    {id: 'auto-ai-v2', label: 'Auto-AI v2 (context golden)'},
    {id: 'task-decomposition', label: 'Декомпозиція задачі'},
    {id: 'coder', label: 'Робота з кодом (Coder)'},
    {id: 'coder-smart', label: 'Coder smart'},
    {id: 'coder-smart-v2', label: 'Coder smart v2'},
    {id: 'analyze', label: 'Аналіз коду'},
    {id: 'fix-vue-imports', label: 'Виправлення Vue imports'},
    {id: 'fix-laravel-namespaces-and-uses', label: 'Laravel: namespace та use'},
] as const;

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
            const currentStep = result.currentStep;
            return {
                outcome: 'completed',
                context: result.message.context,
                activated_neuron_ids: result.actionId ? [result.actionId] : undefined,
                action: result.message.action,
                execute: currentStep?.code ? {
                    script: {
                        input: {},
                        output: 'step_result',
                        code: currentStep.code
                    }
                } : undefined,
            };
        } else {
            return {
                outcome: 'completed',
                context: result.message.context,
                activated_neuron_ids: result.actionId ? [result.actionId] : undefined,
                action: result.message.action,
                execute: {
                    message: result.message.message || 'Action completed'
                },
            };
        }
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

        const currentStep = actionResult.currentStep;
        return {
            outcome: 'completed',
            context: actionResult.message.context,
            activated_neuron_ids: actionResult.actionId ? [actionResult.actionId] : undefined,
            action: actionResult.message.action,
            execute: currentStep?.code ? {
                script: {
                    input: {},
                    output: 'step_result',
                    code: currentStep.code
                }
            } : undefined,
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

        // 1. keywordMatches = actionRegistry.findActions(task)  // existing
        const keywordMatches = actionRegistry.findAction(taskText);

        // 2. if keywordMatches[0].matchScore >= 0.8:
        //      return proposal with that action + ROUTER_CHOICES tail  // existing fast path
        if (keywordMatches[0]?.matchScore >= 0.8) {
            const action = keywordMatches[0].action;
            logger.info('[ActionRequestProcessor] High confidence match, fast path', {
                actionId: action.id,
                matchScore: keywordMatches[0].matchScore
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
                    form: {
                        title: 'Оберіть спосіб виконання',
                        choices: [
                            {id: action.id, label: action.title},
                            ...ROUTER_CHOICES
                        ]
                    }
                }
            };
        }

        // 3. candidates = keywordMatches (score >= 0.3) || getAllActions() if empty
        //    if candidates.length === 0:
        //      return static ROUTER_CHOICES  // no registry, skip LLM
        const candidates = keywordMatches.filter(m => m.matchScore >= 0.3);
        let actionsToUse: ActionDefinition[] = [];
        
        if (candidates.length > 0) {
            actionsToUse = candidates.map(m => m.action);
        } else {
            actionsToUse = actionRegistry.getAllActions();
        }
        
        if (actionsToUse.length === 0) {
            logger.info('[ActionRequestProcessor] No actions in registry, returning static choices');
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
                    form: {
                        title: 'Оберіть спосіб виконання',
                        choices: [...ROUTER_CHOICES],
                    }
                }
            } as ProcessResult;
        }

        // 4. ctx.availableActions = candidates.map(m => m.action)  // inject into context
        //    run DialogRequestProcessor with schema = "router"
        //    parse LLM response → rankedIds: string[]
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
                promiseId: promiseId + '-router' // Generate a unique promiseId for the router step
            };
            
            // Process the router request through the dialog/request processor (which handles transforms)
            const routerResult = await dialogRequestProcessor.process(routerRequest);
            
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
                        form: {
                            title: 'Оберіть спосіб виконання',
                            choices: [
                                ...rankedChoices,
                                ...ROUTER_CHOICES
                            ]
                        }
                    }
                };
            } else {
                // If router processing failed, fall back to simulating with candidates
                logger.warn('[ActionRequestProcessor] Router transform failed, falling back to simulated ranking');
                const rankedIds = actionsToUse
                    .map(action => action.id)
                    .sort((idA, idB) => {
                        const matchA = candidates.find(m => m.action.id === idA)?.matchScore || 0;
                        const matchB = candidates.find(m => m.action.id === idB)?.matchScore || 0;
                        return matchB - matchA;
                    });

                const rankedChoices = rankedIds
                    .map(id => actionsToUse.find(action => action.id === id))
                    .filter(Boolean)
                    .map(action => ({id: action.id, label: action.title}));

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
                        form: {
                            title: 'Оберіть спосіб виконання',
                            choices: [
                                ...rankedChoices,
                                ...ROUTER_CHOICES
                            ]
                        }
                    }
                };
            }
        } catch (error) {
            logger.error('[ActionRequestProcessor] LLM router failed, falling back to static choices', {
                error: error.message
            });
            // If LLM is unavailable → graceful fallback to static ROUTER_CHOICES (no crash)
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
                    form: {
                        title: 'Оберіть спосіб виконання',
                        choices: [...ROUTER_CHOICES],
                    }
                }
            } as ProcessResult;
        }
    }
}

// Singleton instance
export const actionRequestProcessor = new ActionRequestProcessor();
