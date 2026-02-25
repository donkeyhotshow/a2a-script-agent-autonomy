const ProtocolCore = require('../protocol-core');
const EventEmitter = require('eventemitter3');

jest.mock('../../core/logger-core/index.js', () => ({
    LoggerCore: jest.fn().mockImplementation(() => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
    }))
}));

jest.mock('../../core/error-handler/src/error-handler.js', () => ({
    ErrorHandler: jest.fn().mockImplementation(() => ({
        handleError: jest.fn()
    }))
}));

jest.mock('../../core/config-manager/index.js', () => ({
    ConfigManager: jest.fn().mockImplementation(() => ({
        autoLoad: jest.fn().mockResolvedValue({})
    }))
}));

describe('ProtocolCore', () => {
    let protocolCore;
    let mockLogger;
    let mockErrorHandler;
    let mockConfigManager;

    beforeEach(() => {
        mockLogger = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn()
        };
        mockErrorHandler = {
            handleError: jest.fn()
        };
        mockConfigManager = {
            autoLoad: jest.fn().mockResolvedValue({})
        };

        protocolCore = new ProtocolCore({
            logger: mockLogger,
            errorHandler: mockErrorHandler,
            configManager: mockConfigManager
        });
    });

    describe('constructor', () => {
        test('should initialize with default options', () => {
            const core = new ProtocolCore();
            expect(core).toBeInstanceOf(EventEmitter);
            expect(core.connections).toBeInstanceOf(Map);
            expect(core.messageHandlers).toBeInstanceOf(Map);
            expect(core.routes).toBeInstanceOf(Map);
            expect(core.middleware).toEqual([]);
            expect(core.isInitialized).toBe(false);
            expect(core.isShutdown).toBe(false);
        });

        test('should initialize with custom options', () => {
            const customOptions = {
                maxConnections: 200,
                connectionTimeout: 60000,
                messageTimeout: 20000,
                enableHeartbeat: false
            };
            const core = new ProtocolCore(customOptions);
            expect(core.config.maxConnections).toBe(200);
            expect(core.config.connectionTimeout).toBe(60000);
            expect(core.config.messageTimeout).toBe(20000);
            expect(core.config.enableHeartbeat).toBe(false);
        });
    });

    describe('initialize', () => {
        test('should initialize protocol core successfully', async () => {
            const initializeSpy = jest.spyOn(protocolCore, 'emit');
            await protocolCore.initialize();

            expect(mockConfigManager.autoLoad).toHaveBeenCalledWith('mcp-protocol');
            expect(protocolCore.isInitialized).toBe(true);
            expect(initializeSpy).toHaveBeenCalledWith('initialized');
            expect(mockLogger.info).toHaveBeenCalledWith('ProtocolCore успешно инициализирован');
        });

        test('should not initialize twice', async () => {
            await protocolCore.initialize();
            await protocolCore.initialize();

            expect(mockLogger.warn).toHaveBeenCalledWith('ProtocolCore уже инициализирован');
            expect(mockConfigManager.autoLoad).toHaveBeenCalledTimes(1);
        });

        test('should handle initialization errors', async () => {
            const testError = new Error('Init error');
            mockConfigManager.autoLoad.mockRejectedValueOnce(testError);

            await expect(protocolCore.initialize()).rejects.toThrow(testError);
            expect(mockErrorHandler.handleError).toHaveBeenCalledWith(testError, {
                context: 'ProtocolCore.initialize'
            });
        });
    });

    describe('addGlobalMiddleware', () => {
        test('should add middleware function', () => {
            const middleware = jest.fn();
            protocolCore.addGlobalMiddleware(middleware);

            expect(protocolCore.middleware).toContain(middleware);
            expect(mockLogger.debug).toHaveBeenCalledWith('Добавлен глобальный middleware', {
                middlewareCount: 1
            });
        });

        test('should throw error for non-function middleware', () => {
            expect(() => {
                protocolCore.addGlobalMiddleware('not a function');
            }).toThrow('Middleware должен быть функцией');
        });
    });

    // Здесь можно добавить больше тестов для других методов
    // например, для обработки сообщений, управления соединениями и т.д.
});
