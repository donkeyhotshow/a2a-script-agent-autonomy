/**
 * Task Decomposition Service
 * 
 * Основной сервис для разбиения задач на подзадачи
 */

import {logger} from '../../utils/logger.js';
import {PrismaClient} from '@prisma/client';
import type {StructuredTask} from './task-capture.service.js';

import {
    Subtask,
    SubtaskStatus,
    Step,
    StepStatus,
    Action,
    ActionStatus,
    DecompositionResult,
    ExecutionPlan,
    ExecutionPhase,
} from './types.js';

import {
    autoDecomposeTask,
    autoDecomposeSubtask,
    autoDecomposeStep,
    canParallelize,
    estimateStepsForSubtask,
} from './auto-decompose.js';

const prisma = new PrismaClient();

/**
 * Service for decomposing tasks into subtasks, steps, and actions
 */
export class TaskDecompositionService {
    private static instance: TaskDecompositionService;

    private constructor() {
        logger.info('[TaskDecompositionService] Initialized');
    }

    static getInstance(): TaskDecompositionService {
        if (!TaskDecompositionService.instance) {
            TaskDecompositionService.instance = new TaskDecompositionService();
        }
        return TaskDecompositionService.instance;
    }

    /**
     * Decompose a structured task into subtasks
     */
    async decomposeToSubtasks(
        task: StructuredTask,
        subtaskDefinitions?: Array<{
            title: string;
            description: string;
            order: number;
            estimatedDuration?: number;
            dependencies?: Array<{dependsOnOrder: number; type: import('./types.js').DependencyType}>;
        }>
    ): Promise<DecompositionResult> {
        logger.info('[TaskDecompositionService] Decomposing task to subtasks', {
            structuredTaskId: task.id,
        });

        try {
            let subtasksData: Array<{
                title: string;
                description: string;
                order: number;
                estimatedDuration?: number;
                dependencies?: Array<{dependsOnOrder: number; type: import('./types.js').DependencyType}>;
            }>;

            if (subtaskDefinitions) {
                subtasksData = subtaskDefinitions;
            } else {
                // Auto-decompose based on task description and requirements
                subtasksData = autoDecomposeTask(task);
            }

            const createdSubtasks: Subtask[] = [];

            // First pass: create all subtasks
            for (const data of subtasksData) {
                const subtask = await prisma.subtask.create({
                    data: {
                        title: data.title,
                        description: data.description,
                        structuredTaskId: task.id,
                        status: 'pending',
                        order: data.order,
                        estimatedDuration: data.estimatedDuration,
                    },
                });

                createdSubtasks.push({
                    ...subtask,
                    status: subtask.status as SubtaskStatus,
                    dependencies: [],
                });
            }

            // Second pass: create dependencies
            for (let i = 0; i < subtasksData.length; i++) {
                const data = subtasksData[i];
                if (data.dependencies && data.dependencies.length > 0) {
                    for (const dep of data.dependencies) {
                        const dependsOnSubtask = createdSubtasks.find(s => s.order === dep.dependsOnOrder);
                        if (dependsOnSubtask) {
                            await prisma.subtaskDependency.create({
                                data: {
                                    subtaskId: createdSubtasks[i].id,
                                    dependsOnSubtaskId: dependsOnSubtask.id,
                                    type: dep.type,
                                },
                            });
                        }
                    }
                }
            }

            // Reload subtasks with dependencies
            const subtasksWithDeps = await prisma.subtask.findMany({
                where: {structuredTaskId: task.id},
                include: {dependencies: true},
                orderBy: {order: 'asc'},
            });

            const totalDuration = createdSubtasks.reduce(
                (sum, s) => sum + (s.estimatedDuration || 0),
                0
            );

            const result: DecompositionResult = {
                subtasks: subtasksWithDeps.map(s => ({
                    id: s.id,
                    title: s.title,
                    description: s.description,
                    structuredTaskId: s.structuredTaskId,
                    status: s.status as SubtaskStatus,
                    order: s.order,
                    estimatedDuration: s.estimatedDuration || undefined,
                    createdAt: s.createdAt,
                    updatedAt: s.updatedAt,
                    dependencies: s.dependencies.map(d => ({
                        id: d.id,
                        subtaskId: d.subtaskId,
                        dependsOnSubtaskId: d.dependsOnSubtaskId,
                        type: d.type as import('./types.js').DependencyType,
                    })),
                })),
                totalEstimatedDuration: totalDuration,
                canParallelize: canParallelize(subtasksWithDeps),
            };

            logger.info('[TaskDecompositionService] Task decomposed', {
                subtaskCount: result.subtasks.length,
                totalDuration,
            });

            return result;
        } catch (error) {
            logger.error('[TaskDecompositionService] Failed to decompose task', {error: String(error)});
            throw new Error(`Failed to decompose task: ${String(error)}`);
        }
    }

    /**
     * Decompose a subtask into steps
     */
    async decomposeToSteps(
        subtask: Subtask,
        stepDefinitions?: Array<{
            title: string;
            description: string;
            order: number;
            estimatedDuration?: number;
        }>
    ): Promise<Step[]> {
        logger.info('[TaskDecompositionService] Decomposing subtask to steps', {subtaskId: subtask.id});

        try {
            let stepsData: Array<{
                title: string;
                description: string;
                order: number;
                estimatedDuration?: number;
            }>;

            if (stepDefinitions) {
                stepsData = stepDefinitions;
            } else {
                // Auto-decompose based on subtask description
                stepsData = autoDecomposeSubtask(subtask);
            }

            const createdSteps: Step[] = [];

            for (const data of stepsData) {
                const step = await prisma.step.create({
                    data: {
                        title: data.title,
                        description: data.description,
                        subtaskId: subtask.id,
                        status: 'pending',
                        order: data.order,
                        estimatedDuration: data.estimatedDuration,
                    },
                });

                createdSteps.push({
                    ...step,
                    status: step.status as StepStatus,
                });
            }

            logger.info('[TaskDecompositionService] Subtask decomposed', {
                subtaskId: subtask.id,
                stepCount: createdSteps.length,
            });

            return createdSteps;
        } catch (error) {
            logger.error('[TaskDecompositionService] Failed to decompose subtask', {error: String(error)});
            throw new Error(`Failed to decompose subtask: ${String(error)}`);
        }
    }

    /**
     * Decompose a step into actions
     */
    async decomposeToActions(
        step: Step,
        actionDefinitions?: Array<{
            type: string;
            description: string;
            order: number;
            input?: Record<string, unknown>;
        }>
    ): Promise<Action[]> {
        logger.info('[TaskDecompositionService] Decomposing step to actions', {stepId: step.id});

        try {
            let actionsData: Array<{
                type: string;
                description: string;
                order: number;
                input?: Record<string, unknown>;
            }>;

            if (actionDefinitions) {
                actionsData = actionDefinitions;
            } else {
                // Auto-decompose based on step description
                actionsData = autoDecomposeStep(step);
            }

            const createdActions: Action[] = [];

            for (const data of actionsData) {
                const action = await prisma.action.create({
                    data: {
                        type: data.type,
                        description: data.description,
                        stepId: step.id,
                        status: 'pending',
                        order: data.order,
                        input: data.input ? JSON.stringify(data.input) : null,
                    },
                });

                createdActions.push({
                    ...action,
                    status: action.status as ActionStatus,
                    input: data.input,
                });
            }

            logger.info('[TaskDecompositionService] Step decomposed', {
                stepId: step.id,
                actionCount: createdActions.length,
            });

            return createdActions;
        } catch (error) {
            logger.error('[TaskDecompositionService] Failed to decompose step', {error: String(error)});
            throw new Error(`Failed to decompose step: ${String(error)}`);
        }
    }

    /**
     * Generate execution plan based on dependencies
     */
    generateExecutionPlan(subtasks: Subtask[]): ExecutionPlan {
        logger.info('[TaskDecompositionService] Generating execution plan');

        const phases: ExecutionPhase[] = [];
        const completed = new Set<string>();
        const remaining = new Set(subtasks.map(s => s.id));

        while (remaining.size > 0) {
            const phaseNumber = phases.length + 1;
            const readySubtasks: string[] = [];

            for (const subtaskId of remaining) {
                const subtask = subtasks.find(s => s.id === subtaskId);
                if (!subtask) continue;

                // Check if all dependencies are completed
                const depsSatisfied = subtask.dependencies.every(
                    dep => dep.type !== 'requires' || completed.has(dep.dependsOnSubtaskId)
                );

                if (depsSatisfied) {
                    readySubtasks.push(subtaskId);
                }
            }

            if (readySubtasks.length === 0) {
                // Deadlock detected - dependencies cannot be satisfied
                logger.error('[TaskDecompositionService] Dependency deadlock detected');
                break;
            }

            const phaseSubtasks = subtasks.filter(s => readySubtasks.includes(s.id));
            const phaseDuration = phaseSubtasks.reduce(
                (sum, s) => sum + (s.estimatedDuration || 0),
                0
            );

            phases.push({
                phaseNumber,
                subtasks: readySubtasks,
                canRunInParallel: phaseSubtasks.every(s => 
                    s.dependencies.filter(d => d.type === 'requires').length === 0
                ),
                estimatedDuration: phaseDuration,
            });

            // Mark as completed and remove from remaining
            for (const id of readySubtasks) {
                completed.add(id);
                remaining.delete(id);
            }
        }

        const totalSteps = subtasks.reduce(
            (sum, s) => sum + (estimateStepsForSubtask(s) || 0),
            0
        );

        const plan: ExecutionPlan = {
            phases,
            totalSteps,
            estimatedTotalDuration: phases.reduce((sum, p) => sum + p.estimatedDuration, 0),
        };

        logger.info('[TaskDecompositionService] Execution plan generated', {
            phaseCount: phases.length,
            totalSteps,
        });

        return plan;
    }

    /**
     * Update subtask status
     */
    async updateSubtaskStatus(
        subtaskId: string,
        newStatus: SubtaskStatus
    ): Promise<Subtask> {
        const subtask = await prisma.subtask.update({
            where: {id: subtaskId},
            data: {
                status: newStatus,
                updatedAt: new Date(),
            },
            include: {dependencies: true},
        });

        return {
            ...subtask,
            status: subtask.status as SubtaskStatus,
            dependencies: subtask.dependencies.map(d => ({
                id: d.id,
                subtaskId: d.subtaskId,
                dependsOnSubtaskId: d.dependsOnSubtaskId,
                type: d.type as import('./types.js').DependencyType,
            })),
        };
    }

    /**
     * Update step status
     */
    async updateStepStatus(stepId: string, newStatus: StepStatus): Promise<Step> {
        const step = await prisma.step.update({
            where: {id: stepId},
            data: {
                status: newStatus,
                updatedAt: new Date(),
            },
        });

        return {
            ...step,
            status: step.status as StepStatus,
        };
    }

    /**
     * Update action status and result
     */
    async updateActionStatus(
        actionId: string,
        newStatus: ActionStatus,
        output?: Record<string, unknown>
    ): Promise<Action> {
        const action = await prisma.action.update({
            where: {id: actionId},
            data: {
                status: newStatus,
                output: output ? JSON.stringify(output) : undefined,
                updatedAt: new Date(),
            },
        });

        return {
            ...action,
            status: action.status as ActionStatus,
            input: action.input ? JSON.parse(action.input) : undefined,
            output: action.output ? JSON.parse(action.output) : undefined,
        };
    }

    /**
     * Get subtasks by structured task ID
     */
    async getSubtasks(structuredTaskId: string): Promise<Subtask[]> {
        const subtasks = await prisma.subtask.findMany({
            where: {structuredTaskId},
            include: {dependencies: true},
            orderBy: [{order: 'asc'}, {createdAt: 'asc'}],
        });

        return subtasks.map(s => ({
            id: s.id,
            title: s.title,
            description: s.description,
            structuredTaskId: s.structuredTaskId,
            status: s.status as SubtaskStatus,
            order: s.order,
            estimatedDuration: s.estimatedDuration || undefined,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
            dependencies: s.dependencies.map(d => ({
                id: d.id,
                subtaskId: d.subtaskId,
                dependsOnSubtaskId: d.dependsOnSubtaskId,
                type: d.type as import('./types.js').DependencyType,
            })),
        }));
    }

    /**
     * Get steps by subtask ID
     */
    async getSteps(subtaskId: string): Promise<Step[]> {
        const steps = await prisma.step.findMany({
            where: {subtaskId},
            orderBy: [{order: 'asc'}, {createdAt: 'asc'}],
        });

        return steps.map(s => ({
            ...s,
            status: s.status as StepStatus,
        }));
    }

    /**
     * Get actions by step ID
     */
    async getActions(stepId: string): Promise<Action[]> {
        const actions = await prisma.action.findMany({
            where: {stepId},
            orderBy: [{order: 'asc'}, {createdAt: 'asc'}],
        });

        return actions.map(a => ({
            ...a,
            status: a.status as ActionStatus,
            input: a.input ? JSON.parse(a.input) : undefined,
            output: a.output ? JSON.parse(a.output) : undefined,
        }));
    }
}

// Export singleton instance
export const taskDecompositionService = TaskDecompositionService.getInstance();
