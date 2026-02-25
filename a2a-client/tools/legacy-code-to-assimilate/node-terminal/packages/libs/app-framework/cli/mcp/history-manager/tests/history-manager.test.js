const HistoryManager = require('../src/history-manager');
const path = require('path');
const fs = require('fs').promises;

describe('HistoryManager', () => {
    let historyManager;
    let testDir;
    let mockLogger;

    beforeEach(async () => {
        testDir = path.join(__dirname, 'test-sessions');
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        };
        await fs.mkdir(testDir, { recursive: true });
        historyManager = new HistoryManager(testDir, mockLogger, {
            maxRecordsPerSession: 5,
            maxLogFileSize: 1024,
            cleanupInterval: 1000,
            autoCleanup: false
        });
    });

    afterEach(async () => {
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch (error) {
            console.error('Ошибка при очистке тестовой директории:', error);
        }
    });

    test('sample test', () => {
        expect(true).toBe(true);
    });

    describe('constructor', () => {
        test('should initialize with default options', () => {
            const manager = new HistoryManager(testDir, mockLogger);
            expect(manager.maxRecordsPerSession).toBe(1000);
            expect(manager.maxLogFileSize).toBe(10 * 1024 * 1024);
            expect(manager.autoCleanup).toBe(true);
        });

        test('should initialize with custom options', () => {
            expect(historyManager.maxRecordsPerSession).toBe(5);
            expect(historyManager.maxLogFileSize).toBe(1024);
            expect(historyManager.autoCleanup).toBe(false);
        });
    });

    // ...existing code...
});