/**
 * Action Handler Registry - Simulation Mode
 *
 * Minimal action handlers for simulation processing.
 */

import {logger} from '../../../utils/src/lib/logger.js';
import * as handlers from './handlers/index.js';
import {SkillEvolver} from '../../server/src/skill-evolver.js';
import { ActionType, VALID_ACTION_TYPES_SET } from './constants/action-types.js';
import {BaseRegistry} from './base/base-registry.ts';
import {handleError} from './utils/error-handler.ts';
import { createSingleton } from './utils/singleton.ts';

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
    'execute-command': async (input, _context) => {
        const params = input as handlers.ExecuteCommandInput;
        if (params.shell === true) {
            throw new Error('Shell execution must be explicitly enabled via ALLOW_HIGH_RISK_COMMANDS');
        }
        return handlers.executeCommand(params);
    },
    'grep-search': async (input, _context) => handlers.executeGrepSearch(input as handlers.GrepSearchInput),
    'edit-patch': async (input, _context) => handlers.executeEditPatch(input as handlers.EditPatchInput),
    'run-script': async (input, _context) => handlers.executeRunScript(input as handlers.RunScriptInput),
};

/**
 * Registry mapping action types to their handlers
 */
class ActionHandlerRegistry extends BaseRegistry<ActionType, ActionHandler> {
    private initialized = false;
    private errorTracker: Map<ActionType, string[]> = new Map();
    private skillEvolver = new SkillEvolver();

    constructor() {
        super('ActionHandlerRegistry');
        this.registerDefaultHandlers();
    }

    /**
     * Get handler for action type
     */
    getHandler(actionType: string): ActionHandler | undefined {
        return this.get(actionType as ActionType);
    }

    /**
     * Check if handler exists for action type
     */
    hasHandler(actionType: string): boolean {
        return this.has(actionType as ActionType);
    }

    /**
     * Execute an action by type
     */
    async execute(
        actionType: string,
        input: unknown,
        context: ActionHandlerContext
    ): Promise<unknown> {
        // CWE-94: validate actionType against known allowlist before dispatch
        if (!VALID_ACTION_TYPES_SET.has(actionType as ActionType)) {
            throw new Error(`Unknown action type: ${actionType}`);
        }

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
            handleError({
                logger,
                component: 'ActionHandlerRegistry',
                message: 'Action execution failed',
                error,
                policy: 'fail-fast',
                onLenient: async () => {
                    await this.recordFailure(actionType as ActionType, String(error), context);
                }
            });
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
                handleError({
                    logger,
                    component: 'ActionHandlerRegistry',
                    message: 'SkillEvolver failed',
                    error: e,
                    policy: 'lenient'
                });
            }
            this.errorTracker.delete(actionType); // Reset after evolution
        }
    }

    /**
     * List all registered handlers
     */
    listHandlers(): ActionType[] {
        return this.listKeys();
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

/**
 * Get singleton ActionHandlerRegistry instance
 */
export const getActionHandlerRegistry = createSingleton(ActionHandlerRegistry);

// Global instance for backward compatibility
export const actionHandlerRegistry = getActionHandlerRegistry();

// Export class for direct usage
export { ActionHandlerRegistry };
