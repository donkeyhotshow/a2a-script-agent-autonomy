/**
 * Action Handler: capture-task
 * 
 * Handles task capture and structuring actions.
 */

import {logger} from '../../utils/logger.js';
import {
    taskCaptureService,
    type CaptureTaskInput,
    type StructureTaskInput,
    type TaskPriority,
} from '../../services/task-capture.service.js';

export interface CaptureTaskActionInput {
    rawInput: string;
    sessionId: string;
    priority?: TaskPriority;
    autoStructure?: boolean;
    metadata?: {
        source?: string;
        tags?: string[];
        category?: string;
    };
}

export interface CaptureTaskActionOutput {
    success: boolean;
    capturedTaskId?: string;
    structuredTaskId?: string;
    title?: string;
    description?: string;
    requirements?: string[];
    error?: string;
}

/**
 * Execute capture-task action
 */
export async function executeCaptureTask(
    input: CaptureTaskActionInput
): Promise<CaptureTaskActionOutput> {
    logger.info('[capture-task] Executing', {sessionId: input.sessionId});

    try {
        // Step 1: Capture the raw task
        const capturedTask = await taskCaptureService.capture({
            rawInput: input.rawInput,
            sessionId: input.sessionId,
            priority: input.priority,
            metadata: input.metadata,
        });

        logger.info('[capture-task] Task captured', {capturedTaskId: capturedTask.id});

        // Step 2: If autoStructure is enabled, parse and structure the task
        let structuredTaskId: string | undefined;
        let title: string | undefined;
        let description: string | undefined;
        let requirements: string[] | undefined;

        if (input.autoStructure) {
            const parsed = await taskCaptureService.parseTaskInput(input.rawInput);
            
            const structured = await taskCaptureService.structure({
                capturedTaskId: capturedTask.id,
                title: parsed.title,
                description: parsed.description,
                requirements: parsed.requirements,
                constraints: parsed.constraints,
            });

            structuredTaskId = structured.id;
            title = structured.title;
            description = structured.description;
            requirements = structured.requirements;

            logger.info('[capture-task] Task structured', {structuredTaskId});
        }

        return {
            success: true,
            capturedTaskId: capturedTask.id,
            structuredTaskId,
            title,
            description,
            requirements,
        };
    } catch (error) {
        logger.error('[capture-task] Execution failed', {error: String(error)});
        return {
            success: false,
            error: String(error),
        };
    }
}

/**
 * Execute structure-task action (for manual structuring)
 */
export async function executeStructureTask(
    input: StructureTaskInput
): Promise<CaptureTaskActionOutput> {
    logger.info('[structure-task] Executing', {capturedTaskId: input.capturedTaskId});

    try {
        const structured = await taskCaptureService.structure(input);

        return {
            success: true,
            capturedTaskId: input.capturedTaskId,
            structuredTaskId: structured.id,
            title: structured.title,
            description: structured.description,
            requirements: structured.requirements,
        };
    } catch (error) {
        logger.error('[structure-task] Execution failed', {error: String(error)});
        return {
            success: false,
            error: String(error),
        };
    }
}

/**
 * Execute update-task-status action
 */
export async function executeUpdateTaskStatus(
    input: {
        taskId: string;
        newStatus: 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelled';
        details?: Record<string, unknown>;
    }
): Promise<{success: boolean; error?: string}> {
    logger.info('[update-task-status] Executing', {
        taskId: input.taskId,
        newStatus: input.newStatus,
    });

    try {
        await taskCaptureService.updateStatus(input.taskId, input.newStatus, input.details);
        return {success: true};
    } catch (error) {
        logger.error('[update-task-status] Execution failed', {error: String(error)});
        return {
            success: false,
            error: String(error),
        };
    }
}

/**
 * Execute get-task action
 */
export async function executeGetTask(
    input: {
        taskId: string;
        includeHistory?: boolean;
    }
): Promise<{
    success: boolean;
    task?: unknown;
    history?: unknown[];
    structuredTask?: unknown;
    error?: string;
}> {
    logger.info('[get-task] Executing', {taskId: input.taskId});

    try {
        const task = await taskCaptureService.getTask(input.taskId);
        
        if (!task) {
            return {
                success: false,
                error: 'Task not found',
            };
        }

        const result: {
            success: boolean;
            task: unknown;
            history?: unknown[];
            structuredTask?: unknown;
        } = {
            success: true,
            task,
        };

        if (input.includeHistory) {
            result.history = await taskCaptureService.getTaskHistory(input.taskId);
        }

        result.structuredTask = await taskCaptureService.getStructuredTask(input.taskId);

        return result;
    } catch (error) {
        logger.error('[get-task] Execution failed', {error: String(error)});
        return {
            success: false,
            error: String(error),
        };
    }
}
