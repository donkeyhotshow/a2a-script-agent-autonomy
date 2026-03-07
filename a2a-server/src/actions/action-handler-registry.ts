/**
 * Action Handler Registry - Simulation Mode
 *
 * Minimal action handlers for simulation processing.
 */

import {logger} from '../utils/logger.js';
import * as handlers from './handlers/index.js';

export type ActionType =
    | 'read-file'
    | 'write-file'
    | 'file-exists'
    | 'list-directory'
    | 'execute-command';

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

/**
 * Registry mapping action types to their handlers
 */
class ActionHandlerRegistry {
    private handlers: Map<ActionType, ActionHandler> = new Map();
    private initialized = false;

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
            throw error;
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

        // File Operations handlers
        this.register('read-file', async (input) => {
            return handlers.executeReadFile(input as handlers.ReadFileActionInput);
        });

        this.register('write-file', async (input) => {
            return handlers.executeWriteFile(input as handlers.WriteFileActionInput);
        });

        this.register('file-exists', async (input) => {
            return handlers.executeFileExists(input as { filePath: string });
        });

        this.register('list-directory', async (input) => {
            return handlers.executeListDirectory(input as { dirPath: string; recursive?: boolean });
        });

        // Command Execution handler
        this.register('execute-command', async (input) => {
            return handlers.executeCommand(input as handlers.ExecuteCommandInput);
        });

        this.initialized = true;
        logger.info('[ActionHandlerRegistry] Default handlers registered');
    }
}

// Global instance
export const actionHandlerRegistry = new ActionHandlerRegistry();

// Factory function for testing
export function getActionHandlerRegistry(): ActionHandlerRegistry {
    return actionHandlerRegistry;
}
