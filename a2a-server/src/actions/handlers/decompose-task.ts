/**
 * Action Handler: decompose-task
 * 
 * Handles task decomposition into subtasks, steps, and actions.
 */

import {logger} from '../../utils/logger.js';
import {
    taskDecompositionService,
    type Subtask,
    type Step,
    type Action,
    type DecompositionResult,
    type ExecutionPlan,
} from '../../services/task-decomposition.service.js';
import type {StructuredTask} from '../../services/task-capture.service.js';

export interface DecomposeToSubtasksInput {
    structuredTask: StructuredTask;
    subtasks?: Array<{
        title: string;
        description: string;
        order: number;
        estimatedDuration?: number;
        dependencies?: Array<{
            dependsOnOrder: number;
            type: 'requires' | 'optional' | 'conflicts';
        }>;
    }>;
    autoDecompose?: boolean;
}

export interface DecomposeToStepsInput {
    subtaskId: string;
    subtask?: Subtask;
    steps?: Array<{
        title: string;
        description: string;
        order: number;
        estimatedDuration?: number;
    }>;
    autoDecompose?: boolean;
}

export interface DecomposeToActionsInput {
    stepId: string;
    step?: Step;
    actions?: Array<{
        type: string;
        description: string;
        order: number;
        input?: Record<string, unknown>;
    }>;
    autoDecompose?: boolean;
}

export interface DecomposeActionOutput {
    success: boolean;
    subtasks?: Subtask[];
    steps?: Step[];
    actions?: Action[];
    executionPlan?: ExecutionPlan;
    error?: string;
}

/**
 * Execute decompose-to-subtasks action
 */
export async function executeDecomposeToSubtasks(
    input: DecomposeToSubtasksInput
): Promise<DecomposeActionOutput> {
    logger.info('[decompose-to-subtasks] Executing', {
        structuredTaskId: input.structuredTask.id,
        hasDefinitions: !!input.subtasks,
    });

    try {
        const result = await taskDecompositionService.decomposeToSubtasks(
            input.structuredTask,
            input.subtasks
        );

        // Generate execution plan
        const executionPlan = taskDecompositionService.generateExecutionPlan(result.subtasks);

        logger.info('[decompose-to-subtasks] Decomposition complete', {
            subtaskCount: result.subtasks.length,
            canParallelize: result.canParallelize,
        });

        return {
            success: true,
            subtasks: result.subtasks,
            executionPlan,
        };
    } catch (error) {
        logger.error('[decompose-to-subtasks] Execution failed', {error: String(error)});
        return {
            success: false,
            error: String(error),
        };
    }
}

/**
 * Execute decompose-to-steps action
 */
export async function executeDecomposeToSteps(
    input: DecomposeToStepsInput
): Promise<DecomposeActionOutput> {
    logger.info('[decompose-to-steps] Executing', {
        subtaskId: input.subtaskId,
        hasDefinitions: !!input.steps,
    });

    try {
        // Get subtask if not provided
        let subtask = input.subtask;
        if (!subtask) {
            // Fetch subtask from database
            const subtasks = await taskDecompositionService.getSubtasks(''); // This will need the structured task ID
            subtask = subtasks.find(s => s.id === input.subtaskId);
            
            if (!subtask) {
                throw new Error(`Subtask ${input.subtaskId} not found`);
            }
        }

        const steps = await taskDecompositionService.decomposeToSteps(
            subtask,
            input.steps
        );

        logger.info('[decompose-to-steps] Decomposition complete', {
            stepCount: steps.length,
        });

        return {
            success: true,
            steps,
        };
    } catch (error) {
        logger.error('[decompose-to-steps] Execution failed', {error: String(error)});
        return {
            success: false,
            error: String(error),
        };
    }
}

/**
 * Execute decompose-to-actions action
 */
export async function executeDecomposeToActions(
    input: DecomposeToActionsInput
): Promise<DecomposeActionOutput> {
    logger.info('[decompose-to-actions] Executing', {
        stepId: input.stepId,
        hasDefinitions: !!input.actions,
    });

    try {
        // Get step if not provided
        let step = input.step;
        if (!step) {
            // Fetch step from database - need to find which subtask contains this step
            // For now, we'll require the step to be provided
            throw new Error('Step object must be provided');
        }

        const actions = await taskDecompositionService.decomposeToActions(
            step,
            input.actions
        );

        logger.info('[decompose-to-actions] Decomposition complete', {
            actionCount: actions.length,
        });

        return {
            success: true,
            actions,
        };
    } catch (error) {
        logger.error('[decompose-to-actions] Execution failed', {error: String(error)});
        return {
            success: false,
            error: String(error),
        };
    }
}

/**
 * Execute generate-execution-plan action
 */
export async function executeGenerateExecutionPlan(
    input: {
        structuredTaskId: string;
    }
): Promise<{
    success: boolean;
    executionPlan?: ExecutionPlan;
    error?: string;
}> {
    logger.info('[generate-execution-plan] Executing', {
        structuredTaskId: input.structuredTaskId,
    });

    try {
        const subtasks = await taskDecompositionService.getSubtasks(input.structuredTaskId);
        
        if (subtasks.length === 0) {
            return {
                success: false,
                error: 'No subtasks found for this task',
            };
        }

        const executionPlan = taskDecompositionService.generateExecutionPlan(subtasks);

        return {
            success: true,
            executionPlan,
        };
    } catch (error) {
        logger.error('[generate-execution-plan] Execution failed', {error: String(error)});
        return {
            success: false,
            error: String(error),
        };
    }
}

/**
 * Execute update-subtask-status action
 */
export async function executeUpdateSubtaskStatus(
    input: {
        subtaskId: string;
        newStatus: 'pending' | 'ready' | 'in-progress' | 'completed' | 'failed' | 'blocked';
    }
): Promise<{success: boolean; subtask?: Subtask; error?: string}> {
    logger.info('[update-subtask-status] Executing', {
        subtaskId: input.subtaskId,
        newStatus: input.newStatus,
    });

    try {
        const subtask = await taskDecompositionService.updateSubtaskStatus(
            input.subtaskId,
            input.newStatus
        );

        return {
            success: true,
            subtask,
        };
    } catch (error) {
        logger.error('[update-subtask-status] Execution failed', {error: String(error)});
        return {
            success: false,
            error: String(error),
        };
    }
}

/**
 * Execute update-step-status action
 */
export async function executeUpdateStepStatus(
    input: {
        stepId: string;
        newStatus: 'pending' | 'ready' | 'in-progress' | 'completed' | 'failed';
    }
): Promise<{success: boolean; step?: Step; error?: string}> {
    logger.info('[update-step-status] Executing', {
        stepId: input.stepId,
        newStatus: input.newStatus,
    });

    try {
        const step = await taskDecompositionService.updateStepStatus(
            input.stepId,
            input.newStatus
        );

        return {
            success: true,
            step,
        };
    } catch (error) {
        logger.error('[update-step-status] Execution failed', {error: String(error)});
        return {
            success: false,
            error: String(error),
        };
    }
}

/**
 * Execute update-action-status action
 */
export async function executeUpdateActionStatus(
    input: {
        actionId: string;
        newStatus: 'pending' | 'ready' | 'in-progress' | 'completed' | 'failed';
        output?: Record<string, unknown>;
    }
): Promise<{success: boolean; action?: Action; error?: string}> {
    logger.info('[update-action-status] Executing', {
        actionId: input.actionId,
        newStatus: input.newStatus,
    });

    try {
        const action = await taskDecompositionService.updateActionStatus(
            input.actionId,
            input.newStatus,
            input.output
        );

        return {
            success: true,
            action,
        };
    } catch (error) {
        logger.error('[update-action-status] Execution failed', {error: String(error)});
        return {
            success: false,
            error: String(error),
        };
    }
}

/**
 * Execute get-decomposition action - retrieves full decomposition tree
 */
export async function executeGetDecomposition(
    input: {
        structuredTaskId: string;
    }
): Promise<{
    success: boolean;
    subtasks?: Array<Subtask & {steps: Array<Step & {actions: Action[]}>}>;
    error?: string;
}> {
    logger.info('[get-decomposition] Executing', {
        structuredTaskId: input.structuredTaskId,
    });

    try {
        const subtasks = await taskDecompositionService.getSubtasks(input.structuredTaskId);
        
        const result: Array<Subtask & {steps: Array<Step & {actions: Action[]}>}> = [];

        for (const subtask of subtasks) {
            const steps = await taskDecompositionService.getSteps(subtask.id);
            const stepsWithActions: Array<Step & {actions: Action[]}> = [];

            for (const step of steps) {
                const actions = await taskDecompositionService.getActions(step.id);
                stepsWithActions.push({...step, actions});
            }

            result.push({...subtask, steps: stepsWithActions});
        }

        return {
            success: true,
            subtasks: result,
        };
    } catch (error) {
        logger.error('[get-decomposition] Execution failed', {error: String(error)});
        return {
            success: false,
            error: String(error),
        };
    }
}
