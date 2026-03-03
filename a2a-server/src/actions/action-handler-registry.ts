/**
 * Action Handler Registry
 * 
 * Registers all action handlers and routes action execution.
 * This bridges the gap between action definitions and their implementations.
 */

import {logger} from '../utils/logger.js';
import * as handlers from './handlers/index.js';

export type ActionType = 
    | 'capture-task'
    | 'structure-task'
    | 'update-task-status'
    | 'get-task'
    | 'decompose-to-subtasks'
    | 'decompose-to-steps'
    | 'decompose-to-actions'
    | 'generate-execution-plan'
    | 'update-subtask-status'
    | 'update-step-status'
    | 'update-action-status'
    | 'get-decomposition'
    | 'write-doc'
    | 'read-doc'
    | 'append-doc'
    | 'generate-doc'
    | 'generate-report'
    | 'validate-doc'
    | 'list-templates'
    | 'rag-search'
    | 'rag-index'
    | 'rag-clear-cache'
    | 'rag-get-cache-stats'
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

        // Task Capture handlers
        this.register('capture-task', async (input) => {
            return handlers.executeCaptureTask(input as handlers.CaptureTaskActionInput);
        });

        this.register('structure-task', async (input) => {
            return handlers.executeStructureTask(input as {
                capturedTaskId: string;
                title: string;
                description: string;
                requirements: string[];
                constraints?: string[];
                acceptanceCriteria?: string[];
            });
        });

        this.register('update-task-status', async (input) => {
            return handlers.executeUpdateTaskStatus(input as {
                taskId: string;
                newStatus: 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelled';
                details?: Record<string, unknown>;
            });
        });

        this.register('get-task', async (input) => {
            return handlers.executeGetTask(input as {
                taskId: string;
                includeHistory?: boolean;
            });
        });

        // Task Decomposition handlers
        this.register('decompose-to-subtasks', async (input) => {
            return handlers.executeDecomposeToSubtasks(input as handlers.DecomposeToSubtasksInput);
        });

        this.register('decompose-to-steps', async (input) => {
            return handlers.executeDecomposeToSteps(input as handlers.DecomposeToStepsInput);
        });

        this.register('decompose-to-actions', async (input) => {
            return handlers.executeDecomposeToActions(input as handlers.DecomposeToActionsInput);
        });

        this.register('generate-execution-plan', async (input) => {
            return handlers.executeGenerateExecutionPlan(input as {
                structuredTaskId: string;
            });
        });

        this.register('update-subtask-status', async (input) => {
            return handlers.executeUpdateSubtaskStatus(input as {
                subtaskId: string;
                newStatus: 'pending' | 'ready' | 'in-progress' | 'completed' | 'failed' | 'blocked';
            });
        });

        this.register('update-step-status', async (input) => {
            return handlers.executeUpdateStepStatus(input as {
                stepId: string;
                newStatus: 'pending' | 'ready' | 'in-progress' | 'completed' | 'failed';
            });
        });

        this.register('update-action-status', async (input) => {
            return handlers.executeUpdateActionStatus(input as {
                actionId: string;
                newStatus: 'pending' | 'ready' | 'in-progress' | 'completed' | 'failed';
                output?: Record<string, unknown>;
            });
        });

        this.register('get-decomposition', async (input) => {
            return handlers.executeGetDecomposition(input as {
                structuredTaskId: string;
            });
        });

        // Document Writer handlers
        this.register('write-doc', async (input) => {
            return handlers.executeWriteDoc(input as handlers.WriteDocActionInput);
        });

        this.register('read-doc', async (input) => {
            return handlers.executeReadDoc(input as {filePath: string});
        });

        this.register('append-doc', async (input) => {
            return handlers.executeAppendDoc(input as {
                filePath: string;
                content: string;
                ensureNewline?: boolean;
                createIfMissing?: boolean;
            });
        });

        this.register('generate-doc', async (input) => {
            return handlers.executeGenerateDoc(input as {
                type: 'documentation' | 'report' | 'specification' | 'guide' | 'api-doc' | 'changelog';
                format: 'markdown' | 'json' | 'yaml' | 'typescript' | 'javascript' | 'plain';
                context: unknown;
                template?: string;
                useLLM?: boolean;
            });
        });

        this.register('generate-report', async (input) => {
            return handlers.executeGenerateReport(input as {
                type: 'task-report' | 'api-doc' | 'custom';
                filePath: string;
                context: Record<string, unknown>;
                overwrite?: boolean;
            });
        });

        this.register('validate-doc', async (input) => {
            return handlers.executeValidateDoc(input as {
                content: string;
                format?: 'markdown' | 'json' | 'yaml' | 'typescript' | 'javascript' | 'plain';
            });
        });

        this.register('list-templates', async () => {
            return handlers.executeListTemplates();
        });

        // RAG Search handlers
        this.register('rag-search', async (input) => {
            return handlers.executeRagSearch(input as handlers.RagSearchActionInput);
        });

        this.register('rag-index', async (input) => {
            return handlers.executeRagIndex(input as {
                fileId: string;
                content: string;
                chunkSize?: number;
                chunkOverlap?: number;
            });
        });

        this.register('rag-clear-cache', async () => {
            return handlers.executeRagClearCache();
        });

        this.register('rag-get-cache-stats', async () => {
            return handlers.executeRagGetCacheStats();
        });

        // File Operations handlers
        this.register('read-file', async (input) => {
            return handlers.executeReadFile(input as handlers.ReadFileActionInput);
        });

        this.register('write-file', async (input) => {
            return handlers.executeWriteFile(input as handlers.WriteFileActionInput);
        });

        this.register('file-exists', async (input) => {
            return handlers.executeFileExists(input as {filePath: string});
        });

        this.register('list-directory', async (input) => {
            return handlers.executeListDirectory(input as {
                dirPath: string;
                recursive?: boolean;
                pattern?: string;
            });
        });

        // Command Execution handler
        this.register('execute-command', async (input) => {
            return handlers.executeCommand(input as {
                command: string;
                args?: string[];
                cwd?: string;
                env?: Record<string, string>;
                timeout?: number;
                maxOutput?: number;
                shell?: boolean;
            });
        });

        this.initialized = true;
        logger.info('[ActionHandlerRegistry] Default handlers registered', {
            count: this.handlers.size,
        });
    }
}

// Export singleton instance
export const actionHandlerRegistry = new ActionHandlerRegistry();

// Export class for testing/customization
export {ActionHandlerRegistry};
