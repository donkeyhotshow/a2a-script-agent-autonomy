/**
 * PidFilePersistence - Unit Tests
 * Тестирование менеджера персистентности PID файлов
 */

const { PidFilePersistence } = require('../src/PidFilePersistence');
const FileSystemUtils = require('@libs/system/file-operations');
const { LoggingUtils } = require('@libs/logging-monitoring/logging');
const path = require('path');
const os = require('os');

// Mock dependencies
const mockFileSystemUtilsInstance = {
    ensureDir: jest.fn(),
    exists: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    deleteFile: jest.fn(),
    createDirectory: jest.fn()
};

const mockLoggerInstance = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
};

jest.mock('@libs/system/file-operations', () => jest.fn(() => mockFileSystemUtilsInstance));

jest.mock('@libs/logging-monitoring/logging', () => ({
    LoggingUtils: jest.fn(() => mockLoggerInstance)
}));

describe('PidFilePersistence', () => {
    let persistenceManager;
    let testPidFilePath;

    beforeEach(() => {
        jest.clearAllMocks();
        testPidFilePath = path.join(os.tmpdir(), 'test-pid-file-persistence.json');
        persistenceManager = new PidFilePersistence(testPidFilePath, mockLoggerInstance, mockFileSystemUtilsInstance);
    });

    describe('Constructor', () => {
        test('should initialize with a given file path', () => {
            expect(persistenceManager.pidFilePath).toBe(testPidFilePath);
            expect(persistenceManager.writeQueue).toEqual([]);
            expect(persistenceManager.isWriting).toBe(false);
            expect(persistenceManager.logger).toBe(mockLoggerInstance);
            expect(persistenceManager.fileSystem).toBe(mockFileSystemUtilsInstance);
        });

        test('should initialize with default file path if not provided', () => {
            const defaultManager = new PidFilePersistence(undefined, mockLoggerInstance, mockFileSystemUtilsInstance);
            expect(defaultManager.pidFilePath).toBeDefined();
            expect(defaultManager.pidFilePath).toContain('unified-daemon-pids.json');
        });
    });

    describe('initializePersistence', () => {
        test('should create directory and initial file if not exist', async () => {
            mockFileSystemUtilsInstance.exists.mockResolvedValue(false);

            await persistenceManager.initializePersistence();

            expect(mockFileSystemUtilsInstance.ensureDir).toHaveBeenCalledWith(path.dirname(testPidFilePath));
            expect(mockFileSystemUtilsInstance.exists).toHaveBeenCalledWith(testPidFilePath);
            expect(mockFileSystemUtilsInstance.writeFile).toHaveBeenCalledWith(
                testPidFilePath,
                expect.stringContaining('"version": "1.0"')
            );
            expect(mockLoggerInstance.log).toHaveBeenCalledWith('📄 Создан начальный PID файл');
        });

        test('should not create file if it already exists', async () => {
            mockFileSystemUtilsInstance.exists.mockResolvedValue(true);

            await persistenceManager.initializePersistence();

            expect(mockFileSystemUtilsInstance.ensureDir).toHaveBeenCalledWith(path.dirname(testPidFilePath));
            expect(mockFileSystemUtilsInstance.exists).toHaveBeenCalledWith(testPidFilePath);
            expect(mockFileSystemUtilsInstance.writeFile).not.toHaveBeenCalled();
            expect(mockLoggerInstance.log).not.toHaveBeenCalledWith('📄 Создан начальный PID файл');
        });

        test('should handle errors during initialization', async () => {
            const error = new Error('Test init error');
            mockFileSystemUtilsInstance.ensureDir.mockRejectedValue(error);

            await expect(persistenceManager.initializePersistence()).rejects.toThrow(error);
            expect(mockLoggerInstance.error).toHaveBeenCalledWith('❌ Ошибка инициализации PidFilePersistence:', error);
        });
    });

    describe('readPidData', () => {
        const mockData = {
            version: "1.0",
            daemons: { 'test-daemon': { status: 'running' } },
            queue: { active: null, waiting: [], maxConcurrent: 1, processingOrder: [] },
            metadata: { totalDaemons: 1 }
        };

        beforeEach(async () => {
            mockFileSystemUtilsInstance.ensureDir.mockResolvedValue();
            mockFileSystemUtilsInstance.writeFile.mockResolvedValue();
            mockFileSystemUtilsInstance.exists.mockResolvedValue(false); // Assume file doesn't exist for init
            await persistenceManager.initializePersistence();
            mockFileSystemUtilsInstance.exists.mockResolvedValue(true); // Now assume file exists for read operations
            jest.clearAllMocks(); // Clear mocks again to only test readPidData calls
            mockLoggerInstance.log.mockClear(); // Clear console log mocks for cleaner testing
            mockLoggerInstance.error.mockClear();
        });

        test('should read existing PID data', async () => {
            mockFileSystemUtilsInstance.readFile.mockResolvedValue(JSON.stringify(mockData));

            const data = await persistenceManager.readPidData();
            expect(data).toEqual(mockData);
            expect(mockFileSystemUtilsInstance.readFile).toHaveBeenCalledWith(testPidFilePath, 'utf8');
        });

        test('should return initial structure if file is empty', async () => {
            mockFileSystemUtilsInstance.readFile.mockResolvedValue('');

            const data = await persistenceManager.readPidData();
            expect(data).toEqual({
                version: "1.0",
                daemons: {},
                queue: { active: null, waiting: [], maxConcurrent: 1, processingOrder: [] },
                metadata: { totalDaemons: 0 }
            });
            expect(mockLoggerInstance.log).toHaveBeenCalledWith('⚠️ PID файл пуст, инициализация дефолтной структуры.');
        });

        test('should handle JSON parsing errors gracefully', async () => {
            mockFileSystemUtilsInstance.readFile.mockResolvedValue('invalid json');

            const data = await persistenceManager.readPidData();
            expect(data).toEqual({
                version: "1.0",
                daemons: {},
                queue: { active: null, waiting: [], maxConcurrent: 1, processingOrder: [] },
                metadata: { totalDaemons: 0 }
            });
            expect(mockLoggerInstance.error).toHaveBeenCalledWith(expect.stringContaining('Ошибка чтения или парсинга PID файла'), expect.any(SyntaxError));
        });

        test('should handle file read errors', async () => {
            const error = new Error('Read error');
            mockFileSystemUtilsInstance.readFile.mockRejectedValue(error);

            await expect(persistenceManager.readPidData()).rejects.toThrow(error);
            expect(mockLoggerInstance.error).toHaveBeenCalledWith('❌ Ошибка чтения PID файла:', error);
        });
    });

    describe('writePidData', () => {
        const testData = {
            version: "1.0",
            daemons: { 'new-daemon': { status: 'pending' } },
            queue: { active: null, waiting: [], maxConcurrent: 1, processingOrder: [] },
            metadata: { totalDaemons: 1 }
        };

        beforeEach(async () => {
            mockFileSystemUtilsInstance.ensureDir.mockResolvedValue();
            mockFileSystemUtilsInstance.writeFile.mockResolvedValue();
            mockFileSystemUtilsInstance.exists.mockResolvedValue(true);
            await persistenceManager.initializePersistence();
            jest.clearAllMocks(); // Clear mocks again for writePidData tests
            mockLoggerInstance.log.mockClear();
            mockLoggerInstance.error.mockClear();
        });

        test('should write PID data to file', async () => {
            await persistenceManager.writePidData(testData);

            // Wait for the queue processing to complete
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(mockFileSystemUtilsInstance.writeFile).toHaveBeenCalledWith(
                testPidFilePath,
                JSON.stringify(testData, null, 2)
            );
            expect(mockLoggerInstance.log).toHaveBeenCalledWith('💾 PID файл успешно обновлен');
        });

        test('should queue write operations', async () => {
            const promise1 = persistenceManager.writePidData({ data: 'first' });
            const promise2 = persistenceManager.writePidData({ data: 'second' });

            // Wait for queue processing
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(persistenceManager.writeQueue.length).toBe(0);
            expect(mockFileSystemUtilsInstance.writeFile).toHaveBeenCalledTimes(2);
            expect(mockFileSystemUtilsInstance.writeFile).toHaveBeenCalledWith(testPidFilePath, JSON.stringify({ data: 'first' }, null, 2));
            expect(mockFileSystemUtilsInstance.writeFile).toHaveBeenCalledWith(testPidFilePath, JSON.stringify({ data: 'second' }, null, 2));

            await Promise.all([promise1, promise2]);
        });

        test('should handle write errors gracefully', async () => {
            const error = new Error('Write error');
            mockFileSystemUtilsInstance.writeFile.mockRejectedValue(error);

            await expect(persistenceManager.writePidData(testData)).rejects.toThrow(error);
            expect(mockLoggerInstance.error).toHaveBeenCalledWith('❌ Ошибка записи PID файла:', error);
        });
    });

    describe('createInitialPidFile', () => {
        test('should create an initial PID file with default structure', async () => {
            mockFileSystemUtilsInstance.writeFile.mockResolvedValue();

            // Define the expected initial data as it is now in PidFilePersistence.js
            const expectedInitialData = {
                version: "1.0",
                created: expect.any(String),
                lastUpdate: expect.any(String),
                daemons: {},
                queue: { active: null, waiting: [], maxConcurrent: 1, processingOrder: [] },
                metadata: {
                    totalDaemons: 0,
                    runningDaemons: 0,
                    queuedDaemons: 0,
                    failedDaemons: 0
                }
            };

            await persistenceManager.createInitialPidFile();

            expect(mockFileSystemUtilsInstance.writeFile).toHaveBeenCalledWith(
                testPidFilePath,
                expect.stringContaining('"version": "1.0"')
            );
            expect(mockLoggerInstance.log).toHaveBeenCalledWith('📄 Создан начальный PID файл');
        });

        test('should handle errors during initial file creation', async () => {
            const error = new Error('Initial write error');
            mockFileSystemUtilsInstance.writeFile.mockRejectedValue(error);

            // Note: createInitialPidFile doesn't throw errors, it just logs them
            await persistenceManager.createInitialPidFile();
            expect(mockLoggerInstance.error).toHaveBeenCalledWith('❌ Ошибка создания начального PID файла:', error);
        });
    });
});
