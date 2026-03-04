/**
 * Session Log and Message Projection Tests
 * Tests for the session logging and message projection functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
    SessionLogService, 
    sessionLogService,
    MessageProjectionService,
    messageProjectionService,
    LogLevel,
    ProjectionType
} from '../../src/services/core/session/session-log.service.js';

// Mock PrismaClient
vi.mock('@prisma/client', () => ({
    PrismaClient: vi.fn().mockImplementation(() => ({
        $executeRaw: vi.fn().mockResolvedValue(1),
        $queryRaw: vi.fn().mockResolvedValue([]),
        message: {
            findMany: vi.fn().mockResolvedValue([]),
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
    },
}));

// Mock logger
vi.mock('../../src/services/utils/logger.js', () => ({
    logger: {
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

describe('SessionLogService', () => {
    let sessionLog: SessionLogService;

    beforeEach(() => {
        sessionLog = new SessionLogService();
    });

    describe('createLog', () => {
        it('should create a log entry with all fields', async () => {
            const input = {
                sessionId: 'test-session-1',
                level: 'info' as LogLevel,
                message: 'Test message',
                context: { key: 'value' },
            };

            const result = await sessionLog.createLog(input);

            expect(result).toHaveProperty('id');
            expect(result.sessionId).toBe(input.sessionId);
            expect(result.level).toBe(input.level);
            expect(result.message).toBe(input.message);
            expect(result.context).toEqual(input.context);
            expect(result.timestamp).toBeInstanceOf(Date);
        });

        it('should create log entry without context', async () => {
            const input = {
                sessionId: 'test-session-2',
                level: 'error' as LogLevel,
                message: 'Error occurred',
            };

            const result = await sessionLog.createLog(input);

            expect(result.sessionId).toBe(input.sessionId);
            expect(result.message).toBe(input.message);
            expect(result.context).toBeUndefined();
        });
    });

    describe('log levels', () => {
        it('should create info log', async () => {
            const result = await sessionLog.info('session-1', 'Info message');
            expect(result.level).toBe('info');
        });

        it('should create debug log', async () => {
            const result = await sessionLog.debug('session-1', 'Debug message');
            expect(result.level).toBe('debug');
        });

        it('should create warn log', async () => {
            const result = await sessionLog.warn('session-1', 'Warning message');
            expect(result.level).toBe('warn');
        });

        it('should create error log', async () => {
            const result = await sessionLog.error('session-1', 'Error message');
            expect(result.level).toBe('error');
        });
    });

    describe('getLogs', () => {
        it('should return logs for a session', async () => {
            const logs = await sessionLog.getLogs('session-1');
            expect(Array.isArray(logs)).toBe(true);
        });

        it('should respect limit and offset', async () => {
            const logs = await sessionLog.getLogs('session-1', { 
                limit: 10, 
                offset: 5 
            });
            expect(Array.isArray(logs)).toBe(true);
        });

        it('should filter by log level', async () => {
            const logs = await sessionLog.getLogs('session-1', { 
                level: 'error' 
            });
            expect(Array.isArray(logs)).toBe(true);
        });
    });
});

describe('MessageProjectionService', () => {
    let projection: MessageProjectionService;

    beforeEach(() => {
        projection = new MessageProjectionService();
    });

    describe('projectMessage', () => {
        it('should project message to minimal format', () => {
            const message = {
                id: 'msg-1',
                sessionId: 'session-1',
                direction: 'SERVER_TO_CLIENT' as const,
                role: 'server' as const,
                content: { message: 'Hello world' },
                contentText: 'Hello world',
                createdAt: new Date(),
            };

            const result = projection.projectMessage(message, 'minimal');

            expect(result.id).toBe(message.id);
            expect(result.projectedContent).toBe('Hello world');
            expect(result.projectionType).toBe('minimal');
        });

        it('should project message to summary format', () => {
            const message = {
                id: 'msg-2',
                sessionId: 'session-1',
                direction: 'CLIENT_TO_SERVER' as const,
                role: 'user' as const,
                content: { message: 'A'.repeat(200) },
                contentText: 'A'.repeat(200),
                createdAt: new Date(),
            };

            const result = projection.projectMessage(message, 'summary');

            expect(result.projectedContent.length).toBeLessThan(200);
            expect(result.projectedContent).toContain('...');
            expect(result.projectionType).toBe('summary');
        });

        it('should project message to full format', () => {
            const message = {
                id: 'msg-3',
                sessionId: 'session-1',
                direction: 'SERVER_TO_CLIENT' as const,
                role: 'server' as const,
                content: { key: 'value', nested: { deep: true } },
                contentText: null,
                createdAt: new Date(),
            };

            const result = projection.projectMessage(message, 'full');

            expect(result.projectionType).toBe('full');
            expect(result.projectedContent).toContain('key');
            expect(result.projectedContent).toContain('value');
        });

        it('should extract content from content field if contentText is null', () => {
            const message = {
                id: 'msg-4',
                sessionId: 'session-1',
                direction: 'SERVER_TO_CLIENT' as const,
                role: 'server' as const,
                content: { message: 'Extracted from content' },
                contentText: null,
                createdAt: new Date(),
            };

            const result = projection.projectMessage(message, 'minimal');

            expect(result.projectedContent).toBe('Extracted from content');
        });
    });

    describe('projectMessages', () => {
        it('should project multiple messages', () => {
            const messages = [
                {
                    id: 'msg-1',
                    sessionId: 'session-1',
                    direction: 'SERVER_TO_CLIENT' as const,
                    role: 'server' as const,
                    content: { message: 'Message 1' },
                    contentText: 'Message 1',
                    createdAt: new Date(),
                },
                {
                    id: 'msg-2',
                    sessionId: 'session-1',
                    direction: 'CLIENT_TO_SERVER' as const,
                    role: 'user' as const,
                    content: { message: 'Message 2' },
                    contentText: 'Message 2',
                    createdAt: new Date(),
                },
            ];

            const results = projection.projectMessages(messages, 'detail');

            expect(results).toHaveLength(2);
            expect(results[0].id).toBe('msg-1');
            expect(results[1].id).toBe('msg-2');
        });
    });
});

describe('Singleton exports', () => {
    it('should have sessionLogService instance', () => {
        expect(sessionLogService).toBeInstanceOf(SessionLogService);
    });

    it('should have messageProjectionService instance', () => {
        expect(messageProjectionService).toBeInstanceOf(MessageProjectionService);
    });
});
