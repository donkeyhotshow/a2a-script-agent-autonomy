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
import type {
    RequestContext,
    ProcessResult,
    ProcessOutcome,
} from '../request-processor.interfaces.js';
import {BaseRequestProcessor, type RequestType} from './base-processor.js';
import {buildRouterForm, LLM_PIPELINE_ACTIONS, ROUTER_CONFIG, ACTION_TO_SCHEMA} from '../../../config/router-static.js';
import {applySequenceStepComplete} from './sequence-workbench.js';
import {resolveExecution, resolveResultObject} from './normalization.js';
import {dialogRequestProcessor} from './dialog-request-processor.js';

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
        const sessionId = ctx['session_id'] as string || promiseId;

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
     * Handle router choice submission - process user's choice from router form
     */
    private async handleRouterChoice(
        sessionId: string,
        _promiseId: string,
        ctx: Record<string, unknown>,
        request: RequestContext
    ): Promise<ProcessResult> {
        const choiceId = this.pickRouterSubmitChoice(ctx);
        const inner = ctx['context'] as Record<string, unknown> | undefined;
        const taskText =
            (typeof ctx['task'] === 'string' ? ctx['task'] : '') ||
            (inner && typeof inner['task'] === 'string' ? (inner['task'] as string) : '');

        logger.info('[ActionRequestProcessor] Processing router choice', {
            choice: choiceId,
            sessionId,
        });

        if (!choiceId) {
            logger.warn('[ActionRequestProcessor] Missing choice in router submission');
            return {
                outcome: 'failed' as ProcessOutcome,
                error: 'Missing choice'
            } as ProcessResult;
        }

        // LLM pipelines: run request transforms + LLM (same as direct dialog routing)
        if (LLM_PIPELINE_ACTIONS.includes(choiceId)) {
            logger.info('[ActionRequestProcessor] Delegating router choice to dialog pipeline', {choiceId});
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
            logger.warn('[ActionRequestProcessor] Action not found for choice', { choiceId });
            return {
                outcome: 'failed' as ProcessOutcome,
                error: `Action not found: ${choiceId}`
            } as ProcessResult;
        }

        // Execute the selected scripted action directly
        try {
            const actionResult = await actionProcessor.executeAction(sessionId, actionDef, { task: taskText });

            if (actionResult.outcome === 'completed') {
                return {
                    outcome: 'completed',
                    context: actionResult.context,
                    execute: actionResult.execute,
                    activated_neuron_ids: actionResult.actionId ? [actionResult.actionId] : undefined,
                };
            } else {
                return actionResult;
            }
        } catch (error) {
            logger.error('[ActionRequestProcessor] Error executing router choice', { error, choiceId });
            return {
                outcome: 'failed' as ProcessOutcome,
                error: `Failed to execute action: ${error instanceof Error ? error.message : String(error)}`
            } as ProcessResult;
        }
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

        const execution: Record<string, unknown> = {
            action: 'task',
            step: 'router',
        };
        if (ROUTER_CONFIG.autoSelectionEnabled) {
            execution.routerAnalysis = this.analyzeTaskForAutoRouting(taskText);
        }

        return {
            outcome: 'completed',
            context: {
                execution,
                task: taskText
            },
            execute: {
                form: buildRouterForm(rankedChoices)
            }
        };
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
        if (!taskDescription || typeof taskDescription !== 'string') {
            return { suitable: false, confidence: 0, preferredChoice: null, reason: 'No task description' };
        }

        const text = taskDescription.toLowerCase().trim();
        const scores = { agent: 0, 'task-decomposition': 0, dialog: 0 };

        // Keywords that strongly indicate agent usage
        const agentKeywords = [
            'search', 'find', 'grep', 'code', 'file', 'edit', 'modify', 'create', 'delete',
            'run', 'execute', 'command', 'script', 'tool', 'fix', 'bug', 'error',
            'implement', 'add', 'update', 'refactor', 'debug', 'test', 'lint'
        ];

        // Keywords that indicate task decomposition
        const decompositionKeywords = [
            'plan', 'break down', 'steps', 'phases', 'organize', 'structure',
            'multiple', 'several', 'various', 'complex', 'large', 'comprehensive'
        ];

        // Keywords that indicate dialog preference
        const dialogKeywords = [
            'explain', 'tell me', 'what is', 'how does', 'describe', 'conversation',
            'chat', 'discuss', 'question', 'ask', 'answer',
            'dialog', 'диалог', 'діалог',
        ];

        // Score based on keyword presence
        agentKeywords.forEach(keyword => {
            if (text.includes(keyword)) scores.agent += 1;
        });

        decompositionKeywords.forEach(keyword => {
            if (text.includes(keyword)) scores['task-decomposition'] += 1;
        });

        dialogKeywords.forEach(keyword => {
            if (text.includes(keyword)) scores.dialog += 1;
        });

        // Find the highest scoring choice
        const maxScore = Math.max(...Object.values(scores));
        const preferredChoice = maxScore > 0 ? Object.keys(scores).find(key => scores[key] === maxScore) : null;

        // Determine suitability using router configuration
        const totalKeywords = Object.values(scores).reduce((sum, score) => sum + score, 0);
        const suitable = totalKeywords >= ROUTER_CONFIG.minKeywordMatches;
        const confidence = totalKeywords > 0 ? Math.min(totalKeywords / 5, 1) : 0;

        return {
            suitable,
            confidence,
            preferredChoice: preferredChoice as string | null,
            reason: suitable ? `Detected ${preferredChoice} pattern with ${totalKeywords} keyword matches` : `Insufficient keywords (${totalKeywords}) for confident auto-selection`
        };
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
        logger.info('[ActionRequestProcessor] Processing step_complete', {
            stepId: ctx['stepId'],
            sessionId
        });

        const stepId = ctx['stepId'] as string;

        if (!stepId) {
            logger.warn('[ActionRequestProcessor] Missing stepId in step_complete');
            return {
                outcome: 'failed' as ProcessOutcome,
                error: 'Missing stepId'
            } as ProcessResult;
        }

        const applied = applySequenceStepComplete(ctx, stepId);
        if (!applied.ok) {
            logger.warn('[ActionRequestProcessor] step_complete failed', {error: applied.error, sessionId});
            return {
                outcome: 'failed' as ProcessOutcome,
                error: applied.error,
            } as ProcessResult;
        }

        logger.info('[ActionRequestProcessor] Step completed (workbench sequence)', {
            sessionId,
            completedStepId: stepId,
        });

        return {
            outcome: 'completed',
            context: applied.context as ProcessResult['context'],
            execute: {
                dialog: {
                    message: `Step ${stepId} completed successfully.`,
                },
            },
        };
    }

    /**
     * Handle approve_action - client confirms action execution
     */
    private handleApproveAction(
        sessionId: string,
        _promiseId: string,
        ctx: Record<string, unknown>
    ): ProcessResult {
        logger.info('[ActionRequestProcessor] Processing approve_action', {
            actionId: ctx['action_id'] || ctx['actionId'],
            sessionId
        });

        const actionId = ctx['action_id'] as string || ctx['actionId'] as string;

        if (!actionId) {
            logger.warn('[ActionRequestProcessor] Missing actionId in approve_action');
            return {
                outcome: 'failed' as ProcessOutcome,
                error: 'Missing actionId'
            } as ProcessResult;
        }

        // Delegate to action processor
        return this.actionProcessor.approveAction(sessionId, actionId);
    }

    /**
     * Extract router submit choice from context
     * Checks various places where choice might be stored in form submissions
     */
    private pickRouterSubmitChoice(ctx: Record<string, unknown>): string | undefined {
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
}

export const actionRequestProcessor = new ActionRequestProcessor();
