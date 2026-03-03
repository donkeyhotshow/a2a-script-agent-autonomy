/**
 * Tests for Task Decomposition Service
 */

import {describe, it, expect, beforeEach, vi} from 'vitest';
import {TaskDecompositionService} from '../../src/services/task-decomposition.service.js';

// Mock Prisma
vi.mock('@prisma/client', () => ({
    PrismaClient: vi.fn().mockImplementation(() => ({
        subtask: {
            create: vi.fn().mockImplementation((args) => ({
                id: `subtask-${Date.now()}`,
                ...args.data,
                createdAt: new Date(),
                updatedAt: new Date(),
            })),
            findMany: vi.fn().mockResolvedValue([]),
            update: vi.fn().mockImplementation((args) => ({
                id: args.where.id,
                title: 'Test Subtask',
                description: 'Test Description',
                structuredTaskId: 'structured-1',
                status: args.data.status,
                order: 1,
                estimatedDuration: 30,
                createdAt: new Date(),
                updatedAt: new Date(),
                dependencies: [],
            })),
        },
        subtaskDependency: {
            create: vi.fn().mockResolvedValue({}),
        },
        step: {
            create: vi.fn().mockImplementation((args) => ({
                id: `step-${Date.now()}`,
                ...args.data,
                createdAt: new Date(),
                updatedAt: new Date(),
            })),
            findMany: vi.fn().mockResolvedValue([]),
            update: vi.fn().mockImplementation((args) => ({
                id: args.where.id,
                title: 'Test Step',
                description: 'Test Description',
                subtaskId: 'subtask-1',
                status: args.data.status,
                order: 1,
                estimatedDuration: 15,
                createdAt: new Date(),
                updatedAt: new Date(),
            })),
        },
        action: {
            create: vi.fn().mockImplementation((args) => ({
                id: `action-${Date.now()}`,
                ...args.data,
                createdAt: new Date(),
                updatedAt: new Date(),
            })),
            findMany: vi.fn().mockResolvedValue([]),
            update: vi.fn().mockImplementation((args) => ({
                id: args.where.id,
                type: 'read-file',
                description: 'Test Action',
                stepId: 'step-1',
                status: args.data.status,
                order: 1,
                input: null,
                output: args.data.output || null,
                createdAt: new Date(),
                updatedAt: new Date(),
            })),
        },
    })),
}));

describe('TaskDecompositionService', () => {
    let service: TaskDecompositionService;

    beforeEach(() => {
        // Reset singleton
        (TaskDecompositionService as unknown as {instance: TaskDecompositionService | null}).instance = null;
        service = TaskDecompositionService.getInstance();
    });

    describe('decomposeToSubtasks', () => {
        it('should decompose task with auto-decomposition', async () => {
            const task = {
                id: 'structured-1',
                title: 'Test Task',
                description: 'Test Description',
                requirements: ['Requirement 1', 'Requirement 2'],
                capturedTaskId: 'task-1',
                status: 'pending' as const,
                priority: 'medium' as const,
                sessionId: 'session-1',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const result = await service.decomposeToSubtasks(task);

            expect(result).toBeDefined();
            expect(result.subtasks).toBeDefined();
            expect(result.canParallelize).toBeDefined();
        });

        it('should decompose task with custom subtasks', async () => {
            const task = {
                id: 'structured-1',
                title: 'Test Task',
                description: 'Test Description',
                requirements: [],
                capturedTaskId: 'task-1',
                status: 'pending' as const,
                priority: 'medium' as const,
                sessionId: 'session-1',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const result = await service.decomposeToSubtasks(task, [
                {
                    title: 'Subtask 1',
                    description: 'First subtask',
                    order: 1,
                    estimatedDuration: 30,
                },
                {
                    title: 'Subtask 2',
                    description: 'Second subtask',
                    order: 2,
                    estimatedDuration: 45,
                    dependencies: [{dependsOnOrder: 1, type: 'requires'}],
                },
            ]);

            expect(result).toBeDefined();
            expect(result.subtasks.length).toBe(2);
        });
    });

    describe('generateExecutionPlan', () => {
        it('should generate plan for independent subtasks', () => {
            const subtasks = [
                {
                    id: 'subtask-1',
                    title: 'Task 1',
                    description: 'Description 1',
                    structuredTaskId: 'structured-1',
                    status: 'pending' as const,
                    order: 1,
                    estimatedDuration: 30,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    dependencies: [],
                },
                {
                    id: 'subtask-2',
                    title: 'Task 2',
                    description: 'Description 2',
                    structuredTaskId: 'structured-1',
                    status: 'pending' as const,
                    order: 2,
                    estimatedDuration: 20,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    dependencies: [],
                },
            ];

            const plan = service.generateExecutionPlan(subtasks);

            expect(plan).toBeDefined();
            expect(plan.phases.length).toBeGreaterThan(0);
            expect(plan.totalSteps).toBeGreaterThan(0);
        });

        it('should handle dependent subtasks', () => {
            const subtasks = [
                {
                    id: 'subtask-1',
                    title: 'Task 1',
                    description: 'Description 1',
                    structuredTaskId: 'structured-1',
                    status: 'pending' as const,
                    order: 1,
                    estimatedDuration: 30,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    dependencies: [],
                },
                {
                    id: 'subtask-2',
                    title: 'Task 2',
                    description: 'Description 2',
                    structuredTaskId: 'structured-1',
                    status: 'pending' as const,
                    order: 2,
                    estimatedDuration: 20,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    dependencies: [
                        {
                            id: 'dep-1',
                            subtaskId: 'subtask-2',
                            dependsOnSubtaskId: 'subtask-1',
                            type: 'requires' as const,
                        },
                    ],
                },
            ];

            const plan = service.generateExecutionPlan(subtasks);

            expect(plan).toBeDefined();
            expect(plan.phases.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('updateSubtaskStatus', () => {
        it('should update subtask status', async () => {
            const result = await service.updateSubtaskStatus('subtask-1', 'in-progress');

            expect(result).toBeDefined();
            expect(result.status).toBe('in-progress');
        });
    });

    describe('updateStepStatus', () => {
        it('should update step status', async () => {
            const result = await service.updateStepStatus('step-1', 'completed');

            expect(result).toBeDefined();
            expect(result.status).toBe('completed');
        });
    });

    describe('updateActionStatus', () => {
        it('should update action status with output', async () => {
            const output = {result: 'success'};
            const result = await service.updateActionStatus('action-1', 'completed', output);

            expect(result).toBeDefined();
            expect(result.status).toBe('completed');
        });
    });
});
