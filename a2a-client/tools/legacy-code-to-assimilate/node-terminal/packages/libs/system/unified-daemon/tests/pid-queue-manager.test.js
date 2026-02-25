/**
 * PidQueueManager - Unit Tests
 * Тестирование менеджера очереди PID файлов
 */

const { PidQueueManager } = require('../src/PidQueueManager');
const { consoleUtils } = require('@libs/logging-monitoring/logging/console-utils');

// Mock dependencies
const mockPersistenceManager = {
    readPidData: jest.fn(),
    writePidData: jest.fn()
};

jest.mock('@libs/logging-monitoring/logging/console-utils', () => ({
    consoleUtils: {
        log: jest.fn(),
        error: jest.fn()
    }
}));

describe('PidQueueManager', () => {
    let queueManager;
    let initialPidData;

    beforeEach(() => {
        jest.clearAllMocks();
        queueManager = new PidQueueManager(mockPersistenceManager, consoleUtils);

        initialPidData = {
            version: "1.0",
            daemons: {},
            queue: { active: null, waiting: [], maxConcurrent: 1, processingOrder: [] },
            metadata: { totalDaemons: 0 }
        };
        mockPersistenceManager.readPidData.mockResolvedValue(initialPidData);
        mockPersistenceManager.writePidData.mockResolvedValue(true);
    });

    describe('Constructor', () => {
        test('should initialize with persistence manager and logger', () => {
            expect(queueManager.persistenceManager).toBe(mockPersistenceManager);
            expect(queueManager.logger).toBe(consoleUtils);
        });
    });

    describe('addToQueue', () => {
        test('should add a new ticket to the queue and update daemon status', async () => {
            const daemonName = 'test-daemon';
            const ticketId = 'ticket-123';
            const reason = 'limit_reached';

            initialPidData.daemons[daemonName] = {
                pid: null,
                ticketId: ticketId,
                status: 'pending',
                metadata: { created: new Date().toISOString() }
            };

            const result = await queueManager.addToQueue(ticketId, daemonName, reason);

            expect(result.position).toBe(1);
            expect(result.reason).toBe(reason);
            expect(mockPersistenceManager.writePidData).toHaveBeenCalledWith(expect.objectContaining({
                queue: expect.objectContaining({ waiting: [ticketId] }),
                daemons: expect.objectContaining({
                    [daemonName]: expect.objectContaining({
                        status: 'queued',
                        queuePosition: 1,
                        queueReason: reason
                    })
                })
            }));
            expect(consoleUtils.log).toHaveBeenCalledWith(`⏳ Тикет ${ticketId} добавлен в очередь (позиция: 1)`);
        });

        test('should not add duplicate tickets to the queue', async () => {
            const daemonName = 'test-daemon';
            const ticketId = 'ticket-123';

            initialPidData.daemons[daemonName] = {
                pid: null,
                ticketId: ticketId,
                status: 'pending',
                metadata: { created: new Date().toISOString() }
            };
            initialPidData.queue.waiting.push(ticketId);

            await queueManager.addToQueue(ticketId, daemonName);

            expect(initialPidData.queue.waiting).toEqual([ticketId]); // Should still only have one entry
            expect(mockPersistenceManager.writePidData).toHaveBeenCalledWith(expect.objectContaining({
                queue: expect.objectContaining({ waiting: [ticketId] })
            }));
        });

        test('should handle errors during add to queue', async () => {
            const error = new Error('Write failed');
            mockPersistenceManager.readPidData.mockRejectedValue(error);

            await expect(queueManager.addToQueue('ticket-123', 'test-daemon')).rejects.toThrow(error);
            expect(consoleUtils.error).toHaveBeenCalledWith('❌ Ошибка добавления в очередь:', error);
        });
    });

    describe('removeFromQueue', () => {
        beforeEach(() => {
            initialPidData.queue.waiting = ['ticket-123', 'ticket-456'];
            initialPidData.daemons['daemon1'] = { ticketId: 'ticket-123', status: 'queued', queuePosition: 1 };
            initialPidData.daemons['daemon2'] = { ticketId: 'ticket-456', status: 'queued', queuePosition: 2 };
        });

        test('should remove a ticket from the queue and update daemon positions', async () => {
            const result = await queueManager.removeFromQueue('ticket-123');

            expect(result).toBe(true);
            expect(mockPersistenceManager.writePidData).toHaveBeenCalledWith(expect.objectContaining({
                queue: expect.objectContaining({ waiting: ['ticket-456'] }),
                 daemons: expect.objectContaining({
                     'daemon1': expect.objectContaining({
                         status: 'queued',
                         ticketId: 'ticket-123'
                         // queuePosition, waitingSince, queueReason are not deleted for daemon1
                         // because it's not in the waiting queue anymore
                     }),
                     'daemon2': expect.objectContaining({
                         queuePosition: 1,
                         ticketId: 'ticket-456'
                     })
                 })
            }));
            expect(consoleUtils.log).toHaveBeenCalledWith('✅ Тикет ticket-123 удален из очереди');
        });

        test('should return false if ticket not found in queue', async () => {
            const result = await queueManager.removeFromQueue('non-existent');
            expect(result).toBe(false);
            expect(mockPersistenceManager.writePidData).not.toHaveBeenCalled();
        });

        test('should handle errors during remove from queue', async () => {
            const error = new Error('Write failed');
            mockPersistenceManager.readPidData.mockRejectedValue(error);

            await expect(queueManager.removeFromQueue('ticket-123')).rejects.toThrow(error);
            expect(consoleUtils.error).toHaveBeenCalledWith('❌ Ошибка удаления из очереди:', error);
        });
    });

    describe('getNextFromQueue', () => {
        test('should return the next ticket and daemon info from queue', async () => {
            initialPidData.queue.waiting = ['ticket-123', 'ticket-456'];
            initialPidData.daemons['test-daemon'] = { ticketId: 'ticket-123', status: 'queued' };

            const result = await queueManager.getNextFromQueue();

            expect(result.ticketId).toBe('ticket-123');
            expect(result.daemonName).toBe('test-daemon');
            expect(result.daemonInfo).toEqual({ ticketId: 'ticket-123', status: 'queued' });
        });

        test('should return null if queue is empty', async () => {
            const result = await queueManager.getNextFromQueue();
            expect(result).toBeNull();
        });

        test('should return null if daemon associated with ticket not found', async () => {
            initialPidData.queue.waiting = ['ticket-123'];
            // No daemon with ticket-123 in initialPidData.daemons

            const result = await queueManager.getNextFromQueue();
            expect(result).toBeNull();
        });

        test('should handle errors during get next from queue', async () => {
            const error = new Error('Read failed');
            mockPersistenceManager.readPidData.mockRejectedValue(error);

            const result = await queueManager.getNextFromQueue();
            expect(result).toBeNull();
            expect(consoleUtils.error).toHaveBeenCalledWith('❌ Ошибка получения следующего тикета из очереди:', error);
        });
    });

    describe('canStartDaemon', () => {
        test('should return true if daemon can start (not running, limit not reached)', async () => {
            initialPidData.daemons['daemon1'] = { status: 'stopped' };
            initialPidData.queue.maxConcurrent = 2;

            const result = await queueManager.canStartDaemon('new-daemon');
            expect(result.canStart).toBe(true);
        });

        test('should return false if daemon is already running', async () => {
            initialPidData.daemons['running-daemon'] = { pid: 123, status: 'running', ticketId: 'ticket-abc' };

            const result = await queueManager.canStartDaemon('running-daemon');
            expect(result.canStart).toBe(false);
            expect(result.reason).toBe('already_running');
            expect(result.existingPid).toBe(123);
            expect(result.existingTicketId).toBe('ticket-abc');
        });

        test('should return false if max concurrent limit reached', async () => {
            initialPidData.daemons['daemon1'] = { status: 'running' };
            initialPidData.daemons['daemon2'] = { status: 'running' };
            initialPidData.queue.maxConcurrent = 2;

            const result = await queueManager.canStartDaemon('new-daemon');
            expect(result.canStart).toBe(false);
            expect(result.reason).toBe('limit_reached');
            expect(result.runningCount).toBe(2);
            expect(result.maxConcurrent).toBe(2);
        });

        test('should handle errors during canStartDaemon check', async () => {
            const error = new Error('Read failed');
            mockPersistenceManager.readPidData.mockRejectedValue(error);

            const result = await queueManager.canStartDaemon('test-daemon');
            expect(result.canStart).toBe(false);
            expect(result.reason).toBe('error');
            expect(result.error).toBe(error.message);
            expect(consoleUtils.error).toHaveBeenCalledWith('❌ Ошибка проверки возможности запуска:', error);
        });
    });

    describe('getQueueInfo', () => {
        test('should return detailed queue information', async () => {
            initialPidData.queue = {
                active: 'ticket-active',
                waiting: ['ticket-1', 'ticket-2'],
                maxConcurrent: 5,
                processingOrder: ['ticket-active', 'ticket-1', 'ticket-2']
            };

            const result = await queueManager.getQueueInfo();

            expect(result.active).toBe('ticket-active');
            expect(result.waiting).toEqual(['ticket-1', 'ticket-2']);
            expect(result.maxConcurrent).toBe(5);
            expect(result.processingOrder).toEqual(['ticket-active', 'ticket-1', 'ticket-2']);
            expect(result.stats.totalWaiting).toBe(2);
            expect(result.stats.activeCount).toBe(1);
        });

        test('should return correct activeCount when no active daemon', async () => {
            initialPidData.queue.active = null;
            initialPidData.queue.waiting = ['ticket-1'];

            const result = await queueManager.getQueueInfo();
            expect(result.stats.activeCount).toBe(0);
        });

        test('should handle errors during getQueueInfo', async () => {
            const error = new Error('Read failed');
            mockPersistenceManager.readPidData.mockRejectedValue(error);

            const result = await queueManager.getQueueInfo();
            expect(result).toBeNull();
            expect(consoleUtils.error).toHaveBeenCalledWith('❌ Ошибка получения информации об очереди:', error);
        });
    });
});
