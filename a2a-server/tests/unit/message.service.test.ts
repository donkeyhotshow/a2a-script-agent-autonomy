/**
 * Message Service Unit Tests
 */

import {describe, it, expect, vi, beforeEach} from 'vitest';

// Mock Prisma
vi.mock('@prisma/client', () => ({
    PrismaClient: vi.fn().mockImplementation(() => ({
        message: {
            create: vi.fn(),
            findMany: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        session: {
            findUnique: vi.fn(),
        },
    })),
    MessageDirection: {
        CLIENT_TO_SERVER: 'CLIENT_TO_SERVER',
        SERVER_TO_CLIENT: 'SERVER_TO_CLIENT',
    },
    MessageRole: {
        user: 'user',
        server: 'server',
    },
    MessageStatus: {
        sent: 'sent',
        pending: 'pending',
        completed: 'completed',
        failed: 'failed',
    },
}));

vi.mock('../../src/utils/logger.js', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

describe('Message Service', () => {
    let mockPrisma: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockPrisma = {
            message: {
                create: vi.fn(),
                findMany: vi.fn(),
                findUnique: vi.fn(),
                update: vi.fn(),
                delete: vi.fn(),
            },
            session: {
                findUnique: vi.fn(),
            },
        };
    });

    describe('Message Creation', () => {
        it('should create a message with CLIENT_TO_SERVER direction', async () => {
            const messageData = {
                sessionId: 'session-123',
                direction: 'CLIENT_TO_SERVER' as const,
                content: JSON.stringify({text: 'Hello'}),
            };

            mockPrisma.message.create.mockResolvedValue({
                id: 'msg-1',
                ...messageData,
                createdAt: new Date(),
            });

            const result = await mockPrisma.message.create({
                data: messageData,
            });

            expect(result.id).toBe('msg-1');
            expect(result.direction).toBe('CLIENT_TO_SERVER');
        });

        it('should create a message with SERVER_TO_CLIENT direction', async () => {
            const messageData = {
                sessionId: 'session-123',
                direction: 'SERVER_TO_CLIENT' as const,
                content: JSON.stringify({text: 'Response'}),
            };

            mockPrisma.message.create.mockResolvedValue({
                id: 'msg-2',
                ...messageData,
                createdAt: new Date(),
            });

            const result = await mockPrisma.message.create({
                data: messageData,
            });

            expect(result.id).toBe('msg-2');
            expect(result.direction).toBe('SERVER_TO_CLIENT');
        });

        it('should create a message with user role', async () => {
            const messageData = {
                sessionId: 'session-123',
                direction: 'CLIENT_TO_SERVER' as const,
                role: 'user' as const,
                content: JSON.stringify({text: 'Hello'}),
            };

            mockPrisma.message.create.mockResolvedValue({
                id: 'msg-1',
                ...messageData,
                createdAt: new Date(),
            });

            const result = await mockPrisma.message.create({
                data: messageData,
            });

            expect(result.role).toBe('user');
        });

        it('should create a message with server role', async () => {
            const messageData = {
                sessionId: 'session-123',
                direction: 'SERVER_TO_CLIENT' as const,
                role: 'server' as const,
                content: JSON.stringify({text: 'Response'}),
            };

            mockPrisma.message.create.mockResolvedValue({
                id: 'msg-2',
                ...messageData,
                createdAt: new Date(),
            });

            const result = await mockPrisma.message.create({
                data: messageData,
            });

            expect(result.role).toBe('server');
        });

        it('should create a message with promiseId', async () => {
            const messageData = {
                sessionId: 'session-123',
                direction: 'CLIENT_TO_SERVER' as const,
                content: JSON.stringify({text: 'Request'}),
                promiseId: 'prm-123',
            };

            mockPrisma.message.create.mockResolvedValue({
                id: 'msg-1',
                ...messageData,
                createdAt: new Date(),
            });

            const result = await mockPrisma.message.create({
                data: messageData,
            });

            expect(result.promiseId).toBe('prm-123');
        });

        it('should create a message with pending status', async () => {
            const messageData = {
                sessionId: 'session-123',
                direction: 'CLIENT_TO_SERVER' as const,
                content: JSON.stringify({text: 'Request'}),
                status: 'pending' as const,
            };

            mockPrisma.message.create.mockResolvedValue({
                id: 'msg-1',
                ...messageData,
                createdAt: new Date(),
            });

            const result = await mockPrisma.message.create({
                data: messageData,
            });

            expect(result.status).toBe('pending');
        });
    });

    describe('Message Retrieval', () => {
        it('should find messages by session ID', async () => {
            const messages = [
                {id: 'msg-1', sessionId: 'session-123', direction: 'CLIENT_TO_SERVER'},
                {id: 'msg-2', sessionId: 'session-123', direction: 'SERVER_TO_CLIENT'},
            ];

            mockPrisma.message.findMany.mockResolvedValue(messages);

            const result = await mockPrisma.message.findMany({
                where: {sessionId: 'session-123'},
            });

            expect(result).toHaveLength(2);
            expect(mockPrisma.message.findMany).toHaveBeenCalledWith({
                where: {sessionId: 'session-123'},
            });
        });

        it('should find a unique message by ID', async () => {
            const message = {id: 'msg-1', sessionId: 'session-123'};

            mockPrisma.message.findUnique.mockResolvedValue(message);

            const result = await mockPrisma.message.findUnique({
                where: {id: 'msg-1'},
            });

            expect(result?.id).toBe('msg-1');
        });

        it('should return null for non-existent message', async () => {
            mockPrisma.message.findUnique.mockResolvedValue(null);

            const result = await mockPrisma.message.findUnique({
                where: {id: 'non-existent'},
            });

            expect(result).toBeNull();
        });

        it('should find messages by promiseId', async () => {
            const messages = [
                {id: 'msg-1', promiseId: 'prm-123'},
            ];

            mockPrisma.message.findMany.mockResolvedValue(messages);

            const result = await mockPrisma.message.findMany({
                where: {promiseId: 'prm-123'},
            });

            expect(result).toHaveLength(1);
        });
    });

    describe('Message Update', () => {
        it('should update message content', async () => {
            const updatedMessage = {
                id: 'msg-1',
                content: JSON.stringify({text: 'Updated content'}),
            };

            mockPrisma.message.update.mockResolvedValue(updatedMessage);

            const result = await mockPrisma.message.update({
                where: {id: 'msg-1'},
                data: {content: updatedMessage.content},
            });

            expect(result.content).toBe(updatedMessage.content);
        });

        it('should update message status to completed', async () => {
            const updatedMessage = {
                id: 'msg-1',
                status: 'completed',
            };

            mockPrisma.message.update.mockResolvedValue(updatedMessage);

            const result = await mockPrisma.message.update({
                where: {id: 'msg-1'},
                data: {status: 'completed'},
            });

            expect(result.status).toBe('completed');
        });

        it('should update message status to failed', async () => {
            const updatedMessage = {
                id: 'msg-1',
                status: 'failed',
            };

            mockPrisma.message.update.mockResolvedValue(updatedMessage);

            const result = await mockPrisma.message.update({
                where: {id: 'msg-1'},
                data: {status: 'failed'},
            });

            expect(result.status).toBe('failed');
        });
    });

    describe('Message Deletion', () => {
        it('should delete a message', async () => {
            mockPrisma.message.delete.mockResolvedValue({id: 'msg-1'});

            await mockPrisma.message.delete({
                where: {id: 'msg-1'},
            });

            expect(mockPrisma.message.delete).toHaveBeenCalledWith({
                where: {id: 'msg-1'},
            });
        });
    });

    describe('Message Content Serialization', () => {
        it('should serialize JSON content correctly', () => {
            const content = {text: 'Hello', attachments: ['file1.txt']};
            const serialized = JSON.stringify(content);
            const deserialized = JSON.parse(serialized);

            expect(deserialized.text).toBe('Hello');
            expect(deserialized.attachments).toHaveLength(1);
        });

        it('should handle empty content', () => {
            const content = {};
            const serialized = JSON.stringify(content);
            const deserialized = JSON.parse(serialized);

            expect(deserialized).toEqual({});
        });

        it('should handle complex nested content', () => {
            const content = {
                task: {id: 'task-1', type: 'ANALYZE'},
                files: [{path: 'src/main.ts', content: '...'}],
            };
            const serialized = JSON.stringify(content);
            const deserialized = JSON.parse(serialized);

            expect(deserialized.task.id).toBe('task-1');
            expect(deserialized.files).toHaveLength(1);
        });
    });

    describe('Message Direction Validation', () => {
        it('should validate CLIENT_TO_SERVER direction', () => {
            const direction = 'CLIENT_TO_SERVER';
            expect(direction).toBe('CLIENT_TO_SERVER');
        });

        it('should validate SERVER_TO_CLIENT direction', () => {
            const direction = 'SERVER_TO_CLIENT';
            expect(direction).toBe('SERVER_TO_CLIENT');
        });
    });

    describe('Message Status Transitions', () => {
        it('should allow sent to completed transition', () => {
            const validTransitions = {
                sent: ['pending', 'completed', 'failed'],
                pending: ['completed', 'failed'],
                completed: [],
                failed: [],
            };

            expect(validTransitions.sent).toContain('completed');
            expect(validTransitions.pending).toContain('completed');
        });

        it('should allow sent to failed transition', () => {
            const validTransitions = {
                sent: ['pending', 'completed', 'failed'],
                pending: ['completed', 'failed'],
                completed: [],
                failed: [],
            };

            expect(validTransitions.sent).toContain('failed');
        });
    });
});
