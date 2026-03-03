/**
 * Tests for Task Capture Service
 */

import {describe, it, expect, beforeEach, vi} from 'vitest';
import {TaskCaptureService} from '../../src/services/task-capture.service.js';

// Mock Prisma
vi.mock('@prisma/client', () => ({
    PrismaClient: vi.fn().mockImplementation(() => ({
        capturedTask: {
            create: vi.fn().mockResolvedValue({
                id: 'task-1',
                rawInput: 'Test task',
                sessionId: 'session-1',
                status: 'pending',
                priority: 'medium',
                createdAt: new Date(),
                updatedAt: new Date(),
                metadata: null,
            }),
            findUnique: vi.fn().mockResolvedValue({
                id: 'task-1',
                rawInput: 'Test task',
                sessionId: 'session-1',
                status: 'pending',
                priority: 'medium',
                createdAt: new Date(),
                updatedAt: new Date(),
                metadata: null,
            }),
            findMany: vi.fn().mockResolvedValue([]),
            update: vi.fn().mockResolvedValue({
                id: 'task-1',
                rawInput: 'Test task',
                sessionId: 'session-1',
                status: 'in-progress',
                priority: 'medium',
                createdAt: new Date(),
                updatedAt: new Date(),
                metadata: null,
            }),
            delete: vi.fn().mockResolvedValue({}),
        },
        structuredTask: {
            create: vi.fn().mockResolvedValue({
                id: 'structured-1',
                title: 'Test Title',
                description: 'Test Description',
                requirements: '["req1", "req2"]',
                constraints: null,
                acceptanceCriteria: null,
                capturedTaskId: 'task-1',
                status: 'in-progress',
                priority: 'medium',
                sessionId: 'session-1',
                createdAt: new Date(),
                updatedAt: new Date(),
            }),
            findFirst: vi.fn().mockResolvedValue(null),
            updateMany: vi.fn().mockResolvedValue({count: 1}),
            deleteMany: vi.fn().mockResolvedValue({count: 1}),
        },
        taskHistory: {
            create: vi.fn().mockResolvedValue({}),
            findMany: vi.fn().mockResolvedValue([]),
            deleteMany: vi.fn().mockResolvedValue({count: 1}),
        },
        $transaction: vi.fn().mockResolvedValue([]),
    })),
}));

describe('TaskCaptureService', () => {
    let service: TaskCaptureService;

    beforeEach(() => {
        // Reset singleton
        (TaskCaptureService as unknown as {instance: TaskCaptureService | null}).instance = null;
        service = TaskCaptureService.getInstance();
    });

    describe('capture', () => {
        it('should capture a task successfully', async () => {
            const result = await service.capture({
                rawInput: 'Test task',
                sessionId: 'session-1',
            });

            expect(result).toBeDefined();
            expect(result.rawInput).toBe('Test task');
            expect(result.sessionId).toBe('session-1');
            expect(result.status).toBe('pending');
        });

        it('should capture with priority', async () => {
            const result = await service.capture({
                rawInput: 'High priority task',
                sessionId: 'session-1',
                priority: 'high',
            });

            expect(result.priority).toBe('high');
        });
    });

    describe('structure', () => {
        it('should structure a captured task', async () => {
            const result = await service.structure({
                capturedTaskId: 'task-1',
                title: 'Structured Title',
                description: 'Structured Description',
                requirements: ['req1', 'req2'],
            });

            expect(result).toBeDefined();
            expect(result.title).toBe('Test Title');
            expect(result.capturedTaskId).toBe('task-1');
        });
    });

    describe('parseTaskInput', () => {
        it('should parse simple input', async () => {
            const result = await service.parseTaskInput('Fix bug in login form');

            expect(result.title).toBe('Fix bug in login form');
            expect(result.description).toBe('Fix bug in login form');
        });

        it('should detect critical priority', async () => {
            const result = await service.parseTaskInput('URGENT: Fix production issue');

            expect(result.priority).toBe('critical');
        });

        it('should detect high priority', async () => {
            const result = await service.parseTaskInput('Important: Update documentation');

            expect(result.priority).toBe('high');
        });
    });
});
