/**
 * Action Context Parser
 *
 * Specialized parser for action-related context
 * @deprecated Use canonical format with execute.form.choices
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
 * Action context data
 * @deprecated Use context with execute and result (action-key shape)
 */
export interface ActionContext {
    sessionId: string;
    /** @deprecated Use context.execution (new format) */
    executingAction?: ActionExecutionState;
    task?: string;
}

/**
 * Removed: ProposedAction interface
 * Use execute.form.choices in canonical format instead
 */

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

        // Note: proposedActions removed - use execute.form.choices in canonical format

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

        // Note: proposedActions removed - use canonical format

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
            // Note: proposedActions removed - use canonical format
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
     * Note: addProposedActions removed - use canonical format with execute.form.choices
     * @deprecated
     */
    addProposedActions(): never {
        throw new Error('addProposedActions removed - use execute.form.choices in canonical format');
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
     * Note: hasProposedActions removed - use canonical format
     * @deprecated
     */
    hasProposedActions(): boolean {
        return false;
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

    // Note: isValidProposedAction removed - use canonical format

    private isValidExecutingAction(value: unknown): boolean {
        if (!this.isObject(value)) return false;
        const exec = value as Record<string, unknown>;
        return (
            this.isString(exec['actionId']) &&
            this.isString(exec['currentActionId']) &&
            Array.isArray(exec['history'])
        );
    }

    // Note: normalizeProposedActions removed - use canonical format

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
