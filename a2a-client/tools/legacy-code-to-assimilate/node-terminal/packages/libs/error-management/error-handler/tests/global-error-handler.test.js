const { EventEmitter } = require('events');

// Мокируем fs.promises для предотвращения реальных операций с файловой системой
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(() => Promise.resolve()),
    writeFile: jest.fn(() => Promise.resolve()),
    readFile: jest.fn(() => Promise.resolve('{}')), // По умолчанию возвращаем пустой объект JSON
    unlink: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('os', () => ({
  hostname: jest.fn(() => 'mocked-hostname'),
}));

// Мокируем FileOperations
jest.mock('C:/apps/libs/system/file-operations/src/file-operations.cjs', () => {
  return jest.fn().mockImplementation(() => {
    return {
      // Мокируем только те методы, которые используются LoggingUtils
      ensureDir: jest.fn(() => Promise.resolve()),
      deleteFile: jest.fn(() => Promise.resolve()), // Для cleanupOldTasks
      moveFile: jest.fn(() => Promise.resolve()),
      existsSync: jest.fn(() => true), // Предполагаем, что файлы существуют для тестов
      mkdirSync: jest.fn(),
      accessSync: jest.fn(),
      statSync: jest.fn(() => ({ size: 0 })), // Возвращаем фиктивный размер файла
      createWriteStream: jest.fn(() => ({ on: jest.fn(), write: jest.fn(), end: jest.fn() }))
    };
  });
});

// Мокируем LoggingUtils (глобальная область видимости)
const MockLoggingUtils = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

// Использование jest.doMock для ErrorCoreManager
jest.doMock('C:/apps/libs/core/error-core', () => {
  const MockErrorCoreManager = jest.fn().mockImplementation(function() { // Использование обычной функции для доступа к 'this'
    this.initialize = jest.fn().mockResolvedValue(true);
    this.handleError = jest.fn().mockImplementation(async (error, context, source, severity, customCode, appId) => ({ id: 'error-id-123', error, context, source, severity, customCode, appId }));
    this.getErrorStats = jest.fn().mockReturnValue({ totalErrors: 1, bySeverity: {}, byAppId: {}, byCode: {} });
    this.getOpenTasks = jest.fn().mockResolvedValue([]);
    this.cleanupOldTasks = jest.fn().mockResolvedValue({ removedTasks: 0, remainingTasks: 0 });
    this.resetErrorCounts = jest.fn();
    this.addPattern = jest.fn(); // addPattern вместо addErrorPattern
    this.analyzeError = jest.fn().mockReturnValue({ pattern: 'unknown', recipe: {}, error: {}, type: 'unknown' });
    this.getRecipe = jest.fn();
    this.getAllRecipes = jest.fn().mockReturnValue([]);
    this.addRecipe = jest.fn();
    this.generateErrorReport = jest.fn().mockReturnValue({});
    // Неявный возврат this
  });
  // Добавляем EventEmitter для MockErrorCoreManager, если он нужен
  Object.assign(MockErrorCoreManager.prototype, EventEmitter.prototype);
  return MockErrorCoreManager; // Возвращаем сам мок-класс, а не экземпляр
});

// Импорт для проверки instanceof - должен быть после doMock
const ErrorCoreManager = require('C:/apps/libs/core/error-core');
console.log('Type of ErrorCoreManager after require:', typeof ErrorCoreManager, ErrorCoreManager);

// Тестируемый модуль
const globalErrorHandlerInstance = require('../global-error-handler.js');
const { GlobalErrorHandler } = require('../global-error-handler.js');

describe('GlobalErrorHandler - Unit Tests', () => {
  let handler; // Переменная handler будет переопределена в beforeEach
  let mockProcessOn;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    handler = new GlobalErrorHandler({ logger: MockLoggingUtils });

    mockProcessOn = jest.spyOn(process, 'on').mockImplementation((event, listener) => {
      // Сохраняем листенеры для последующего вызова в тестах
      if (event === 'uncaughtException') handler._mockUncaughtExceptionListener = listener;
      if (event === 'unhandledRejection') handler._mockUnhandledRejectionListener = listener;
      // Предотвращаем стандартное поведение Node.js для этих событий
      // (т.е. процесс не должен завершаться аварийно в тестах)
    });

    jest.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    if (mockProcessOn && mockProcessOn.mockRestore) {
      mockProcessOn.mockRestore();
    }
    jest.restoreAllMocks();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('should initialize ErrorCoreManager and set up global handlers', async () => {
    await handler.initialize({ logger: MockLoggingUtils });

    expect(handler.errorCoreManager).toBeInstanceOf(ErrorCoreManager);
    expect(handler.errorCoreManager.initialize).toHaveBeenCalledTimes(1);
    expect(mockProcessOn).toHaveBeenCalledWith('uncaughtException', expect.any(Function));
    expect(mockProcessOn).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));
    expect(handler.isInitialized).toBe(true);
    expect(MockLoggingUtils.info).toHaveBeenCalledWith(expect.stringContaining('[GlobalErrorHandler] Initialized successfully with ErrorCoreManager'));
  });

  test('should throw error if ErrorCoreManager initialization fails', async () => {
    // Мокируем конструктор ErrorCoreManager, чтобы он возвращал объект с отклоненным initialize
    ErrorCoreManager.mockImplementationOnce(() => ({
      initialize: jest.fn().mockRejectedValueOnce(new Error('ECM Init Failed')),
      handleError: jest.fn(), // Необходимо для того, чтобы весь интерфейс был замокирован
      // Добавляем все остальные мокированные методы, которые могут быть вызваны
      getErrorStats: jest.fn(),
      getOpenTasks: jest.fn(),
      cleanupOldTasks: jest.fn(),
      resetErrorCounts: jest.fn(),
      addPattern: jest.fn(),
      analyzeError: jest.fn(),
      getRecipe: jest.fn(),
      getAllRecipes: jest.fn(),
      addRecipe: jest.fn(),
      generateErrorReport: jest.fn(),
    }));

    // Пересоздаем handler, чтобы он использовал наш замокированный конструктор ErrorCoreManager
    handler = new GlobalErrorHandler({ logger: MockLoggingUtils });

    await expect(handler.initialize({ logger: MockLoggingUtils })).rejects.toThrow('ECM Init Failed');
    expect(MockLoggingUtils.error).toHaveBeenCalledWith(expect.stringContaining('[GlobalErrorHandler] Failed to initialize ErrorCoreManager:'), 'ECM Init Failed');
  });

  test('should collect uncaught exceptions and exit process', async () => {
    await handler.initialize({ logger: MockLoggingUtils });

    const mockError = new Error('Test Uncaught Exception');
    // Теперь вызываем напрямую сохраненный слушатель
    await handler._mockUncaughtExceptionListener(mockError);

    expect(MockLoggingUtils.error).toHaveBeenCalledWith('[GlobalErrorHandler] Uncaught Exception:', mockError.message, { stack: mockError.stack });
    expect(handler.errorCoreManager.handleError).toHaveBeenCalledTimes(1);
    expect(handler.errorCoreManager.handleError).toHaveBeenCalledWith(
      mockError,
      expect.objectContaining({
        type: 'uncaughtException',
        timestamp: expect.any(String),
      }),
      'process',
      'critical',
      null,
      'system'
    );
    jest.advanceTimersByTime(1000);
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  test('should collect unhandled rejections', async () => {
    await handler.initialize({ logger: MockLoggingUtils });

    const mockReason = new Error('Test Unhandled Rejection');
    // Создаем фиктивный объект promise вместо реального отклоненного промиса
    const mockPromise = { toString: () => '[object Promise]' };

    // Теперь вызываем напрямую сохраненный слушатель
    await handler._mockUnhandledRejectionListener(mockReason, mockPromise);

    expect(MockLoggingUtils.error).toHaveBeenCalledWith('[GlobalErrorHandler] Unhandled Rejection:', mockReason);
    expect(handler.errorCoreManager.handleError).toHaveBeenCalledTimes(1);
    expect(handler.errorCoreManager.handleError).toHaveBeenCalledWith(
      // reason instanceof Error ? reason : new Error(String(reason)), - GlobalErrorHandler сам конвертирует reason в Error
      mockReason,
      expect.objectContaining({
        type: 'unhandledRejection',
        promise: expect.any(String), // Добавлено ожидание promise
        timestamp: expect.any(String), // Добавлено ожидание timestamp
      }),
      'process',
      'high',
      null,
      'system'
    );
  });

  test('should handle Express errors via middleware', async () => {
    await handler.initialize({ logger: MockLoggingUtils });
    const expressMiddleware = handler.getExpressMiddleware();

    const mockError = new Error('Express Route Error');
    const mockReq = { url: '/test-route', method: 'GET', ip: '127.0.0.1', get: jest.fn().mockReturnValue('mock-user-agent') };
    const mockRes = {};
    const mockNext = jest.fn();

    await expressMiddleware(mockError, mockReq, mockRes, mockNext);

    expect(MockLoggingUtils.error).toHaveBeenCalledWith(expect.stringContaining('Express Error'), mockError.message, expect.any(Object));
    expect(handler.errorCoreManager.handleError).toHaveBeenCalledTimes(1);
    expect(handler.errorCoreManager.handleError).toHaveBeenCalledWith(
      mockError,
      expect.objectContaining({
        type: 'express',
        url: '/test-route',
        method: 'GET',
        userAgent: 'mock-user-agent',
        ip: '127.0.0.1',
        timestamp: expect.any(String),
      }),
      'api',
      'medium',
      null,
      'api'
    );
    expect(mockNext).toHaveBeenCalledWith(mockError);
  });

  test('should allow manual error collection', async () => {
    await handler.initialize({ logger: MockLoggingUtils });
    const customError = new Error('Custom Error');
    // Передаем все необходимые параметры в collectError
    await handler.collectError({
      appId: 'custom',
      error: customError,
      source: 'manual',
      severity: 'low',
      context: { customData: 'some value' },
      customCode: 'CUST001',
    });

    expect(handler.errorCoreManager.handleError).toHaveBeenCalledWith(
      customError, // error объект
      expect.objectContaining({ customData: 'some value' }), // context
      'manual', // source
      'low', // severity
      'CUST001', // customCode
      'custom' // appId
    );
  });

  test('should return error statistics from ErrorCoreManager', async () => {
    await handler.initialize({ logger: MockLoggingUtils });
    const stats = handler.getErrorStats();
    expect(stats).toEqual({ totalErrors: 1, bySeverity: {}, byAppId: {}, byCode: {} });
    expect(handler.errorCoreManager.getErrorStats).toHaveBeenCalledTimes(1);
  });

  test('should add error pattern to ErrorCoreManager', async () => {
    await handler.initialize({ logger: MockLoggingUtils });
    handler.addErrorPattern('CUSTOM_CODE', /custom pattern/i);
    expect(handler.errorCoreManager.addPattern).toHaveBeenCalledWith('CUSTOM_CODE', /custom pattern/i, {});
  });
});
