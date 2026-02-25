/**
 * Unified Daemon - Unit Tests
 * Тестирование основного класса UnifiedDaemon
 */

const { UnifiedDaemon } = require('../index.js');

// Mock the PidFileManager
const mockPidFileManager = {
    initialize: jest.fn().mockResolvedValue(true),
    getDaemon: jest.fn(),
    updateDaemonStatus: jest.fn().mockResolvedValue(true),
    getAllDaemons: jest.fn().mockResolvedValue({}),
    getStats: jest.fn().mockReturnValue({ totalDaemons: 0, runningDaemons: 0, queuedDaemons: 0, failedDaemons: 0, lastUpdate: null, queueLength: 0, isWriting: false }),
    cleanupCompletedDaemons: jest.fn().mockResolvedValue(true)
};

jest.mock('../PidFileManager', () => ({
    PidFileManager: jest.fn(() => mockPidFileManager)
}));

// Mock global functions
const mockSetInterval = jest.fn();
const mockClearInterval = jest.fn();

global.setInterval = mockSetInterval;
global.clearInterval = mockClearInterval;

const mockConsole = {
    log: jest.fn(),
    error: jest.fn()
};
global.console = mockConsole;

describe('UnifiedDaemon', () => {
    let daemon;

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset mock for PidFileManager to ensure a fresh instance for each test
        mockPidFileManager.initialize.mockResolvedValue(true);
        mockPidFileManager.getDaemon.mockResolvedValue(null);
        mockPidFileManager.updateDaemonStatus.mockResolvedValue(true);
        mockPidFileManager.getAllDaemons.mockResolvedValue({});
        mockPidFileManager.getStats.mockReturnValue({ totalDaemons: 0, runningDaemons: 0, queuedDaemons: 0, failedDaemons: 0, lastUpdate: null, queueLength: 0, isWriting: false });
        mockPidFileManager.cleanupCompletedDaemons.mockResolvedValue(true);

        daemon = new UnifiedDaemon();
    });

    describe('Constructor', () => {
        test('should initialize with default options', () => {
            expect(daemon.options).toBeDefined();
            expect(daemon.options.pidFilePath).toBe('C:/apps/data/unified-daemon-pids.json');
            expect(daemon.options.maxConcurrentDaemons).toBe(10);
            expect(daemon.isRunning).toBe(false);
            expect(daemon.pidManager).toBeDefined();
        });

        test('should allow custom options', () => {
            const customOptions = {
                pidFilePath: '/tmp/custom-pids.json',
                maxConcurrentDaemons: 5,
                autoRestart: false
            };
            const customDaemon = new UnifiedDaemon(customOptions);
            expect(customDaemon.options.pidFilePath).toBe('/tmp/custom-pids.json');
            expect(customDaemon.options.maxConcurrentDaemons).toBe(5);
            expect(customDaemon.options.autoRestart).toBe(false);
        });
    });

    describe('initialize', () => {
        test('should initialize pidManager', async () => {
            const result = await daemon.initialize();
            expect(result).toBe(true);
            expect(mockPidFileManager.initialize).toHaveBeenCalledTimes(1);
            expect(mockConsole.log).toHaveBeenCalledWith('✅ Unified Daemon инициализирован');
        });

        test('should handle initialization errors', async () => {
            mockPidFileManager.initialize.mockRejectedValueOnce(new Error('PID Init Failed'));
            await expect(daemon.initialize()).rejects.toThrow('PID Init Failed');
            expect(mockConsole.error).toHaveBeenCalledWith('❌ Ошибка инициализации Unified Daemon:', expect.any(Error));
        });
    });

    describe('startDaemon', () => {
        const daemonName = 'test-daemon';
        const ticketId = 'ticket-123';
        const config = { port: 3000, command: 'node server.js' };

        test('should start a new daemon', async () => {
            // Mock internal methods to simulate a new daemon start
            daemon.configManager = { getDaemonConfig: jest.fn().mockResolvedValue(config) };
            daemon.manager = {
                createDaemonTicket: jest.fn().mockResolvedValue({ id: ticketId }),
                startTicket: jest.fn().mockResolvedValue({ status: 'running' })
            };

            const result = await daemon.startDaemon(daemonName, config);

            expect(mockPidFileManager.getDaemon).toHaveBeenCalledWith(daemonName);
            // Since getDaemon returns null, it proceeds to create a new one
            expect(daemon.configManager.getDaemonConfig).toHaveBeenCalledWith(daemonName, config);
            expect(daemon.manager.createDaemonTicket).toHaveBeenCalledWith(daemonName, config);
            expect(daemon.manager.startTicket).toHaveBeenCalledWith(ticketId);
            expect(mockConsole.log).toHaveBeenCalledWith(`✅ Демон ${daemonName} запущен (Ticket: ${ticketId})`);
            expect(result.status).toBe('running');
        });

        test('should return existing daemon if already running', async () => {
            const runningDaemon = { pid: 1234, status: 'running' };
            mockPidFileManager.getDaemon.mockResolvedValueOnce(runningDaemon);

            const result = await daemon.startDaemon(daemonName, config);

            expect(mockConsole.log).toHaveBeenCalledWith(`⚠️ Демон ${daemonName} уже запущен (PID: ${runningDaemon.pid})`);
            expect(result).toEqual(runningDaemon);
            expect(mockPidFileManager.updateDaemonStatus).not.toHaveBeenCalled();
        });

        test('should stop and restart if daemon exists but not running', async () => {
            const stoppedDaemon = { pid: 1234, status: 'stopped' };
            mockPidFileManager.getDaemon.mockResolvedValueOnce(stoppedDaemon);
            daemon.stopDaemon = jest.fn().mockResolvedValue(true);
            daemon.configManager = { getDaemonConfig: jest.fn().mockResolvedValue(config) };
            daemon.manager = {
                createDaemonTicket: jest.fn().mockResolvedValue({ id: ticketId }),
                startTicket: jest.fn().mockResolvedValue({ status: 'running' })
            };
            
            const result = await daemon.startDaemon(daemonName, config);

            expect(daemon.stopDaemon).toHaveBeenCalledWith(daemonName);
            expect(daemon.configManager.getDaemonConfig).toHaveBeenCalledWith(daemonName, config);
            expect(daemon.manager.createDaemonTicket).toHaveBeenCalledWith(daemonName, config);
            expect(daemon.manager.startTicket).toHaveBeenCalledWith(ticketId);
            expect(result.status).toBe('running');
        });

        test('should handle startDaemon errors', async () => {
            const error = new Error('Start Daemon Failed');
            daemon.configManager = { getDaemonConfig: jest.fn().mockRejectedValue(error) };

            await expect(daemon.startDaemon(daemonName, config)).rejects.toThrow('Start Daemon Failed');
            expect(mockConsole.error).toHaveBeenCalledWith(`❌ Ошибка запуска демона ${daemonName}:`, error);
        });
    });

    describe('stopDaemon', () => {
        const daemonName = 'test-daemon';
        const runningDaemon = { pid: 1234, status: 'running', ticketId: 'ticket-123' };
        
        beforeEach(() => {
            mockPidFileManager.getDaemon.mockResolvedValue(runningDaemon);
            daemon.processManager = { stopProcess: jest.fn().mockResolvedValue(true) };
            daemon.manager = {
                getTicketByDaemon: jest.fn().mockResolvedValue({ id: 'ticket-123' }),
                stopTicket: jest.fn().mockResolvedValue(true),
                stop: jest.fn().mockResolvedValue(true)
            };
        });
        
        test('should stop a running daemon', async () => {
            const result = await daemon.stopDaemon(daemonName);

            expect(result).toBe(true);
            expect(mockPidFileManager.getDaemon).toHaveBeenCalledWith(daemonName);
            expect(daemon.manager.getTicketByDaemon).toHaveBeenCalledWith(daemonName);
            expect(daemon.manager.stopTicket).toHaveBeenCalledWith('ticket-123');
            expect(daemon.processManager.stopProcess).toHaveBeenCalledWith(1234);
            expect(mockPidFileManager.updateDaemonStatus).toHaveBeenCalledWith(daemonName, 'stopped');
            expect(mockConsole.log).toHaveBeenCalledWith(`🛑 Демон ${daemonName} остановлен`);
        });
        
        test('should return null if daemon not found', async () => {
            mockPidFileManager.getDaemon.mockResolvedValueOnce(null);
            const result = await daemon.stopDaemon(daemonName);

            expect(result).toBeNull();
            expect(mockConsole.log).toHaveBeenCalledWith(`ℹ️ Демон ${daemonName} не найден`);
            expect(daemon.processManager.stopProcess).not.toHaveBeenCalled();
        });
        
        test('should handle stopDaemon errors', async () => {
            const error = new Error('Stop Daemon Failed');
            daemon.processManager.stopProcess.mockRejectedValueOnce(error);

            await expect(daemon.stopDaemon(daemonName)).rejects.toThrow('Stop Daemon Failed');
            expect(mockConsole.error).toHaveBeenCalledWith(`❌ Ошибка остановки демона ${daemonName}:`, error);
        });
    });

    describe('restartDaemon', () => {
        const daemonName = 'test-daemon';
        
        beforeEach(() => {
            jest.useFakeTimers();
            daemon.stopDaemon = jest.fn().mockResolvedValue(true);
            daemon.startDaemon = jest.fn().mockResolvedValue(true);
        });
        
        afterEach(() => {
            jest.runOnlyPendingTimers();
            jest.useRealTimers();
        });
        
        test('should stop and start the daemon', async () => {
            const restartPromise = daemon.restartDaemon(daemonName);
            
            expect(mockConsole.log).toHaveBeenCalledWith(`🔄 Перезапуск демона ${daemonName}...`);
            expect(daemon.stopDaemon).toHaveBeenCalledWith(daemonName);
            
            jest.advanceTimersByTime(2000);
            
            await restartPromise;
            
            expect(daemon.startDaemon).toHaveBeenCalledWith(daemonName);
            expect(mockConsole.log).toHaveBeenCalledWith(`✅ Демон ${daemonName} перезапущен`);
        });
        
        test('should handle restartDaemon errors', async () => {
            const error = new Error('Restart Failed');
            daemon.stopDaemon.mockRejectedValueOnce(error);
            
            await expect(daemon.restartDaemon(daemonName)).rejects.toThrow('Restart Failed');
            expect(mockConsole.error).toHaveBeenCalledWith(`❌ Ошибка перезапуска демона ${daemonName}:`, error);
        });
    });

    describe('getDaemonStatus', () => {
        const daemonName = 'test-daemon';
        const pidInfo = { pid: 1234, status: 'running', startTime: new Date().toISOString(), restartCount: 0 };
        const ticketInfo = { id: 'ticket-123', status: 'active', type: 'start' };
        
        beforeEach(() => {
            daemon.manager = { getTicketByDaemon: jest.fn().mockResolvedValue(null) };
        });
        
        test('should return daemon status when pid info and ticket exist', async () => {
            mockPidFileManager.getDaemon.mockResolvedValueOnce(pidInfo);
            daemon.manager.getTicketByDaemon.mockResolvedValueOnce(ticketInfo);
            
            const status = await daemon.getDaemonStatus(daemonName);
            
            expect(status.name).toBe(daemonName);
            expect(status.pid).toBe(pidInfo.pid);
            expect(status.status).toBe(pidInfo.status);
            expect(status.ticket).toEqual({ id: ticketInfo.id, status: ticketInfo.status, type: ticketInfo.type });
            expect(mockPidFileManager.getDaemon).toHaveBeenCalledWith(daemonName);
            expect(daemon.manager.getTicketByDaemon).toHaveBeenCalledWith(daemonName);
        });
        
        test('should return daemon status when only pid info exists', async () => {
            mockPidFileManager.getDaemon.mockResolvedValueOnce(pidInfo);
            
            const status = await daemon.getDaemonStatus(daemonName);
            
            expect(status.name).toBe(daemonName);
            expect(status.pid).toBe(pidInfo.pid);
            expect(status.status).toBe(pidInfo.status);
            expect(status.ticket).toBeUndefined();
        });
        
        test('should return not_found status if neither pid info nor ticket exist', async () => {
            mockPidFileManager.getDaemon.mockResolvedValueOnce(null);
            daemon.manager.getTicketByDaemon.mockResolvedValueOnce(null);
            
            const status = await daemon.getDaemonStatus(daemonName);
            
            expect(status).toEqual({ status: 'not_found', message: 'Демон не найден' });
        });
        
        test('should handle errors during getDaemonStatus', async () => {
            const error = new Error('Get Status Failed');
            mockPidFileManager.getDaemon.mockRejectedValueOnce(error);
            
            await expect(daemon.getDaemonStatus(daemonName)).rejects.toThrow('Get Status Failed');
            expect(mockConsole.error).toHaveBeenCalledWith(`❌ Ошибка получения статуса демона ${daemonName}:`, error);
        });
    });

    describe('getAllDaemonsStatus', () => {
        test('should return statuses for all registered daemons', async () => {
            const mockDaemons = {
                'daemon1': { pid: 111, status: 'running' },
                'daemon2': { pid: 222, status: 'stopped' }
            };
            mockPidFileManager.getAllDaemons.mockResolvedValueOnce(mockDaemons);
            daemon.getDaemonStatus = jest.fn()
                .mockResolvedValueOnce({ name: 'daemon1', status: 'running' })
                .mockResolvedValueOnce({ name: 'daemon2', status: 'stopped' });

            const statuses = await daemon.getAllDaemonsStatus();

            expect(statuses).toEqual([
                { name: 'daemon1', status: 'running' },
                { name: 'daemon2', status: 'stopped' }
            ]);
            expect(mockPidFileManager.getAllDaemons).toHaveBeenCalledTimes(1);
            expect(daemon.getDaemonStatus).toHaveBeenCalledWith('daemon1');
            expect(daemon.getDaemonStatus).toHaveBeenCalledWith('daemon2');
        });
        
        test('should handle errors during getAllDaemonsStatus', async () => {
            const error = new Error('Get All Daemons Status Failed');
            mockPidFileManager.getAllDaemons.mockRejectedValueOnce(error);
            
            await expect(daemon.getAllDaemonsStatus()).rejects.toThrow('Get All Daemons Status Failed');
            expect(mockConsole.error).toHaveBeenCalledWith('❌ Ошибка получения статуса всех демонов:', error);
        });
    });

    describe('getStats', () => {
        test('should return combined stats from pidManager', () => {
            const pidManagerStats = { totalDaemons: 5, runningDaemons: 2, queueLength: 1 };
            mockPidFileManager.getStats.mockReturnValueOnce(pidManagerStats);

            const stats = daemon.getStats();

            expect(stats.totalDaemons).toBe(0); // UnifiedDaemon's own stats
            expect(stats.pidManager).toEqual(pidManagerStats);
            expect(stats.ticketManager).toBeUndefined(); // As manager is commented out
        });
    });

    describe('start', () => {
        test('should initialize and set isRunning to true', async () => {
            jest.useFakeTimers();
            daemon.initialize = jest.fn().mockResolvedValue(true);
            daemon.monitorDaemons = jest.fn();

            await daemon.start();

            expect(daemon.initialize).toHaveBeenCalledTimes(1);
            expect(daemon.isRunning).toBe(true);
            expect(mockConsole.log).toHaveBeenCalledWith('🚀 Unified Daemon запущен');
            expect(mockSetInterval).toHaveBeenCalledTimes(1);
            expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), daemon.options.monitoringInterval);

            jest.runOnlyPendingTimers();
            expect(daemon.monitorDaemons).toHaveBeenCalledTimes(1);

            jest.useRealTimers();
        });

        test('should not start if already running', async () => {
            daemon.isRunning = true;
            daemon.initialize = jest.fn();

            await daemon.start();

            expect(daemon.initialize).not.toHaveBeenCalled();
            expect(mockConsole.log).not.toHaveBeenCalled();
        });
        
        test('should handle start errors', async () => {
            const error = new Error('Init Failed');
            daemon.initialize = jest.fn().mockRejectedValueOnce(error);
            
            await expect(daemon.start()).rejects.toThrow('Init Failed');
            expect(mockConsole.error).toHaveBeenCalledWith('❌ Ошибка запуска Unified Daemon:', error);
        });
    });

    describe('stop', () => {
        beforeEach(() => {
            jest.useFakeTimers();
            daemon.isRunning = true;
            daemon.monitoringTimer = setInterval(() => {}, 1000);
            mockPidFileManager.getAllDaemons.mockResolvedValueOnce({
                'daemon1': { status: 'running' },
                'daemon2': { status: 'stopped' }
            });
            daemon.stopDaemon = jest.fn().mockResolvedValue(true);
            // daemon.manager is commented out in constructor
        });
        
        afterEach(() => {
            jest.useRealTimers();
            });

        test('should clear monitoring timer and stop running daemons', async () => {
            await daemon.stop();

            expect(daemon.isRunning).toBe(false);
            expect(mockClearInterval).toHaveBeenCalledWith(daemon.monitoringTimer);
            expect(daemon.monitoringTimer).toBeNull();
            expect(mockPidFileManager.getAllDaemons).toHaveBeenCalledTimes(1);
            expect(daemon.stopDaemon).toHaveBeenCalledWith('daemon1');
            expect(daemon.stopDaemon).not.toHaveBeenCalledWith('daemon2');
            // daemon.manager is commented out in constructor, so this won't be called
            expect(mockConsole.log).toHaveBeenCalledWith('🛑 Unified Daemon остановлен');
        });

        test('should not stop if not running', async () => {
            daemon.isRunning = false;
            mockClearInterval.mockClear();
            daemon.stopDaemon.mockClear();

            await daemon.stop();

            expect(mockClearInterval).not.toHaveBeenCalled();
            expect(daemon.stopDaemon).not.toHaveBeenCalled();
            expect(mockConsole.log).not.toHaveBeenCalledWith('🛑 Unified Daemon остановлен');
        });
        
        test('should handle stop errors', async () => {
            const error = new Error('Stop Failed');
            mockPidFileManager.getAllDaemons.mockRejectedValueOnce(error);
            
            await expect(daemon.stop()).rejects.toThrow('Stop Failed');
            expect(mockConsole.error).toHaveBeenCalledWith('❌ Ошибка остановки Unified Daemon:', error);
            });
        });

    describe('monitorDaemons', () => {
        beforeEach(() => {
            daemon.options.autoRestart = true;
            daemon.processManager = { isProcessAlive: jest.fn() };
            daemon.restartDaemon = jest.fn().mockResolvedValue(true);
        });
        
        test('should restart dead running daemons if autoRestart is true', async () => {
            mockPidFileManager.getAllDaemons.mockResolvedValueOnce({
                'daemon1': { pid: 111, status: 'running' },
                'daemon2': { pid: 222, status: 'running' }
            });
            daemon.processManager.isProcessAlive
                .mockResolvedValueOnce(false) // daemon1 dead
                .mockResolvedValueOnce(true);  // daemon2 alive

            await daemon.monitorDaemons();

            expect(mockConsole.log).toHaveBeenCalledWith(`⚠️ Процесс демона daemon1 (PID: 111) не отвечает`);
            expect(mockConsole.log).toHaveBeenCalledWith(`🔄 Автоматический перезапуск демона daemon1...`);
            expect(daemon.restartDaemon).toHaveBeenCalledWith('daemon1');
            expect(mockPidFileManager.updateDaemonStatus).not.toHaveBeenCalledWith('daemon1', 'failed');
        });

        test('should mark dead running daemons as failed if autoRestart is false', async () => {
            daemon.options.autoRestart = false;
            mockPidFileManager.getAllDaemons.mockResolvedValueOnce({
                'daemon1': { pid: 111, status: 'running' }
            });
            daemon.processManager.isProcessAlive.mockResolvedValueOnce(false);

            await daemon.monitorDaemons();

            expect(mockConsole.log).toHaveBeenCalledWith(`⚠️ Процесс демона daemon1 (PID: 111) не отвечает`);
            expect(mockPidFileManager.updateDaemonStatus).toHaveBeenCalledWith('daemon1', 'failed');
            expect(daemon.restartDaemon).not.toHaveBeenCalled();
        });
        
        test('should update stats after monitoring', async () => {
            daemon.updateStats = jest.fn();
            mockPidFileManager.getAllDaemons.mockResolvedValueOnce({}); // No daemons to monitor

            await daemon.monitorDaemons();

            expect(daemon.updateStats).toHaveBeenCalledTimes(1);
        });
        
        test('should handle monitorDaemons errors gracefully', async () => {
            const error = new Error('Monitor Failed');
            mockPidFileManager.getAllDaemons.mockRejectedValueOnce(error);
            
            await daemon.monitorDaemons(); // Should not throw
            expect(mockConsole.error).toHaveBeenCalledWith('❌ Ошибка мониторинга демонов:', error);
        });
    });

    describe('updateStats', () => {
        test('should update daemon statistics correctly', async () => {
            mockPidFileManager.getAllDaemonsSync = jest.fn().mockReturnValue({
                'daemon1': { status: 'running' },
                'daemon2': { status: 'stopped' },
                'daemon3': { status: 'failed' },
                'daemon4': { status: 'queued' } // Queued daemons are not counted in UnifiedDaemon's direct stats
            });

            daemon.updateStats();

            expect(daemon.stats.totalDaemons).toBe(4);
            expect(daemon.stats.runningDaemons).toBe(1);
            expect(daemon.stats.stoppedDaemons).toBe(1);
            expect(daemon.stats.failedDaemons).toBe(1);
        });
    });
});
