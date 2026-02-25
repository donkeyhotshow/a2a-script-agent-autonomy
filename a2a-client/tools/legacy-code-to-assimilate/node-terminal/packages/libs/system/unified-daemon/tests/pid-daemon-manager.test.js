/**
 * PidDaemonManager - Unit Tests
 * Тестирование менеджера демонов PID файлов
 */

const { PidDaemonManager } = require('../src/PidDaemonManager');
const { consoleUtils } = require('@libs/logging-monitoring/logging/console-utils');
const { spawn } = require('child_process');

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

jest.mock('child_process', () => ({
    spawn: jest.fn()
}));

describe('PidDaemonManager', () => {
    let daemonManager;

    beforeEach(() => {
        jest.clearAllMocks();
        daemonManager = new PidDaemonManager(mockPersistenceManager, consoleUtils);
    });

    describe('Constructor', () => {
        test('should initialize with persistence manager and logger', () => {
            expect(daemonManager.persistenceManager).toBe(mockPersistenceManager);
            expect(daemonManager.logger).toBe(consoleUtils);
        });
    });

    describe('validateRunningProcesses', () => {
        test('should mark dead processes as failed and update persistence', async () => {
            const initialDaemons = {
                'test-daemon': { pid: 1234, status: 'running' },
                'another-daemon': { pid: 5678, status: 'running' }
            };
            const currentPidData = { daemons: initialDaemons };

            mockPersistenceManager.readPidData.mockResolvedValue(currentPidData);
            mockPersistenceManager.writePidData.mockResolvedValue(true);

            daemonManager.isProcessAlive = jest.fn()
                .mockResolvedValueOnce(false) // test-daemon is dead
                .mockResolvedValueOnce(true);  // another-daemon is alive

            const updatedDaemons = await daemonManager.validateRunningProcesses(initialDaemons);

            expect(daemonManager.isProcessAlive).toHaveBeenCalledWith(1234);
            expect(daemonManager.isProcessAlive).toHaveBeenCalledWith(5678);
            expect(updatedDaemons['test-daemon'].status).toBe('failed');
            expect(updatedDaemons['test-daemon'].reason).toBe('process_died');
            expect(updatedDaemons['another-daemon'].status).toBe('running');
            expect(consoleUtils.log).toHaveBeenCalledWith('⚠️ Процесс test-daemon (PID: 1234) не отвечает');
            expect(mockPersistenceManager.writePidData).toHaveBeenCalledWith(expect.objectContaining({
                daemons: expect.objectContaining({
                    'test-daemon': expect.objectContaining({ status: 'failed' })
                })
            }));
        });

        test('should not update persistence if no changes', async () => {
            const initialDaemons = {
                'test-daemon': { pid: 1234, status: 'running' }
            };
            mockPersistenceManager.readPidData.mockResolvedValue({ daemons: initialDaemons });
            daemonManager.isProcessAlive = jest.fn().mockResolvedValue(true);

            await daemonManager.validateRunningProcesses(initialDaemons);

            expect(mockPersistenceManager.writePidData).not.toHaveBeenCalled();
        });

        test('should not validate non-running daemons', async () => {
            const initialDaemons = {
                'pending-daemon': { pid: null, status: 'pending' },
                'failed-daemon': { pid: 9999, status: 'failed' }
            };
            mockPersistenceManager.readPidData.mockResolvedValue({ daemons: initialDaemons });
            daemonManager.isProcessAlive = jest.fn();

            await daemonManager.validateRunningProcesses(initialDaemons);

            expect(daemonManager.isProcessAlive).not.toHaveBeenCalled();
            expect(mockPersistenceManager.writePidData).not.toHaveBeenCalled();
        });

        test('should handle errors during process validation', async () => {
            const error = new Error('Validation error');
            const initialDaemons = {
                'test-daemon': { pid: 1234, status: 'running' }
            };
            mockPersistenceManager.readPidData.mockRejectedValue(error);

            await expect(daemonManager.validateRunningProcesses(initialDaemons)).rejects.toThrow(error);
            expect(consoleUtils.error).not.toHaveBeenCalled(); // Error handled by higher level
        });

        test('should handle spawn errors in isProcessAlive', async () => {
            // Mock spawn to throw an error
            spawn.mockImplementation(() => {
                throw new Error('Spawn error');
            });

            const result = await daemonManager.isProcessAlive(1234);
            expect(result).toBe(false);
            expect(spawn).toHaveBeenCalledWith('powershell', ['-Command', 'Get-Process -Id 1234 -ErrorAction SilentlyContinue'], expect.any(Object));
        });
    });

    describe('isProcessAlive', () => {
        test('should return true if process is alive (powershell exit code 0)', async () => {
            spawn.mockImplementation(() => ({
                on: (event, callback) => {
                    if (event === 'close') callback(0);
                },
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() }
            }));

            const result = await daemonManager.isProcessAlive(1234);
            expect(result).toBe(true);
            expect(spawn).toHaveBeenCalledWith('powershell', ['-Command', 'Get-Process -Id 1234 -ErrorAction SilentlyContinue'], expect.any(Object));
        });

        test('should return false if process is dead (powershell exit code non-0)', async () => {
            spawn.mockImplementation(() => ({
                on: (event, callback) => {
                    if (event === 'close') callback(1);
                },
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() }
            }));

            const result = await daemonManager.isProcessAlive(1234);
            expect(result).toBe(false);
        });

        test('should return false if spawn throws an error', async () => {
            spawn.mockImplementation(() => {
                throw new Error('Spawn error');
            });

            const result = await daemonManager.isProcessAlive(1234);
            expect(result).toBe(false);
            expect(consoleUtils.error).not.toHaveBeenCalled(); // Error handled internally
        });
    });

    describe('registerDaemon', () => {
        test('should register a new daemon with full config', async () => {
            const config = {
                port: 3000,
                command: 'node app.js',
                cwd: '/test',
                env: { NODE_ENV: 'test' },
                args: ['--port', '3000'],
                createdBy: 'test-user'
            };
            mockPersistenceManager.readPidData.mockResolvedValue({ daemons: {} });
            mockPersistenceManager.writePidData.mockResolvedValue(true);
            daemonManager.updateDaemon = jest.fn().mockResolvedValue(true);

            const result = await daemonManager.registerDaemon('new-daemon', 'ticket-123', config);

            expect(result.status).toBe('pending');
            expect(result.port).toBe(3000);
            expect(result.command).toBe('node app.js');
            expect(result.metadata.createdBy).toBe('test-user');
            expect(daemonManager.updateDaemon).toHaveBeenCalledWith('new-daemon', expect.objectContaining({
                ticketId: 'ticket-123',
                status: 'pending',
                port: 3000
            }));
            expect(consoleUtils.log).toHaveBeenCalledWith('📝 Зарегистрирован демон: new-daemon (Ticket: ticket-123)');
        });

        test('should register a new daemon with minimal config', async () => {
            mockPersistenceManager.readPidData.mockResolvedValue({ daemons: {} });
            mockPersistenceManager.writePidData.mockResolvedValue(true);
            daemonManager.updateDaemon = jest.fn().mockResolvedValue(true);

            const result = await daemonManager.registerDaemon('minimal-daemon', 'ticket-456');

            expect(result.status).toBe('pending');
            expect(result.port).toBeNull();
            expect(result.command).toBe('');
            expect(result.env).toEqual({});
            expect(result.metadata.createdBy).toBe('system');
            expect(consoleUtils.log).toHaveBeenCalledWith('📝 Зарегистрирован демон: minimal-daemon (Ticket: ticket-456)');
        });

        test('should handle registration errors', async () => {
            const error = new Error('Registration failed');
            daemonManager.updateDaemon = jest.fn().mockRejectedValue(error);

            await expect(daemonManager.registerDaemon('fail-daemon', 'ticket-999')).rejects.toThrow(error);
            expect(consoleUtils.error).toHaveBeenCalledWith('❌ Ошибка регистрации демона fail-daemon:', error);
        });
    });

    describe('updateDaemonStatus', () => {
        const initialDaemon = {
            pid: null,
            ticketId: 'ticket-123',
            status: 'pending',
            startTime: null,
            restartCount: 0,
            metadata: { created: new Date().toISOString(), updated: new Date().toISOString() }
        };

        beforeEach(() => {
            mockPersistenceManager.readPidData.mockResolvedValue({ daemons: { 'test-daemon': initialDaemon } });
            daemonManager.updateDaemon = jest.fn().mockResolvedValue(true);
        });

        test('should update status to running and set startTime', async () => {
            const additionalData = { pid: 5555 };
            const result = await daemonManager.updateDaemonStatus('test-daemon', 'running', additionalData);

            expect(result.status).toBe('running');
            expect(result.pid).toBe(5555);
            expect(result.startTime).toBeDefined();
            expect(daemonManager.updateDaemon).toHaveBeenCalledWith('test-daemon', expect.objectContaining({ status: 'running', pid: 5555 }));
            expect(consoleUtils.log).toHaveBeenCalledWith('🔄 Обновлен статус демона test-daemon: running');
        });

        test('should update status to failed and set failedAt and reason', async () => {
            const additionalData = { reason: 'crash' };
            const result = await daemonManager.updateDaemonStatus('test-daemon', 'failed', additionalData);

            expect(result.status).toBe('failed');
            expect(result.failedAt).toBeDefined();
            expect(result.reason).toBe('crash');
            expect(daemonManager.updateDaemon).toHaveBeenCalledWith('test-daemon', expect.objectContaining({ status: 'failed', reason: 'crash' }));
            expect(consoleUtils.log).toHaveBeenCalledWith('🔄 Обновлен статус демона test-daemon: failed');
        });

        test('should update status to stopped and set stoppedAt', async () => {
            const result = await daemonManager.updateDaemonStatus('test-daemon', 'stopped');

            expect(result.status).toBe('stopped');
            expect(result.stoppedAt).toBeDefined();
            expect(daemonManager.updateDaemon).toHaveBeenCalledWith('test-daemon', expect.objectContaining({ status: 'stopped' }));
            expect(consoleUtils.log).toHaveBeenCalledWith('🔄 Обновлен статус демона test-daemon: stopped');
        });

        test('should throw error if daemon not found', async () => {
            await expect(daemonManager.updateDaemonStatus('non-existent', 'running'))
                .rejects.toThrow('Демон non-existent не найден');
            expect(consoleUtils.error).toHaveBeenCalledWith('❌ Ошибка обновления статуса демона non-existent:', expect.any(Error));
        });

        test('should handle errors during updateDaemon call', async () => {
            const error = new Error('Update daemon error');
            daemonManager.updateDaemon = jest.fn().mockRejectedValue(error);

            await expect(daemonManager.updateDaemonStatus('test-daemon', 'running'))
                .rejects.toThrow(error);
            expect(consoleUtils.error).toHaveBeenCalledWith('❌ Ошибка обновления статуса демона test-daemon:', error);
        });
    });

    describe('updateDaemon', () => {
        const initialDaemon = {
            pid: 1234,
            ticketId: 'ticket-123',
            status: 'running',
            port: 3000,
            metadata: { created: new Date().toISOString(), updated: new Date().toISOString() }
        };

        beforeEach(() => {
            mockPersistenceManager.readPidData.mockResolvedValue({ daemons: { 'test-daemon': initialDaemon } });
            mockPersistenceManager.writePidData.mockResolvedValue(true);
        });

        test('should update an existing daemon\'s information', async () => {
            const updatedInfo = { port: 3001, restartCount: 1 };
            const result = await daemonManager.updateDaemon('test-daemon', { ...initialDaemon, ...updatedInfo });

            expect(result.port).toBe(3001);
            expect(result.restartCount).toBe(1);
            expect(mockPersistenceManager.writePidData).toHaveBeenCalledWith(expect.objectContaining({
                daemons: expect.objectContaining({
                    'test-daemon': expect.objectContaining({ port: 3001, restartCount: 1 })
                })
            }));
        });

        test('should add a new daemon if it does not exist', async () => {
            const newDaemonInfo = {
                pid: 5678,
                ticketId: 'ticket-456',
                status: 'running',
                port: 4000,
                metadata: { created: new Date().toISOString(), updated: new Date().toISOString() }
            };
            mockPersistenceManager.readPidData.mockResolvedValue({ daemons: {} });

            const result = await daemonManager.updateDaemon('new-daemon', newDaemonInfo);

            expect(result).toEqual(newDaemonInfo);
            expect(mockPersistenceManager.writePidData).toHaveBeenCalledWith(expect.objectContaining({
                daemons: expect.objectContaining({
                    'new-daemon': newDaemonInfo
                })
            }));
        });

        test('should handle errors during daemon update', async () => {
            const error = new Error('Write failed');
            mockPersistenceManager.writePidData.mockRejectedValue(error);

            await expect(daemonManager.updateDaemon('test-daemon', { ...initialDaemon, port: 3001 }))
                .rejects.toThrow(error);
            expect(consoleUtils.error).toHaveBeenCalledWith('❌ Ошибка обновления демона test-daemon:', error);
        });
    });

    describe('getDaemon', () => {
        const mockDaemon = {
            pid: 1234,
            ticketId: 'ticket-123',
            status: 'running'
        };

        beforeEach(() => {
            mockPersistenceManager.readPidData.mockResolvedValue({ daemons: { 'test-daemon': mockDaemon } });
        });

        test('should return daemon info if found', async () => {
            const result = await daemonManager.getDaemon('test-daemon');
            expect(result).toEqual(mockDaemon);
            expect(mockPersistenceManager.readPidData).toHaveBeenCalled();
        });

        test('should return null if daemon not found', async () => {
            const result = await daemonManager.getDaemon('non-existent');
            expect(result).toBeNull();
            expect(mockPersistenceManager.readPidData).toHaveBeenCalled();
        });

        test('should handle errors during retrieval', async () => {
            const error = new Error('Read failed');
            mockPersistenceManager.readPidData.mockRejectedValue(error);

            const result = await daemonManager.getDaemon('test-daemon');
            expect(result).toBeNull();
            expect(consoleUtils.error).toHaveBeenCalledWith('❌ Ошибка получения демона test-daemon:', error);
        });
    });

    describe('getAllDaemons', () => {
        const mockDaemons = {
            'daemon1': { status: 'running' },
            'daemon2': { status: 'pending' }
        };

        beforeEach(() => {
            mockPersistenceManager.readPidData.mockResolvedValue({ daemons: mockDaemons });
        });

        test('should return all daemons', async () => {
            const result = await daemonManager.getAllDaemons();
            expect(result).toEqual(mockDaemons);
            expect(mockPersistenceManager.readPidData).toHaveBeenCalled();
        });

        test('should return empty object if no daemons', async () => {
            mockPersistenceManager.readPidData.mockResolvedValue({ daemons: {} });
            const result = await daemonManager.getAllDaemons();
            expect(result).toEqual({});
        });

        test('should handle errors during retrieval', async () => {
            const error = new Error('Read failed');
            mockPersistenceManager.readPidData.mockRejectedValue(error);

            const result = await daemonManager.getAllDaemons();
            expect(result).toEqual({});
            expect(consoleUtils.error).toHaveBeenCalledWith('❌ Ошибка получения всех демонов:', error);
        });
    });

    describe('removeDaemon', () => {
        const initialDaemons = {
            'test-daemon': { pid: 1234, status: 'running' },
            'another-daemon': { pid: 5678, status: 'pending' }
        };

        beforeEach(() => {
            mockPersistenceManager.readPidData.mockResolvedValue({ daemons: { ...initialDaemons } });
            mockPersistenceManager.writePidData.mockResolvedValue(true);
        });

        test('should remove an existing daemon', async () => {
            const result = await daemonManager.removeDaemon('test-daemon');

            expect(result).toBe(true);
            expect(mockPersistenceManager.writePidData).toHaveBeenCalledWith(expect.objectContaining({
                daemons: expect.not.objectContaining({ 'test-daemon': expect.any(Object) })
            }));
            expect(consoleUtils.log).toHaveBeenCalledWith('🗑️ Удален демон: test-daemon');
        });

        test('should return false if daemon not found', async () => {
            const result = await daemonManager.removeDaemon('non-existent');
            expect(result).toBe(false);
            expect(mockPersistenceManager.writePidData).not.toHaveBeenCalled();
            expect(consoleUtils.log).not.toHaveBeenCalled();
        });

        test('should handle errors during removal', async () => {
            const error = new Error('Write failed');
            mockPersistenceManager.writePidData.mockRejectedValue(error);

            await expect(daemonManager.removeDaemon('test-daemon')).rejects.toThrow(error);
            expect(consoleUtils.error).toHaveBeenCalledWith('❌ Ошибка удаления демона test-daemon:', error);
        });
    });

    describe('cleanupCompletedDaemons', () => {
        const initialDaemons = {
            'running-daemon': { status: 'running' },
            'completed-daemon': { status: 'completed' },
            'failed-daemon': { status: 'failed' },
            'cancelled-daemon': { status: 'cancelled' },
            'pending-daemon': { status: 'pending' }
        };

        beforeEach(() => {
            mockPersistenceManager.readPidData.mockResolvedValue({ daemons: { ...initialDaemons } });
            mockPersistenceManager.writePidData.mockResolvedValue(true);
        });

        test('should remove completed, failed, and cancelled daemons', async () => {
            const result = await daemonManager.cleanupCompletedDaemons();

            expect(result).toBe(true);
            expect(mockPersistenceManager.writePidData).toHaveBeenCalledWith(expect.objectContaining({
                daemons: {
                    'running-daemon': { status: 'running' },
                    'pending-daemon': { status: 'pending' }
                }
            }));
            expect(consoleUtils.log).toHaveBeenCalledWith('🧹 Удален завершенный демон: completed-daemon');
            expect(consoleUtils.log).toHaveBeenCalledWith('🧹 Удален завершенный демон: failed-daemon');
            expect(consoleUtils.log).toHaveBeenCalledWith('🧹 Удален завершенный демон: cancelled-daemon');
        });

        test('should return false if no cleanup is needed', async () => {
            mockPersistenceManager.readPidData.mockResolvedValue({
                daemons: { 'running-daemon': { status: 'running' } }
            });

            const result = await daemonManager.cleanupCompletedDaemons();
            expect(result).toBe(false);
            expect(mockPersistenceManager.writePidData).not.toHaveBeenCalled();
            expect(consoleUtils.log).not.toHaveBeenCalled();
        });

        test('should handle errors during cleanup', async () => {
            const error = new Error('Write failed');
            mockPersistenceManager.writePidData.mockRejectedValue(error);

            await expect(daemonManager.cleanupCompletedDaemons()).rejects.toThrow(error);
            expect(consoleUtils.error).toHaveBeenCalledWith('❌ Ошибка очистки завершенных демонов:', error);
        });
    });
});
