/**
 * Action Context Parser
 *
 * Specialized parser for action-related context
 * @deprecated Используйте новый формат с execute.form.choices
 */

import {
    ContextBlock,
    ProtocolError,
} from '../../types/index.js';
import {
    BaseContextParser,
    ParseContext,
    PROTOCOL_VERSION,
} from './base-parser.js';

/**
 * Action execution state (new protocol format)
 */
export interface ActionExecutionState {
    /** Action ID (e.g., 'fix-vue-imports', 'coder') */
    action: string;
    /** Current step ID (e.g., 'vue-import-detect', 'llm-request') */
    step: string;
    /** Optional status for completion */
    status?: 'completed';
    /** History of executed steps */
    history?: Array<{ step: string; result?: unknown }>;
}

/**
 * Proposed action structure
 * @deprecated Используйте `execute.form.choices`
 */
export interface ProposedAction {
    id: string;
    title: string;
    description?: string;
    priority?: number;
}

/**
 * Action context data
 * @deprecated Используйте контекст с execute и result (action-key shape)
 */
export interface ActionContext {
    sessionId: string;
    /** @deprecated Используйте `execute.form.choices` */
    proposedActions?: ProposedAction[];
    /** @deprecated Используйте `context.execution` (новый формат) */
    executingAction?: ActionExecutionState;
    task?: string;
}

/**
 * Parser for action-related context
 */
export class ActionContextParser extends BaseContextParser<ActionContext> {
    constructor(options: ParseContext = {}) {
        super(options);
    }

    /**
     * Validate action context data
     */
    validate(data: unknown): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!this.isObject(data)) {
            return { valid: false, errors: ['Action context must be an object'] };
        }

        const ctx = data as Record<string, unknown>;

        // Validate session_id
        if (!this.isString(ctx['session_id'])) {
            errors.push('session_id is required and must be a string');
        } else if (ctx['session_id'].length === 0) {
            errors.push('session_id cannot be empty');
        }

        // Validate proposedActions if present
        if (ctx['proposedActions'] !== undefined) {
            if (!Array.isArray(ctx['proposedActions'])) {
                errors.push('proposedActions must be an array');
            } else {
                for (let i = 0; i < ctx['proposedActions'].length; i++) {
                    const action = ctx['proposedActions'][i];
                    if (!this.isValidProposedAction(action)) {
                        errors.push(`proposedActions[${i}] is invalid: must have id and title`);
                    }
                }
            }
        }

        // Validate executingAction if present
        if (ctx['executingAction'] !== undefined) {
            if (!this.isValidExecutingAction(ctx['executingAction'])) {
                errors.push('executingAction must have actionId and currentActionId');
            }
        }

        // Validate task if present
        if (ctx['task'] !== undefined && !this.isString(ctx['task'])) {
            errors.push('task must be a string');
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Parse action context from data
     */
    parse(data: unknown): ActionContext {
        const validation = this.validate(data);
        if (!validation.valid) {
            throw new Error(`Invalid action context: ${validation.errors.join(', ')}`);
        }

        const ctx = data as Record<string, unknown>;

        const result: ActionContext = {
            sessionId: ctx['session_id'] as string,
        };

        if (ctx['proposedActions']) {
            result.proposedActions = ctx['proposedActions'] as ProposedAction[];
        }

        if (ctx['executingAction']) {
            result.executingAction = ctx['executingAction'] as ActionExecutionState;
        }

        if (ctx['task']) {
            result.task = ctx['task'] as string;
        }

        return result;
    }

    /**
     * Normalize action context to standard format
     */
    normalize(data: unknown): ActionContext {
        if (!this.isObject(data)) {
            throw new Error('Cannot normalize non-object data');
        }

        const ctx = data as Record<string, unknown>;

        return {
            sessionId: this.isString(ctx['session_id']) ? ctx['session_id'] : 'unknown',
            proposedActions: this.normalizeProposedActions(ctx['proposedActions']),
            executingAction: this.normalizeExecutingAction(ctx['executingAction']),
            task: this.isString(ctx['task']) ? ctx['task'] : undefined,
        };
    }

    /**
     * Create action context for execution
     */
    createExecutionContext(
        sessionId: string,
        actionId: string,
        currentActionId: string
    ): ActionContext {
        return {
            sessionId,
            executingAction: {
                actionId,
                currentActionId,
                history: [],
            },
        };
    }

    /**
     * Add proposed actions to context
     */
    addProposedActions(
        context: ActionContext,
        actions: ProposedAction[]
    ): ActionContext {
        return {
            ...context,
            proposedActions: [...(context.proposedActions || []), ...actions],
        };
    }

    /**
     * Update execution state
     */
    updateExecutionState(
        context: ActionContext,
        state: Partial<ActionExecutionState>
    ): ActionContext {
        return {
            ...context,
            executingAction: {
                ...context.executingAction,
                ...state,
            } as ActionExecutionState,
        };
    }

    /**
     * Add history entry to execution state
     */
    addExecutionHistory(
        context: ActionContext,
        entry: unknown
    ): ActionContext {
        if (!context.executingAction) {
            return context;
        }

        return {
            ...context,
            executingAction: {
                ...context.executingAction,
                history: [...context.executingAction.history, entry],
            },
        };
    }

    /**
     * Check if context has proposed actions
     */
    hasProposedActions(context: ActionContext): boolean {
        return (
            context.proposedActions !== undefined &&
            context.proposedActions.length > 0
        );
    }

    /**
     * Check if context has executing action
     */
    hasExecutingAction(context: ActionContext): boolean {
        return context.executingAction !== undefined;
    }

    // ============================================
    // Private Helpers
    // ============================================

    private isValidProposedAction(value: unknown): boolean {
        if (!this.isObject(value)) return false;
        const action = value as Record<string, unknown>;
        return this.isString(action['id']) && this.isString(action['title']);
    }

    private isValidExecutingAction(value: unknown): boolean {
        if (!this.isObject(value)) return false;
        const exec = value as Record<string, unknown>;
        return (
            this.isString(exec['actionId']) &&
            this.isString(exec['currentActionId']) &&
            Array.isArray(exec['history'])
        );
    }

    private normalizeProposedActions(value: unknown): ProposedAction[] | undefined {
        if (!Array.isArray(value)) return undefined;

        return value
            .filter(this.isValidProposedAction.bind(this))
            .map((action) => ({
                id: (action as Record<string, unknown>)['id'] as string,
                title: (action as Record<string, unknown>)['title'] as string,
                description: this.isString((action as Record<string, unknown>)['description'])
                    ? (action as Record<string, unknown>)['description']
                    : undefined,
                priority: this.isNumber((action as Record<string, unknown>)['priority'])
                    ? (action as Record<string, unknown>)['priority']
                    : undefined,
            }));
    }

    private normalizeExecutingAction(value: unknown): ActionExecutionState | undefined {
        if (!this.isValidExecutingAction(value)) return undefined;

        const exec = value as Record<string, unknown>;
        return {
            actionId: exec['actionId'] as string,
            currentActionId: exec['currentActionId'] as string,
            history: Array.isArray(exec['history']) ? exec['history'] : [],
        };
    }
}

/**
 * Create a new action context parser
 */
export function createActionContextParser(options?: ParseContext): ActionContextParser {
    return new ActionContextParser(options);
}
