/**
 * Action Handler Registry - Simulation Mode
 *
 * Minimal action handlers for simulation processing.
 */

import {logger} from '../../lib/logger.js';
import * as handlers from './handlers/index.js';
import {SkillEvolver} from '../services/core/skill-evolver.js';

export type ActionType =
    | 'read-file'
    | 'write-file'
    | 'file-exists'
    | 'list-directory'
    | 'execute-command'
    | 'grep-search'
    | 'edit-patch'
    | 'run-script';

export interface ActionHandlerContext {
    sessionId: string;
    actionId: string;
    stepId?: string;
    metadata?: Record<string, unknown>;
}

export type ActionHandler = (
    input: unknown,
    context: ActionHandlerContext
) => Promise<unknown>;

const DEFAULT_HANDLERS: Record<ActionType, ActionHandler> = {
    'read-file': async (input, _context) => handlers.executeReadFile(input as handlers.ReadFileActionInput),
    'write-file': async (input, _context) => handlers.executeWriteFile(input as handlers.WriteFileActionInput),
    'file-exists': async (input, _context) => {
        const params = input as { path?: string; filePath?: string };
        return handlers.executeFileExists({
            path: params.path || params.filePath || '',
        } as handlers.FileExistsActionInput);
    },
    'list-directory': async (input, _context) => handlers.executeListDirectory(input as { dirPath: string; recursive?: boolean }),
    'execute-command': async (input, _context) => handlers.executeCommand(input as handlers.ExecuteCommandInput),
    'grep-search': async (input, _context) => handlers.executeGrepSearch(input as handlers.GrepSearchInput),
    'edit-patch': async (input, _context) => handlers.executeEditPatch(input as handlers.EditPatchInput),
    'run-script': async (input, _context) => handlers.executeRunScript(input as handlers.RunScriptInput),
};

/**
 * Registry mapping action types to their handlers
 */
class ActionHandlerRegistry {
    private handlers: Map<ActionType, ActionHandler> = new Map();
    private initialized = false;
    private errorTracker: Map<ActionType, string[]> = new Map();
    private skillEvolver = new SkillEvolver();

    constructor() {
        this.registerDefaultHandlers();
    }

    /**
     * Register a handler for an action type
     */
    register(actionType: ActionType, handler: ActionHandler): void {
        this.handlers.set(actionType, handler);
        logger.info('[ActionHandlerRegistry] Handler registered', {actionType});
    }

    /**
     * Get handler for action type
     */
    getHandler(actionType: string): ActionHandler | undefined {
        return this.handlers.get(actionType as ActionType);
    }

    /**
     * Check if handler exists for action type
     */
    hasHandler(actionType: string): boolean {
        return this.handlers.has(actionType as ActionType);
    }

    /**
     * Execute an action by type
     */
    async execute(
        actionType: string,
        input: unknown,
        context: ActionHandlerContext
    ): Promise<unknown> {
        const handler = this.getHandler(actionType);

        if (!handler) {
            throw new Error(`No handler registered for action type: ${actionType}`);
        }

        logger.info('[ActionHandlerRegistry] Executing action', {
            actionType,
            sessionId: context.sessionId,
        });

        try {
            const result = await handler(input, context);
            const isLogicalFailure = result && typeof result === 'object' && 'success' in result && result.success === false;

            if (isLogicalFailure) {
                const errStr = (result as Record<string, unknown>).error as string | undefined || 'Logical failure';
                await this.recordFailure(actionType as ActionType, errStr, context);
            } else {
                // Clear errors on success
                this.errorTracker.delete(actionType as ActionType);
            }

            logger.info('[ActionHandlerRegistry] Action executed successfully', {
                actionType,
                sessionId: context.sessionId,
            });

            return result;
        } catch (error) {
            logger.error('[ActionHandlerRegistry] Action execution failed', {
                actionType,
                sessionId: context.sessionId,
                error: String(error),
            });
            await this.recordFailure(actionType as ActionType, String(error), context);
            throw error;
        }
    }

    private async recordFailure(actionType: ActionType, errorStr: string, context: ActionHandlerContext) {
        const errors = this.errorTracker.get(actionType) || [];
        errors.push(errorStr);
        this.errorTracker.set(actionType, errors);

        if (errors.length >= 3) {
            try {
                const proposal = await this.skillEvolver.evolve(actionType, errors, context);
                logger.warn(`[ActionHandlerRegistry] SkillEvolver triggered for ${actionType}`, { proposal });
            } catch (e) {
                logger.error('[ActionHandlerRegistry] SkillEvolver failed', { error: String(e) });
            }
            this.errorTracker.delete(actionType); // Reset after evolution
        }
    }

    /**
     * List all registered handlers
     */
    listHandlers(): ActionType[] {
        return Array.from(this.handlers.keys());
    }

    private registerDefaultHandlers(): void {
        if (this.initialized) return;

        for (const [type, handler] of Object.entries(DEFAULT_HANDLERS)) {
            this.register(type as ActionType, handler);
        }

        this.initialized = true;
        logger.info('[ActionHandlerRegistry] Default handlers registered');
    }
}

// Global instance
export const actionHandlerRegistry = new ActionHandlerRegistry();

// Export class for direct usage
export { ActionHandlerRegistry };
