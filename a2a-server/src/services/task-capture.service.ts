/**
 * Task Capture Service
 * 
 * Управление жизненным циклом задач:
 * - Создание задач из запросов
 * - Отслеживание статуса (pending, in-progress, completed, failed)
 * - Связь с сессиями
 * - История изменений
 */

import {logger} from '../utils/logger.js';
import {PrismaClient} from '@prisma/client';

const prisma = new PrismaClient();

export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface CapturedTask {
    id: string;
    rawInput: string;
    sessionId: string;
    status: TaskStatus;
    priority: TaskPriority;
    createdAt: Date;
    updatedAt: Date;
    metadata?: TaskMetadata;
}

export interface TaskMetadata {
    source?: string;
    tags?: string[];
    category?: string;
    estimatedComplexity?: 'low' | 'medium' | 'high';
    originalRequest?: string;
}

export interface StructuredTask {
    id: string;
    title: string;
    description: string;
    requirements: string[];
    constraints?: string[];
    acceptanceCriteria?: string[];
    capturedTaskId: string;
    status: TaskStatus;
    priority: TaskPriority;
    sessionId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface TaskHistoryEntry {
    id: string;
    taskId: string;
    action: string;
    previousStatus?: TaskStatus;
    newStatus?: TaskStatus;
    details?: Record<string, unknown>;
    createdAt: Date;
}

export interface CaptureTaskInput {
    rawInput: string;
    sessionId: string;
    priority?: TaskPriority;
    metadata?: TaskMetadata;
}

export interface StructureTaskInput {
    capturedTaskId: string;
    title: string;
    description: string;
    requirements: string[];
    constraints?: string[];
    acceptanceCriteria?: string[];
}

/**
 * Service for capturing and managing tasks
 */
export class TaskCaptureService {
    private static instance: TaskCaptureService;

    private constructor() {
        logger.info('[TaskCaptureService] Initialized');
    }

    static getInstance(): TaskCaptureService {
        if (!TaskCaptureService.instance) {
            TaskCaptureService.instance = new TaskCaptureService();
        }
        return TaskCaptureService.instance;
    }

    /**
     * Capture a new task from raw input
     */
    async capture(input: CaptureTaskInput): Promise<CapturedTask> {
        logger.info('[TaskCaptureService] Capturing task', {sessionId: input.sessionId});

        try {
            const task = await prisma.capturedTask.create({
                data: {
                    rawInput: input.rawInput,
                    sessionId: input.sessionId,
                    status: 'pending',
                    priority: input.priority || 'medium',
                    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
                },
            });

            // Create history entry
            await this.createHistoryEntry(task.id, 'captured', undefined, 'pending', {
                rawInput: input.rawInput,
                priority: input.priority,
            });

            logger.info('[TaskCaptureService] Task captured', {taskId: task.id});

            return this.mapToCapturedTask(task);
        } catch (error) {
            logger.error('[TaskCaptureService] Failed to capture task', {error: String(error)});
            throw new Error(`Failed to capture task: ${String(error)}`);
        }
    }

    /**
     * Structure a captured task with detailed information
     */
    async structure(input: StructureTaskInput): Promise<StructuredTask> {
        logger.info('[TaskCaptureService] Structuring task', {capturedTaskId: input.capturedTaskId});

        try {
            // Check if captured task exists
            const capturedTask = await prisma.capturedTask.findUnique({
                where: {id: input.capturedTaskId},
            });

            if (!capturedTask) {
                throw new Error(`Captured task ${input.capturedTaskId} not found`);
            }

            // Create structured task
            const structuredTask = await prisma.structuredTask.create({
                data: {
                    title: input.title,
                    description: input.description,
                    requirements: JSON.stringify(input.requirements),
                    constraints: input.constraints ? JSON.stringify(input.constraints) : null,
                    acceptanceCriteria: input.acceptanceCriteria ? JSON.stringify(input.acceptanceCriteria) : null,
                    capturedTaskId: input.capturedTaskId,
                    status: capturedTask.status as TaskStatus,
                    priority: capturedTask.priority as TaskPriority,
                    sessionId: capturedTask.sessionId,
                },
            });

            // Update captured task status
            await prisma.capturedTask.update({
                where: {id: input.capturedTaskId},
                data: {status: 'in-progress', updatedAt: new Date()},
            });

            // Create history entry
            await this.createHistoryEntry(
                input.capturedTaskId,
                'structured',
                'pending',
                'in-progress',
                {structuredTaskId: structuredTask.id}
            );

            logger.info('[TaskCaptureService] Task structured', {
                structuredTaskId: structuredTask.id,
                capturedTaskId: input.capturedTaskId,
            });

            return this.mapToStructuredTask(structuredTask);
        } catch (error) {
            logger.error('[TaskCaptureService] Failed to structure task', {error: String(error)});
            throw new Error(`Failed to structure task: ${String(error)}`);
        }
    }

    /**
     * Update task status
     */
    async updateStatus(
        taskId: string,
        newStatus: TaskStatus,
        details?: Record<string, unknown>
    ): Promise<CapturedTask> {
        logger.info('[TaskCaptureService] Updating task status', {taskId, newStatus});

        try {
            const task = await prisma.capturedTask.findUnique({
                where: {id: taskId},
            });

            if (!task) {
                throw new Error(`Task ${taskId} not found`);
            }

            const previousStatus = task.status as TaskStatus;

            const updatedTask = await prisma.capturedTask.update({
                where: {id: taskId},
                data: {
                    status: newStatus,
                    updatedAt: new Date(),
                },
            });

            // Create history entry
            await this.createHistoryEntry(taskId, 'status_change', previousStatus, newStatus, details);

            // Also update related structured task if exists
            await prisma.structuredTask.updateMany({
                where: {capturedTaskId: taskId},
                data: {status: newStatus, updatedAt: new Date()},
            });

            logger.info('[TaskCaptureService] Task status updated', {taskId, previousStatus, newStatus});

            return this.mapToCapturedTask(updatedTask);
        } catch (error) {
            logger.error('[TaskCaptureService] Failed to update task status', {error: String(error)});
            throw new Error(`Failed to update task status: ${String(error)}`);
        }
    }

    /**
     * Get task by ID
     */
    async getTask(taskId: string): Promise<CapturedTask | null> {
        try {
            const task = await prisma.capturedTask.findUnique({
                where: {id: taskId},
            });

            return task ? this.mapToCapturedTask(task) : null;
        } catch (error) {
            logger.error('[TaskCaptureService] Failed to get task', {error: String(error)});
            return null;
        }
    }

    /**
     * Get structured task by captured task ID
     */
    async getStructuredTask(capturedTaskId: string): Promise<StructuredTask | null> {
        try {
            const task = await prisma.structuredTask.findFirst({
                where: {capturedTaskId},
            });

            return task ? this.mapToStructuredTask(task) : null;
        } catch (error) {
            logger.error('[TaskCaptureService] Failed to get structured task', {error: String(error)});
            return null;
        }
    }

    /**
     * Get tasks by session ID
     */
    async getTasksBySession(sessionId: string): Promise<CapturedTask[]> {
        try {
            const tasks = await prisma.capturedTask.findMany({
                where: {sessionId},
                orderBy: {createdAt: 'desc'},
            });

            return tasks.map(t => this.mapToCapturedTask(t));
        } catch (error) {
            logger.error('[TaskCaptureService] Failed to get tasks by session', {error: String(error)});
            return [];
        }
    }

    /**
     * Get task history
     */
    async getTaskHistory(taskId: string): Promise<TaskHistoryEntry[]> {
        try {
            const history = await prisma.taskHistory.findMany({
                where: {taskId},
                orderBy: {createdAt: 'desc'},
            });

            return history.map(h => ({
                id: h.id,
                taskId: h.taskId,
                action: h.action,
                previousStatus: h.previousStatus as TaskStatus | undefined,
                newStatus: h.newStatus as TaskStatus | undefined,
                details: h.details ? JSON.parse(h.details) : undefined,
                createdAt: h.createdAt,
            }));
        } catch (error) {
            logger.error('[TaskCaptureService] Failed to get task history', {error: String(error)});
            return [];
        }
    }

    /**
     * Delete task and all related data
     */
    async deleteTask(taskId: string): Promise<boolean> {
        try {
            await prisma.$transaction([
                prisma.taskHistory.deleteMany({where: {taskId}}),
                prisma.structuredTask.deleteMany({where: {capturedTaskId: taskId}}),
                prisma.capturedTask.delete({where: {id: taskId}}),
            ]);

            logger.info('[TaskCaptureService] Task deleted', {taskId});
            return true;
        } catch (error) {
            logger.error('[TaskCaptureService] Failed to delete task', {error: String(error)});
            return false;
        }
    }

    /**
     * Parse raw input to extract task information using LLM
     */
    async parseTaskInput(rawInput: string): Promise<{
        title: string;
        description: string;
        requirements: string[];
        constraints: string[];
        priority: TaskPriority;
    }> {
        logger.info('[TaskCaptureService] Parsing task input');

        // This is a placeholder for LLM-based parsing
        // In real implementation, this would call the LLM adapter
        const lines = rawInput.split('\n').filter(l => l.trim());
        
        return {
            title: lines[0] || 'Untitled Task',
            description: rawInput,
            requirements: lines.slice(1).filter(l => l.startsWith('- ') || l.startsWith('* ')),
            constraints: [],
            priority: this.estimatePriority(rawInput),
        };
    }

    private estimatePriority(input: string): TaskPriority {
        const lower = input.toLowerCase();
        if (lower.includes('urgent') || lower.includes('critical') || lower.includes('asap')) {
            return 'critical';
        }
        if (lower.includes('important') || lower.includes('high priority')) {
            return 'high';
        }
        if (lower.includes('low priority') || lower.includes('when possible')) {
            return 'low';
        }
        return 'medium';
    }

    private async createHistoryEntry(
        taskId: string,
        action: string,
        previousStatus?: TaskStatus,
        newStatus?: TaskStatus,
        details?: Record<string, unknown>
    ): Promise<void> {
        await prisma.taskHistory.create({
            data: {
                taskId,
                action,
                previousStatus,
                newStatus,
                details: details ? JSON.stringify(details) : null,
            },
        });
    }

    private mapToCapturedTask(task: {
        id: string;
        rawInput: string;
        sessionId: string;
        status: string;
        priority: string;
        createdAt: Date;
        updatedAt: Date;
        metadata: string | null;
    }): CapturedTask {
        return {
            id: task.id,
            rawInput: task.rawInput,
            sessionId: task.sessionId,
            status: task.status as TaskStatus,
            priority: task.priority as TaskPriority,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
            metadata: task.metadata ? JSON.parse(task.metadata) : undefined,
        };
    }

    private mapToStructuredTask(task: {
        id: string;
        title: string;
        description: string;
        requirements: string;
        constraints: string | null;
        acceptanceCriteria: string | null;
        capturedTaskId: string;
        status: string;
        priority: string;
        sessionId: string;
        createdAt: Date;
        updatedAt: Date;
    }): StructuredTask {
        return {
            id: task.id,
            title: task.title,
            description: task.description,
            requirements: JSON.parse(task.requirements),
            constraints: task.constraints ? JSON.parse(task.constraints) : undefined,
            acceptanceCriteria: task.acceptanceCriteria ? JSON.parse(task.acceptanceCriteria) : undefined,
            capturedTaskId: task.capturedTaskId,
            status: task.status as TaskStatus,
            priority: task.priority as TaskPriority,
            sessionId: task.sessionId,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
        };
    }
}

// Export singleton instance
export const taskCaptureService = TaskCaptureService.getInstance();
