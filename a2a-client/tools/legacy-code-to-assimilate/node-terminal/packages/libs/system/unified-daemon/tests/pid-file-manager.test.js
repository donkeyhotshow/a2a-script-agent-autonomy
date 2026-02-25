const mockConsoleUtils = {
    log: jest.fn(),
    error: jest.fn()
};

jest.mock('@libs/logging-monitoring/logging/console-utils', () => ({
    consoleUtils: mockConsoleUtils
}));

/**
 * PidFileManager - Unit Tests
 * Тестирование менеджера PID файлов для unified-daemon
 */

const { PidFileManager } = require('../PidFileManager.js');
const os = require('os');
const path = require('path');

// Mock dependencies
const mockPidFilePersistence = {
    initializePersistence: jest.fn(),
    readPidData: jest.fn(),
    createInitialPidFile: jest.fn(),
    writePidData: jest.fn(),
    writeQueue: [], // Mock for getStats
    isWriting: false // Mock for getStats
};

const mockPidDaemonManager = {
    validateRunningProcesses: jest.fn(),
    isProcessAlive: jest.fn(),
    registerDaemon: jest.fn(),
    updateDaemonStatus: jest.fn(),
    updateDaemon: jest.fn(),
    getDaemon: jest.fn(),
    getAllDaemons: jest.fn(),
    removeDaemon: jest.fn(),
    cleanupCompletedDaemons: jest.fn()
};

const mockPidQueueManager = {
    addToQueue: jest.fn(),
    removeFromQueue: jest.fn(),
    getNextFromQueue: jest.fn(),
    canStartDaemon: jest.fn(),
    getQueueInfo: jest.fn()
};

jest.mock('../src/PidFilePersistence', () => ({
    PidFilePersistence: jest.fn(() => mockPidFilePersistence)
}));
jest.mock('../src/PidDaemonManager', () => ({
    PidDaemonManager: jest.fn(() => mockPidDaemonManager)
}));
jest.mock('../src/PidQueueManager', () => ({
    PidQueueManager: jest.fn(() => mockPidQueueManager)
}));


describe('PidFileManager', () => {
    let pidManager;
    let testPidFile;

    beforeEach(() => {
        jest.clearAllMocks();

        testPidFile = path.join(os.tmpdir(), 'test-daemon-pids.json');
        pidManager = new PidFileManager(testPidFile);

        // Mock initial data for persistence manager
        mockPidFilePersistence.readPidData.mockResolvedValue({
            version: "1.0",
            daemons: {},
            queue: { active: null, waiting: [], maxConcurrent: 1 },
            metadata: { totalDaemons: 0 }
        });
        mockPidFilePersistence.initializePersistence.mockResolvedValue(true);
        mockPidFilePersistence.writePidData.mockResolvedValue(true);
    });

    describe('Constructor', () => {
        test('should create instance with default pid file path', () => {
            const defaultManager = new PidFileManager();
            expect(defaultManager).toBeDefined();
            expect(defaultManager.pidFilePath).toBeDefined();
            expect(defaultManager.persistenceManager).toBeDefined();
            expect(defaultManager.daemonManager).toBeDefined();
            expect(defaultManager.queueManager).toBeDefined();
            expect(defaultManager.isInitialized).toBe(false);
        });

        test('should create instance with custom pid file path', () => {
            const customPath = '/custom/path/pids.json';
            const customManager = new PidFileManager(customPath);
            expect(customManager.pidFilePath).toBe(customPath);
        });

        test('should initialize stats', () => {
            expect(pidManager.stats).toBeDefined();
            expect(pidManager.stats.totalDaemons).toBe(0);
            expect(pidManager.stats.runningDaemons).toBe(0);
            expect(pidManager.stats.queuedDaemons).toBe(0);
            expect(pidManager.stats.failedDaemons).toBe(0);
        });
    });

    describe('Initialization', () => {
        test('should initialize successfully', async () => {
            mockPidDaemonManager.validateRunningProcesses.mockResolvedValue();
            const result = await pidManager.initialize();

            expect(result).toBe(true);
            expect(mockPidFilePersistence.initializePersistence).toHaveBeenCalled();
            expect(mockPidDaemonManager.validateRunningProcesses).toHaveBeenCalledWith({});
            expect(pidManager.isInitialized).toBe(true);
            expect(mockConsoleUtils.log).toHaveBeenCalledWith('✅ PidFileManager инициализирован');
        });

        test('should handle initialization errors', async () => {
            const error = new Error('Init failed');
            mockPidFilePersistence.initializePersistence.mockRejectedValue(error);

            await expect(pidManager.initialize()).rejects.toThrow('Init failed');
            expect(mockConsoleUtils.error).toHaveBeenCalled();
        });
    });

    describe('Create Initial PID File', () => {
        test('should delegate to persistence manager', async () => {
            mockPidFilePersistence.createInitialPidFile.mockResolvedValue(true);
            const result = await pidManager.createInitialPidFile();
            expect(result).toBe(true);
            expect(mockPidFilePersistence.createInitialPidFile).toHaveBeenCalled();
        });
    });

    describe('Load and Validate PID Data', () => {
        test('should load and validate data', async () => {
            const mockData = {
                version: "1.0",
                daemons: { 'test-daemon': { status: 'running' } },
                queue: { active: null, waiting: [], maxConcurrent: 1 },
                metadata: { totalDaemons: 1 }
            };
            mockPidFilePersistence.readPidData.mockResolvedValue(mockData);
            mockPidDaemonManager.validateRunningProcesses.mockResolvedValue();

            const result = await pidManager.loadAndValidatePidData();
            expect(result).toEqual(mockData);
            expect(mockPidFilePersistence.readPidData).toHaveBeenCalled();
            expect(mockPidDaemonManager.validateRunningProcesses).toHaveBeenCalledWith(mockData.daemons);
            expect(mockConsoleUtils.log).toHaveBeenCalledWith('📊 Загружено 1 демонов');
            expect(pidManager.stats.totalDaemons).toBe(1);
            expect(pidManager.stats.runningDaemons).toBe(1);
        });
    });

    describe('Process Alive Check', () => {
        test('should delegate to daemon manager', async () => {
            mockPidDaemonManager.isProcessAlive.mockResolvedValue(true);
            const result = await pidManager.isProcessAlive(1234);
            expect(result).toBe(true);
            expect(mockPidDaemonManager.isProcessAlive).toHaveBeenCalledWith(1234);
        });
    });

    describe('Daemon Registration', () => {
        test('should delegate to daemon manager', async () => {
            const config = { port: 3000 };
            const mockDaemon = { name: 'test-daemon', status: 'pending' };
            mockPidDaemonManager.registerDaemon.mockResolvedValue(mockDaemon);
            const result = await pidManager.registerDaemon('test-daemon', 'ticket-123', config);
            expect(result).toEqual(mockDaemon);
            expect(mockPidDaemonManager.registerDaemon).toHaveBeenCalledWith('test-daemon', 'ticket-123', config);
        });
    });

    describe('Daemon Status Updates', () => {
        test('should delegate to daemon manager and update stats', async () => {
            const mockUpdatedDaemon = { name: 'test-daemon', status: 'running' };
            mockPidDaemonManager.updateDaemonStatus.mockResolvedValue(mockUpdatedDaemon);
            const mockDataAfterUpdate = { daemons: { 'test-daemon': { status: 'running' } }, metadata: {} };
            mockPidFilePersistence.readPidData.mockResolvedValue(mockDataAfterUpdate);

            const result = await pidManager.updateDaemonStatus('test-daemon', 'running', { pid: 1234 });
            expect(result).toEqual(mockUpdatedDaemon);
            expect(mockPidDaemonManager.updateDaemonStatus).toHaveBeenCalledWith('test-daemon', 'running', { pid: 1234 });
            expect(pidManager.stats.runningDaemons).toBe(1);
        });
    });

    describe('Daemon Update', () => {
        test('should delegate to daemon manager and update stats', async () => {
            const mockDaemonInfo = { port: 3001 };
            const mockUpdatedDaemon = { name: 'test-daemon', port: 3001, status: 'running' };
            mockPidDaemonManager.updateDaemon.mockResolvedValue(mockUpdatedDaemon);
            const mockDataAfterUpdate = { daemons: { 'test-daemon': { status: 'running', port: 3001 } }, metadata: {} };
            mockPidFilePersistence.readPidData.mockResolvedValue(mockDataAfterUpdate);

            const result = await pidManager.updateDaemon('test-daemon', mockDaemonInfo);
            expect(result).toEqual(mockUpdatedDaemon);
            expect(mockPidDaemonManager.updateDaemon).toHaveBeenCalledWith('test-daemon', mockDaemonInfo);
            expect(pidManager.stats.runningDaemons).toBe(1);
        });
    });

    describe('Daemon Retrieval', () => {
        test('should delegate to daemon manager for getDaemon', async () => {
            const mockDaemon = { name: 'test-daemon' };
            mockPidDaemonManager.getDaemon.mockResolvedValue(mockDaemon);
            const result = await pidManager.getDaemon('test-daemon');
            expect(result).toEqual(mockDaemon);
            expect(mockPidDaemonManager.getDaemon).toHaveBeenCalledWith('test-daemon');
        });

        test('should delegate to daemon manager for getAllDaemons', async () => {
            const mockDaemons = { 'test-daemon': { name: 'test-daemon' } };
            mockPidDaemonManager.getAllDaemons.mockResolvedValue(mockDaemons);
            const result = await pidManager.getAllDaemons();
            expect(result).toEqual(mockDaemons);
            expect(mockPidDaemonManager.getAllDaemons).toHaveBeenCalled();
        });
    });

    describe('Daemon Removal', () => {
        test('should delegate to daemon manager and update stats', async () => {
            mockPidDaemonManager.removeDaemon.mockResolvedValue(true);
            const mockDataAfterRemoval = { daemons: {}, metadata: {} };
            mockPidFilePersistence.readPidData.mockResolvedValue(mockDataAfterRemoval);

            const result = await pidManager.removeDaemon('test-daemon');
            expect(result).toBe(true);
            expect(mockPidDaemonManager.removeDaemon).toHaveBeenCalledWith('test-daemon');
            expect(pidManager.stats.totalDaemons).toBe(0);
        });

        test('should not update stats if daemon not removed', async () => {
            mockPidDaemonManager.removeDaemon.mockResolvedValue(false);
            const currentStats = { ...pidManager.stats };
            const result = await pidManager.removeDaemon('non-existent');
            expect(result).toBe(false);
            expect(mockPidDaemonManager.removeDaemon).toHaveBeenCalledWith('non-existent');
            expect(pidManager.stats).toEqual(currentStats); // Stats should not change
        });
    });

    describe('Queue Management', () => {
        test('should delegate to queue manager for addToQueue', async () => {
            const mockQueueResult = { position: 1 };
            mockPidQueueManager.addToQueue.mockResolvedValue(mockQueueResult);
            const mockDataAfterQueue = { daemons: { 'test-daemon': { status: 'queued' } }, queue: { waiting: ['ticket-123'] }, metadata: {} };
            mockPidFilePersistence.readPidData.mockResolvedValue(mockDataAfterQueue);

            const result = await pidManager.addToQueue('ticket-123', 'test-daemon', 'limit_reached');
            expect(result).toEqual(mockQueueResult);
            expect(mockPidQueueManager.addToQueue).toHaveBeenCalledWith('ticket-123', 'test-daemon', 'limit_reached');
            expect(pidManager.stats.queuedDaemons).toBe(1);
        });

        test('should delegate to queue manager for removeFromQueue', async () => {
            mockPidQueueManager.removeFromQueue.mockResolvedValue(true);
            const mockDataAfterDequeue = { daemons: {}, queue: { waiting: [] }, metadata: {} };
            mockPidFilePersistence.readPidData.mockResolvedValue(mockDataAfterDequeue);

            const result = await pidManager.removeFromQueue('ticket-123');
            expect(result).toBe(true);
            expect(mockPidQueueManager.removeFromQueue).toHaveBeenCalledWith('ticket-123');
            expect(pidManager.stats.queuedDaemons).toBe(0);
        });

        test('should not update stats if not removed from queue', async () => {
            mockPidQueueManager.removeFromQueue.mockResolvedValue(false);
            const currentStats = { ...pidManager.stats };
            const result = await pidManager.removeFromQueue('non-existent');
            expect(result).toBe(false);
            expect(mockPidQueueManager.removeFromQueue).toHaveBeenCalledWith('non-existent');
            expect(pidManager.stats).toEqual(currentStats);
        });

        test('should delegate to queue manager for getNextFromQueue', async () => {
            const mockNext = { ticketId: 'ticket-123' };
            mockPidQueueManager.getNextFromQueue.mockResolvedValue(mockNext);
            const result = await pidManager.getNextFromQueue();
            expect(result).toEqual(mockNext);
            expect(mockPidQueueManager.getNextFromQueue).toHaveBeenCalled();
        });

        test('should delegate to queue manager for canStartDaemon', async () => {
            const mockCanStart = { canStart: true };
            mockPidQueueManager.canStartDaemon.mockResolvedValue(mockCanStart);
            const result = await pidManager.canStartDaemon('new-daemon');
            expect(result).toEqual(mockCanStart);
            expect(mockPidQueueManager.canStartDaemon).toHaveBeenCalledWith('new-daemon');
        });
    });

    describe('File Operations (delegated)', () => {
        test('should delegate readPidData to persistence manager', async () => {
            const mockData = { test: 'data' };
            mockPidFilePersistence.readPidData.mockResolvedValue(mockData);
            const result = await pidManager.readPidData();
            expect(result).toEqual(mockData);
            expect(mockPidFilePersistence.readPidData).toHaveBeenCalled();
        });

        test('should delegate writePidData to persistence manager', async () => {
            const testData = { new: 'data' };
            await pidManager.writePidData(testData);
            expect(mockPidFilePersistence.writePidData).toHaveBeenCalledWith(testData);
        });
    });

    describe('Statistics', () => {
        test('should get statistics including queue info from persistence manager', () => {
            mockPidFilePersistence.writeQueue.length = 2;
            mockPidFilePersistence.isWriting = true;

            const stats = pidManager.getStats();
            expect(stats).toBeDefined();
            expect(stats.totalDaemons).toBe(0);
            expect(stats.queueLength).toBe(2);
            expect(stats.isWriting).toBe(true);
        });

        test('should update stats correctly based on provided data', () => {
            const data = {
                daemons: {
                    'daemon1': { status: 'running' },
                    'daemon2': { status: 'queued' },
                    'daemon3': { status: 'failed' },
                    'daemon4': { status: 'stopped' }
                },
                metadata: {}
            };
            pidManager.updateStats(data);
            expect(pidManager.stats.totalDaemons).toBe(4);
            expect(pidManager.stats.runningDaemons).toBe(1);
            expect(pidManager.stats.queuedDaemons).toBe(1);
            expect(pidManager.stats.failedDaemons).toBe(1);
            expect(data.metadata.totalDaemons).toBe(4);
        });
    });

    describe('Cleanup', () => {
        test('should delegate cleanupCompletedDaemons to daemon manager and update stats', async () => {
            mockPidDaemonManager.cleanupCompletedDaemons.mockResolvedValue(true);
            const mockDataAfterCleanup = { daemons: { 'running-daemon': { status: 'running' } }, metadata: {} };
            mockPidFilePersistence.readPidData.mockResolvedValue(mockDataAfterCleanup);

            const result = await pidManager.cleanupCompletedDaemons();
            expect(result).toBe(true);
            expect(mockPidDaemonManager.cleanupCompletedDaemons).toHaveBeenCalled();
            expect(pidManager.stats.totalDaemons).toBe(1);
        });

        test('should not update stats if no cleanup needed', async () => {
            mockPidDaemonManager.cleanupCompletedDaemons.mockResolvedValue(false);
            const currentStats = { ...pidManager.stats };
            const result = await pidManager.cleanupCompletedDaemons();
            expect(result).toBe(false);
            expect(mockPidDaemonManager.cleanupCompletedDaemons).toHaveBeenCalled();
            expect(pidManager.stats).toEqual(currentStats);
        });
    });

    describe('Queue Information', () => {
        test('should delegate getQueueInfo to queue manager', async () => {
            const mockQueueInfo = { active: 'ticket-123', waiting: [] };
            mockPidQueueManager.getQueueInfo.mockResolvedValue(mockQueueInfo);
            const result = await pidManager.getQueueInfo();
            expect(result).toEqual(mockQueueInfo);
            expect(mockPidQueueManager.getQueueInfo).toHaveBeenCalled();
        });
    });
});
