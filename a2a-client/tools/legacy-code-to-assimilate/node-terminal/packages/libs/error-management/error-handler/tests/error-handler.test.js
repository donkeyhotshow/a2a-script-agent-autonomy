const {
  ErrorHandlingUtils,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  validateInput
} = require('../index.js');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const fileOperations = require('../../../system/file-operations');
// Mock logger to avoid dependency issues
let logger; // Declare logger here

jest.mock('../../../system/file-operations', () => ({
  deleteFile: jest.fn().mockResolvedValue(undefined),
  deleteDir: jest.fn().mockResolvedValue(undefined),
}));

describe('ErrorHandlingUtils', () => {
  let errorHandler;
  let testLogPath;
  let testReportDir;
  let consoleErrorSpy;

  beforeEach(() => {
    testLogPath = path.join(os.tmpdir(), `test-errors-${Date.now()}.log`);
    testReportDir = path.join(os.tmpdir(), `test-reports-${Date.now()}`);

    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }; // Initialize logger for each test

    errorHandler = new ErrorHandlingUtils({
      logger: logger,
      errorLogPath: testLogPath,
      reportDir: testReportDir,
      maxHistorySize: 10
    });
    consoleErrorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});

    jest.spyOn(fs, 'appendFile').mockResolvedValue(undefined);
    jest.spyOn(fs, 'writeFile').mockResolvedValue(undefined);
    jest.spyOn(fs, 'mkdir').mockResolvedValue(undefined);
    jest.spyOn(fs, 'readdir').mockResolvedValue([]);
    jest.spyOn(fs, 'readFile').mockResolvedValue('');

    // Mock fileOperations for cleanup
    jest.spyOn(fileOperations, 'deleteFile').mockResolvedValue(undefined);
    jest.spyOn(fileOperations, 'deleteDir').mockResolvedValue(undefined);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    try {
      await fileOperations.deleteFile(testLogPath);
      await fileOperations.deleteDir(testReportDir);
      // Remove this line as logger.options.filePath is not defined on the mock
      // await fileOperations.deleteFile(logger.options.filePath);
    } catch (error) {
      // Игнорируем ошибки очистки
    }
  });

  describe('constructor', () => {
    test('should initialize with default options', () => {
      const defaultHandler = new ErrorHandlingUtils({
        logger: logger,
      });
      expect(defaultHandler.projectRoot).toBe(process.cwd());
      expect(defaultHandler.maxRetries).toBe(3);
      expect(defaultHandler.retryDelays).toEqual([1000, 2000, 4000]);
      expect(defaultHandler.errorHistory).toEqual([]);
      expect(defaultHandler.errorLogPath).toBe(path.join(process.cwd(), 'logs', 'errors.log'));
      expect(defaultHandler.reportDir).toBe(path.join(process.cwd(), 'error_reports'));
    });

    test('should initialize with custom options', () => {
      const customHandler = new ErrorHandlingUtils({
        logger: logger,
        maxRetries: 5,
        retryDelays: [500, 1000],
        maxHistorySize: 50,
        projectRoot: '/custom/root',
        errorLogPath: '/custom/log.log',
        reportDir: '/custom/reports',
      });

      expect(customHandler.maxRetries).toBe(5);
      expect(customHandler.retryDelays).toEqual([500, 1000]);
      expect(customHandler.maxHistorySize).toBe(50);
      expect(customHandler.projectRoot).toBe('/custom/root');
      expect(customHandler.errorLogPath).toBe('/custom/log.log');
      expect(customHandler.reportDir).toBe('/custom/reports');
    });

    test('should throw error without logger', () => {
      expect(() => new ErrorHandlingUtils()).toThrow('[ErrorHandlingUtils] Logger instance must be provided.');
    });

    test('should call ensureErrorLogFile on initialization', async () => {
      const ensureSpy = jest.spyOn(errorHandler, 'ensureErrorLogFile').mockResolvedValue(undefined);
      new ErrorHandlingUtils({
        logger: logger,
      });
      expect(ensureSpy).toHaveBeenCalled();
      ensureSpy.mockRestore();
    });

    test('should handle initialization error in ensureErrorLogFile', async () => {
      const loggerErrorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
      const fsMkdirSpy = jest.spyOn(fs, 'mkdir').mockRejectedValueOnce(new Error('Permission denied'));

      const newHandler = new ErrorHandlingUtils({
        logger: logger,
        errorLogPath: '/restricted/path/errors.log'
      });

      expect(loggerErrorSpy).toHaveBeenCalledWith('Ошибка создания файла логов ошибок:', 'Permission denied');
      fsMkdirSpy.mockRestore();
      loggerErrorSpy.mockRestore();
    });
  });

  describe('ensureErrorLogFile', () => {
    test('should create log directory and file if they do not exist', async () => {
      const customPath = path.join(os.tmpdir(), 'custom-errors.log');
      const customHandler = new ErrorHandlingUtils({
        logger: logger,
        errorLogPath: customPath
      });

      // Ensure file doesn't exist initially
      try {
        await fs.unlink(customPath);
      } catch (error) {
        // File doesn't exist, which is fine
      }

      await customHandler.ensureErrorLogFile();

      // Verify directory was created
      expect(fs.mkdir).toHaveBeenCalledWith(path.dirname(customPath), { recursive: true });

      // Verify file was created
      const fileExists = await fs.access(customPath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
    });

    test('should not recreate file if it already exists', async () => {
      const existingPath = path.join(os.tmpdir(), 'existing-errors.log');
      await fs.writeFile(existingPath, 'existing content', 'utf8');

      const customHandler = new ErrorHandlingUtils({
        logger: logger,
        errorLogPath: existingPath
      });

      const writeFileSpy = jest.spyOn(fs, 'writeFile');

      await customHandler.ensureErrorLogFile();

      // writeFile should not be called since file exists
      expect(writeFileSpy).not.toHaveBeenCalled();

      // Cleanup
      await fs.unlink(existingPath);
      writeFileSpy.mockRestore();
    });
  });

  describe('generateParametersHash', () => {
    test('should generate consistent hash for same parameters', () => {
      const params = { key: 'value', number: 123 };
      const hash1 = errorHandler.generateParametersHash(params);
      const hash2 = errorHandler.generateParametersHash(params);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{32}$/); // MD5 hash
    });

    test('should generate different hashes for different parameters', () => {
      const hash1 = errorHandler.generateParametersHash({ key: 'value1' });
      const hash2 = errorHandler.generateParametersHash({ key: 'value2' });

      expect(hash1).not.toBe(hash2);
    });

    test('should handle parameter order consistently', () => {
      const params1 = { a: 1, b: 'two' };
      const params2 = { b: 'two', a: 1 };
      const hash1 = errorHandler.generateParametersHash(params1);
      const hash2 = errorHandler.generateParametersHash(params2);
      expect(hash1).toBe(hash2);
    });
  });

  describe('logError', () => {
    test('should log error with context to history and file', async () => {
      const error = new Error('Test error');
      const context = { userId: '123', action: 'login' };

      const errorEntry = await errorHandler.logError(error, context);

      expect(errorEntry.message).toBe('Test error');
      expect(errorEntry.context).toEqual(context);
      expect(errorEntry.type).toBe('Error');
      expect(errorEntry.timestamp).toBeDefined();
      expect(errorEntry.stack).toBe(error.stack);

      expect(errorHandler.errorHistory).toHaveLength(1);
      expect(errorHandler.errorHistory[0]).toEqual(expect.objectContaining(errorEntry));

      expect(fs.appendFile).toHaveBeenCalledWith(testLogPath, expect.any(String), 'utf8');
      expect(logger.error).toHaveBeenCalledWith(`[ErrorHandler] ${errorEntry.message}`, context);
    });

    test('should handle string error', async () => {
      const errorString = 'String error';

      const errorEntry = await errorHandler.logError(errorString);

      expect(errorEntry.message).toBe('String error');
      expect(errorEntry.type).toBe('Error');
      expect(errorHandler.errorHistory).toHaveLength(1);
      expect(fs.appendFile).toHaveBeenCalledTimes(1);
    });

    test('should maintain error history size limit', async () => {
      // Устанавливаем лимит истории в 2
      errorHandler.maxHistorySize = 2;

      // Добавляем больше ошибок, чем размер истории
      await errorHandler.logError(new Error('Error 1'));
      await errorHandler.logError(new Error('Error 2'));
      await errorHandler.logError(new Error('Error 3'));

      expect(errorHandler.errorHistory).toHaveLength(2);
      expect(errorHandler.errorHistory[0].message).toBe('Error 2');
      expect(errorHandler.errorHistory[1].message).toBe('Error 3');
    });

    test('should count error occurrences', async () => {
      const error = new Error('Duplicate error');

      await errorHandler.logError(error);
      await errorHandler.logError(error);

      const errorKey = 'Error:Duplicate error';
      expect(errorHandler.errorCounts.get(errorKey)).toBe(2);
    });

    test('should log error if writing to log file fails', async () => {
      fs.appendFile.mockRejectedValueOnce(new Error('Write file failed'));
      const error = new Error('Test error');
      await errorHandler.logError(error);
      expect(logger.error).toHaveBeenCalledWith('Ошибка записи в лог:', 'Write file failed');
    });

    test('should handle error with empty message', async () => {
      const error = new Error('');
      const context = { userId: '123' };

      const errorEntry = await errorHandler.logError(error, context);

      expect(errorEntry.message).toBe('');
      expect(errorEntry.context).toEqual(context);
      expect(errorEntry.type).toBe('Error');
      expect(errorHandler.errorHistory).toHaveLength(1);
    });

    test('should handle error with undefined stack', async () => {
      const error = new Error('No stack error');
      delete error.stack;

      const errorEntry = await errorHandler.logError(error);

      expect(errorEntry.message).toBe('No stack error');
      expect(errorEntry.stack).toBeUndefined();
      expect(errorHandler.errorHistory).toHaveLength(1);
    });

    test('should handle non-Error object as error parameter', async () => {
      const errorString = 'String error';

      const errorEntry = await errorHandler.logError(errorString);

      expect(errorEntry.message).toBe('String error');
      expect(errorEntry.type).toBe('Error');
      expect(errorEntry.stack).toBeUndefined();
    });
  });

  describe('createErrorReport', () => {
    test('should create error report file', async () => {
      const error = new Error('Report test error');
      const options = {
        error,
        type: 'test',
        context: 'testing context',
        additionalData: { testField: 'testValue' }
      };

      const reportPath = await errorHandler.createErrorReport(options);

      expect(reportPath).toContain('.md');
      expect(reportPath).toContain(testReportDir); // reportPath должен содержать testReportDir

      // Проверяем что файл создан и содержит ожидаемый контент
      expect(fs.mkdir).toHaveBeenCalledWith(testReportDir, { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledWith(reportPath, expect.any(String), 'utf8');
      const content = fs.writeFile.mock.calls[0][1]; // Получаем содержимое, переданное в writeFile
      expect(content).toContain('# Отчет об ошибке');
      expect(content).toContain('Report test error');
      expect(content).toContain('testField');
    });

    test('should handle report creation error', async () => {
      const error = new Error('Report creation error');
      const options = {
        error,
        type: 'test',
        context: 'error context'
      };

      fs.mkdir.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(errorHandler.createErrorReport(options)).rejects.toThrow();
      expect(logger.error).toHaveBeenCalledWith('Ошибка создания отчета об ошибке:', expect.any(String));
    });
  });

  describe('checkExistingError', () => {
    test('should return exists false for non-existent error', async () => {
      jest.spyOn(fs, 'readdir').mockResolvedValueOnce([]); // Нет файлов в директории отчетов
      const result = await errorHandler.checkExistingError('nonexistent-hash');

      expect(result.exists).toBe(false);
      expect(result.filePath).toBeNull();
    });

    test('should find existing error report', async () => {
      const errorHash = errorHandler.generateParametersHash(new Error('Existing error'));
      const mockReportFileName = `CRITICAL_ERROR-${errorHash}.md`;
      const mockReportPath = path.join(testReportDir, mockReportFileName);

      jest.spyOn(fs, 'readdir').mockResolvedValueOnce([mockReportFileName]);

      const result = await errorHandler.checkExistingError(errorHash);

      expect(result.exists).toBe(true);
      expect(result.filePath).toBe(mockReportPath);
    });

    test('should handle errors during checkExistingError', async () => {
      jest.spyOn(fs, 'readdir').mockRejectedValueOnce(new Error('Read dir error'));

      const result = await errorHandler.checkExistingError('any-hash');
      expect(result.exists).toBe(false);
      expect(result.filePath).toBeNull();
      expect(logger.error).toHaveBeenCalledWith('Ошибка проверки существующих отчетов:', expect.any(String));
    });

    test('should return false when no files in directory', async () => {
      jest.spyOn(fs, 'readdir').mockResolvedValueOnce([]);

      const result = await errorHandler.checkExistingError('nonexistent-hash');
      expect(result.exists).toBe(false);
      expect(result.filePath).toBeNull();
    });

    test('should return false when file exists but status is not open', async () => {
      const errorHash = 'test123hash';
      const fileName = `CRITICAL_ERROR-${errorHash}.md`;
      const filePath = path.join(testReportDir, fileName);

      jest.spyOn(fs, 'readdir').mockResolvedValueOnce([fileName]);
      jest.spyOn(fs, 'readFile').mockResolvedValueOnce('# Отчет об ошибке\n**Статус:** Закрыта\nOther content');

      const result = await errorHandler.checkExistingError(errorHash);
      expect(result.exists).toBe(false);
      expect(result.filePath).toBeNull();
    });

    test('should handle custom work directory', async () => {
      const customWorkDir = path.join(os.tmpdir(), 'custom-work');
      const errorHash = 'custom123hash';
      const fileName = `CRITICAL_ERROR-${errorHash}.md`;

      jest.spyOn(fs, 'mkdir').mockResolvedValueOnce(undefined);
      jest.spyOn(fs, 'readdir').mockResolvedValueOnce([fileName]);
      jest.spyOn(fs, 'readFile').mockResolvedValueOnce('# Отчет об ошибке\n**Статус:** Открыта\nOther content');

      const result = await errorHandler.checkExistingError(errorHash, customWorkDir);

      expect(fs.mkdir).toHaveBeenCalledWith(customWorkDir, { recursive: true });
      expect(result.exists).toBe(true);
      expect(result.filePath).toBe(path.join(customWorkDir, fileName));
      expect(result.content).toContain('**Статус:** Открыта');
    });
  });

  describe('handleServiceError', () => {
    test('should handle service error with retry', async () => {
      const serviceId = 'test-service';
      const error = new Error('Service error');

      const result = await errorHandler.handleServiceError(serviceId, error);

      expect(result.shouldRetry).toBe(true);
      expect(result.delay).toBe(1000); // Default retry delay
      expect(result.attempt).toBe(1);
      expect(result.maxAttempts).toBe(3); // Default max retries
      expect(result.error.message).toBe('Service error');
      expect(logger.warn).toHaveBeenCalledWith(`[ErrorHandler] Service '${serviceId}' failed. Retrying (attempt 1/${errorHandler.maxRetries})...`, expect.any(Object));
    });

    test('should stop retrying after max attempts', async () => {
      const serviceId = 'test-service';
      const error = new Error('Persistent error');

      // Имитируем превышение максимального количества попыток
      errorHandler.retryCounts.set(serviceId, errorHandler.maxRetries);

      const result = await errorHandler.handleServiceError(serviceId, error);

      expect(result.shouldRetry).toBe(false);
      expect(result.final).toBe(true);
      expect(errorHandler.retryCounts.get(serviceId)).toBeUndefined();
      expect(logger.error).toHaveBeenCalledWith(`[ErrorHandler] Service '${serviceId}' failed after ${errorHandler.maxRetries} attempts. Stopping retries.`, expect.any(Object));
    });

    test('should handle service error when logger is not available', async () => {
      const serviceId = 'test-service-no-logger';
      const error = new Error('Service error no logger');
      errorHandler.logger = null; // simulate no logger

      const result = await errorHandler.handleServiceError(serviceId, error);
      expect(result.shouldRetry).toBe(true);
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('handleCriticalError', () => {
    test('should handle critical error and create report', async () => {
      const createErrorReportSpy = jest.spyOn(errorHandler, 'createErrorReport').mockResolvedValue('/path/to/report.md');
      const error = new Error('Critical error');
      const context = { service: 'critical-service' };

      const errorEntry = await errorHandler.handleCriticalError(error, context);

      expect(errorEntry.message).toBe('Critical error');
      expect(errorEntry.context.critical).toBe(true);
      expect(errorEntry.context.service).toBe('critical-service');

      expect(logger.error).toHaveBeenCalledWith('[ErrorHandler] CRITICAL ERROR: Critical error', expect.any(Object));
      expect(createErrorReportSpy).toHaveBeenCalledWith(expect.objectContaining({
        error,
        type: 'CRITICAL_ERROR',
        context: expect.objectContaining({ critical: true, service: 'critical-service' }),
      }));
      createErrorReportSpy.mockRestore();
    });

    test('should handle critical error without context', async () => {
      const createErrorReportSpy = jest.spyOn(errorHandler, 'createErrorReport').mockResolvedValue('/path/to/report.md');
      const error = new Error('Another critical error');

      const errorEntry = await errorHandler.handleCriticalError(error);

      expect(errorEntry.message).toBe('Another critical error');
      expect(errorEntry.context.critical).toBe(true);
      expect(logger.error).toHaveBeenCalledWith('[ErrorHandler] CRITICAL ERROR: Another critical error', expect.any(Object));
      createErrorReportSpy.mockRestore();
    });

    test('should handle critical error even if report creation fails', async () => {
      const createErrorReportSpy = jest.spyOn(errorHandler, 'createErrorReport').mockRejectedValueOnce(new Error('Report fail'));
      const error = new Error('Critical error no report');

      const errorEntry = await errorHandler.handleCriticalError(error);

      expect(errorEntry.message).toBe('Critical error no report');
      expect(logger.error).toHaveBeenCalledWith('[ErrorHandler] CRITICAL ERROR: Critical error no report', expect.any(Object));
      expect(createErrorReportSpy).toHaveBeenCalledTimes(1);
      createErrorReportSpy.mockRestore();
    });

    test('should call sendCriticalNotification during critical error handling', async () => {
      const sendNotificationSpy = jest.spyOn(errorHandler, 'sendCriticalNotification').mockResolvedValue(undefined);
      const createErrorReportSpy = jest.spyOn(errorHandler, 'createErrorReport').mockResolvedValue('/path/to/report.md');

      const error = new Error('Critical error with notification');
      const context = { service: 'test-service' };

      await errorHandler.handleCriticalError(error, context);

      expect(sendNotificationSpy).toHaveBeenCalledTimes(1);
      expect(sendNotificationSpy).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Critical error with notification',
        context: expect.objectContaining({ critical: true, service: 'test-service' })
      }));

      sendNotificationSpy.mockRestore();
      createErrorReportSpy.mockRestore();
    });

    test('should continue processing even if sendCriticalNotification fails', async () => {
      const sendNotificationSpy = jest.spyOn(errorHandler, 'sendCriticalNotification').mockRejectedValueOnce(new Error('Notification failed'));
      const createErrorReportSpy = jest.spyOn(errorHandler, 'createErrorReport').mockResolvedValue('/path/to/report.md');

      const error = new Error('Critical error notification fail');

      const errorEntry = await errorHandler.handleCriticalError(error);

      expect(errorEntry.message).toBe('Critical error notification fail');
      expect(sendNotificationSpy).toHaveBeenCalledTimes(1);
      expect(createErrorReportSpy).toHaveBeenCalledTimes(1);

      sendNotificationSpy.mockRestore();
      createErrorReportSpy.mockRestore();
    });
  });

  describe('sendCriticalNotification', () => {
    test('should send critical notification successfully', async () => {
      const errorEntry = {
        message: 'Critical test error',
        timestamp: new Date().toISOString()
      };

      await errorHandler.sendCriticalNotification(errorEntry);

      expect(logger.error).toHaveBeenCalledWith('[ErrorHandler] CRITICAL ERROR: Critical test error');
    });

    test('should handle notification error gracefully', async () => {
      const errorEntry = {
        message: 'Critical error with notification failure',
        timestamp: new Date().toISOString()
      };

      // Mock logger.error to throw an error on first call (for notification) but succeed on second call (for error logging)
      logger.error.mockImplementationOnce(() => {
        throw new Error('Notification channel failed');
      });

      await errorHandler.sendCriticalNotification(errorEntry);

      expect(logger.error).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenNthCalledWith(1, '[ErrorHandler] CRITICAL ERROR: Critical error with notification failure');
      expect(logger.error).toHaveBeenNthCalledWith(2, '[ErrorHandler] Failed to send critical notification:', 'Notification channel failed');
    });

    test('should handle case when logger is not available', async () => {
      const errorEntry = {
        message: 'Critical error no logger',
        timestamp: new Date().toISOString()
      };

      errorHandler.logger = null; // simulate no logger

      // Should not throw error when logger is null
      await expect(errorHandler.sendCriticalNotification(errorEntry)).resolves.toBeUndefined();
    });

    test('should handle case when logger.error is not available', async () => {
      const errorEntry = {
        message: 'Critical error no logger method',
        timestamp: new Date().toISOString()
      };

      // Remove error method from logger
      delete logger.error;

      // Should not throw error when logger.error is not available
      await expect(errorHandler.sendCriticalNotification(errorEntry)).resolves.toBeUndefined();
    });
  });

  describe('handleWithFallback', () => {
    test('should execute main operation successfully', async () => {
      const mainOperation = jest.fn().mockResolvedValue('success');
      const fallbackOperation = jest.fn().mockResolvedValue('fallback');

      const result = await errorHandler.handleWithFallback(
        mainOperation,
        fallbackOperation
      );

      expect(result).toBe('success');
      expect(mainOperation).toHaveBeenCalled();
      expect(fallbackOperation).not.toHaveBeenCalled();
    });

    test('should execute fallback operation on main failure', async () => {
      const mainOperation = jest.fn().mockRejectedValue(new Error('Main failed'));
      const fallbackOperation = jest.fn().mockResolvedValue('fallback success');

      const result = await errorHandler.handleWithFallback(
        mainOperation,
        fallbackOperation
      );

      expect(result).toBe('fallback success');
      expect(mainOperation).toHaveBeenCalled();
      expect(fallbackOperation).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith('[ErrorHandler] Основная операция завершилась ошибкой, используется резервная.', expect.any(Error));
    });

    test('should throw error if both operations fail', async () => {
      const mainOperation = jest.fn().mockRejectedValue(new Error('Main failed'));
      const fallbackOperation = jest.fn().mockRejectedValue(new Error('Fallback failed'));

      await expect(errorHandler.handleWithFallback(
        mainOperation,
        fallbackOperation
      )).rejects.toThrow('Fallback failed');
      expect(logger.error).toHaveBeenCalledWith('[ErrorHandler] Обе операции завершились ошибкой.', expect.any(Error));
    });
  });

  describe('handleWithRetry', () => {
    test('should execute operation successfully on first try', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await errorHandler.handleWithRetry(operation, 2);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test('should retry operation on failure', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce('success');

      const result = await errorHandler.handleWithRetry(operation, 2);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledWith('[ErrorHandler] Повторная попытка (1/2) из-за ошибки:', 'First attempt failed');
    });

    test('should throw error after all retries exhausted', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Persistent failure'));

      await expect(errorHandler.handleWithRetry(operation, 2)).rejects.toThrow('Persistent failure');
      expect(operation).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
      expect(logger.error).toHaveBeenCalledWith('[ErrorHandler] Операция завершилась ошибкой после 3 попыток.', 'Persistent failure');
    });

    test('should respect custom retry delays', async () => {
      const customErrorHandler = new ErrorHandlingUtils({
        logger: logger,
        retryDelays: [50, 100],
      });
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Retry 1'))
        .mockRejectedValueOnce(new Error('Retry 2'))
        .mockResolvedValueOnce('success');

      jest.useFakeTimers();

      const promise = customErrorHandler.handleWithRetry(operation, 2);

      expect(operation).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(50);
      expect(operation).toHaveBeenCalledTimes(2);

      jest.advanceTimersByTime(100);
      expect(operation).toHaveBeenCalledTimes(3);

      await expect(promise).resolves.toBe('success');

      jest.useRealTimers();
    });

    test('should use default retry count when not specified', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Persistent failure'));

      await expect(errorHandler.handleWithRetry(operation)).rejects.toThrow('Persistent failure');
      expect(operation).toHaveBeenCalledTimes(4); // 1 initial + 3 retries (default)
    });

    test('should handle operation that succeeds after multiple retries', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValueOnce('success');

      const result = await errorHandler.handleWithRetry(operation, 3);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
      expect(logger.warn).toHaveBeenCalledTimes(2);
    });

    test('should pass context to logError when retries exhausted', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Context test error'));
      const context = { service: 'test-service', userId: '123' };

      await expect(errorHandler.handleWithRetry(operation, 1, context)).rejects.toThrow('Context test error');

      expect(logger.error).toHaveBeenCalledWith('[ErrorHandler] Операция завершилась ошибкой после 2 попыток.', expect.any(Object));
    });
  });

  describe('addErrorToBatch', () => {
    test('should add unique error to batch', async () => {
      const error = new Error('Batch error');
      const parameters = { key: 'value' };

      const result = errorHandler.addErrorToBatch(error, parameters);

      expect(result).toBe(true);
      expect(errorHandler.md5Cache.size).toBe(1);
      expect(errorHandler.errorHistory).toHaveLength(1);
      expect(errorHandler.errorHistory[0].context.batched).toBe(true);
    });

    test('should not add duplicate error to batch', async () => {
      const error = new Error('Duplicate batch error');
      const parameters = { key: 'value' };

      errorHandler.addErrorToBatch(error, parameters);
      const result = errorHandler.addErrorToBatch(error, parameters);

      expect(result).toBe(false);
      expect(errorHandler.md5Cache.size).toBe(1);
      expect(errorHandler.errorHistory).toHaveLength(1);
    });

    test('should handle error during hash generation', async () => {
      jest.spyOn(errorHandler, 'generateParametersHash').mockImplementationOnce(() => {
        throw new Error('Hash error');
      });
      const error = new Error('Test error');
      const result = errorHandler.addErrorToBatch(error, { key: 'value' });
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('Ошибка генерации хеша для пакетирования ошибок:', expect.any(Error));
    });

    test('should add error to batch with empty parameters', async () => {
      const error = new Error('Empty params error');

      const result = errorHandler.addErrorToBatch(error, {});

      expect(result).toBe(true);
      expect(errorHandler.md5Cache.size).toBe(1);
      expect(errorHandler.errorHistory).toHaveLength(1);
    });

    test('should handle complex error objects in batch', async () => {
      const customError = {
        message: 'Custom error object',
        code: 'CUSTOM_ERROR',
        details: { field: 'test' }
      };

      const result = errorHandler.addErrorToBatch(customError, { param: 'value' });

      expect(result).toBe(true);
      expect(errorHandler.errorHistory[0].error).toEqual(customError);
    });
  });

  describe('getErrorStats', () => {
    test('should return error statistics', async () => {
      await errorHandler.logError(new Error('Test error 1'));
      await errorHandler.logError(new Error('Test error 2'));
      await errorHandler.logError(new Error('Test error 1')); // Duplicate

      const stats = errorHandler.getErrorStats();

      expect(stats.totalErrors).toBe(3);
      expect(stats.errorCounts['Error:Test error 1']).toBe(2);
      expect(stats.errorCounts['Error:Test error 2']).toBe(1);
      expect(stats.recentErrors).toHaveLength(3);
      expect(stats.timestamp).toBeDefined();
    });

    test('should return empty stats if no errors', () => {
      const stats = errorHandler.getErrorStats();
      expect(stats.totalErrors).toBe(0);
      expect(Object.keys(stats.errorCounts).length).toBe(0);
      expect(stats.recentErrors).toHaveLength(0);
    });

    test('should include retry counts in statistics', async () => {
      await errorHandler.logError(new Error('Test error'));
      errorHandler.retryCounts.set('service1', 2);
      errorHandler.retryCounts.set('service2', 5);

      const stats = errorHandler.getErrorStats();

      expect(stats.retryCounts).toEqual({ service1: 2, service2: 5 });
      expect(stats.totalErrors).toBe(1);
      expect(stats.timestamp).toBeDefined();
    });

    test('should limit recent errors to last 10', async () => {
      // Add more than 10 errors
      for (let i = 1; i <= 15; i++) {
        await errorHandler.logError(new Error(`Error ${i}`));
      }

      const stats = errorHandler.getErrorStats();

      expect(stats.totalErrors).toBe(15);
      expect(stats.recentErrors).toHaveLength(10);
      expect(stats.recentErrors[0].message).toBe('Error 15'); // Most recent first
      expect(stats.recentErrors[9].message).toBe('Error 6'); // 10th most recent
    });

    test('should handle errors with same message correctly', async () => {
      const errorMessage = 'Duplicate message error';
      await errorHandler.logError(new Error(errorMessage));
      await errorHandler.logError(new Error(errorMessage));
      await errorHandler.logError(new Error(errorMessage));

      const stats = errorHandler.getErrorStats();

      expect(stats.totalErrors).toBe(3);
      expect(stats.errorCounts[`Error:${errorMessage}`]).toBe(3);
    });
  });

  describe('clearErrorHistory', () => {
    test('should clear all error data', async () => {
      await errorHandler.logError(new Error('Test error'));
      errorHandler.addErrorToBatch(new Error('Batch error'), { key: 'value' });
      errorHandler.retryCounts.set('service', 2);

      errorHandler.clearErrorHistory();

      expect(errorHandler.errorHistory).toEqual([]);
      expect(errorHandler.errorCounts.size).toBe(0);
      expect(errorHandler.retryCounts.size).toBe(0);
      expect(errorHandler.md5Cache.size).toBe(0);
    });
  });

  describe('getErrorsByType', () => {
    test('should filter errors by type', async () => {
      await errorHandler.logError(new Error('Type error 1'));
      await errorHandler.logError(new TypeError('Type error 2'));
      await errorHandler.logError(new Error('Type error 3'));

      const typeErrors = errorHandler.getErrorsByType('TypeError');
      const regularErrors = errorHandler.getErrorsByType('Error');

      expect(typeErrors).toHaveLength(1);
      expect(typeErrors[0].type).toBe('TypeError');
      expect(regularErrors).toHaveLength(2);
      expect(regularErrors[0].type).toBe('Error');
    });

    test('should return empty array if no errors of specified type', async () => {
      await errorHandler.logError(new Error('Just a regular error'));
      const syntaxErrors = errorHandler.getErrorsByType('SyntaxError');
      expect(syntaxErrors).toEqual([]);
    });
  });

  describe('getErrorsByService', () => {
    test('should filter errors by service', async () => {
      await errorHandler.logError(new Error('Service 1 error'), { serviceId: 'service1' });
      await errorHandler.logError(new Error('Service 2 error'), { serviceId: 'service2' });
      await errorHandler.logError(new Error('Service 1 error 2'), { serviceId: 'service1' });

      const service1Errors = errorHandler.getErrorsByService('service1');
      const service2Errors = errorHandler.getErrorsByService('service2');

      expect(service1Errors).toHaveLength(2);
      expect(service1Errors[0].context.serviceId).toBe('service1');
      expect(service2Errors).toHaveLength(1);
      expect(service2Errors[0].context.serviceId).toBe('service2');
    });

    test('should return empty array if no errors for specified service', async () => {
      await errorHandler.logError(new Error('Service X error'), { serviceId: 'serviceX' });
      const serviceYErrors = errorHandler.getErrorsByService('serviceY');
      expect(serviceYErrors).toEqual([]);
    });
  });

  describe('checkErrorFrequency', () => {
    beforeEach(() => {
      jest.useFakeTimers(); // Added for fake timers
      errorHandler.errorHistory = [];
    });

    afterEach(() => {
      // jest.runOnlyPendingTimers(); // Handled by main afterEach jest.restoreAllMocks
      // jest.useRealTimers(); // Handled by main afterEach jest.restoreAllMocks
    });

    test('should check error frequency within time window', async () => {
      const now = Date.now();

      // Имитируем ошибки в разное время
      errorHandler.errorHistory = [
        { timestamp: new Date(now - 30000).toISOString() }, // 30 seconds ago
        { timestamp: new Date(now - 20000).toISOString() }, // 20 seconds ago
        { timestamp: new Date(now - 10000).toISOString() }  // 10 seconds ago
      ];

      const result = errorHandler.checkErrorFrequency(2, 60000); // 2 errors in 60 seconds

      expect(result.count).toBe(3);
      expect(result.threshold).toBe(2);
      expect(result.exceeded).toBe(true);
    });

    test('should not exceed threshold', async () => {
      const now = Date.now();
      errorHandler.errorHistory = [
        { timestamp: new Date(now - 70000).toISOString() }, // 70 seconds ago (outside 60s window)
        { timestamp: new Date(now - 50000).toISOString() }  // 50 seconds ago
      ];

      const result = errorHandler.checkErrorFrequency(2, 60000);

      expect(result.count).toBe(1); // Only one error within the last 60 seconds
      expect(result.threshold).toBe(2);
      expect(result.exceeded).toBe(false);
    });

    test('should handle empty error history', () => {
      const result = errorHandler.checkErrorFrequency(5, 10000);
      expect(result.count).toBe(0);
      expect(result.exceeded).toBe(false);
    });
  });
});

// Тесты для классов ошибок приложения
describe('App Error Classes', () => {
  describe('AppError', () => {
    test('should create AppError with default values', () => {
      const error = new AppError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.isOperational).toBe(true);
      expect(error).toBeInstanceOf(Error);
    });

    test('should create AppError with custom values', () => {
      const error = new AppError('Custom error', 400, 'CUSTOM_ERROR');

      expect(error.message).toBe('Custom error');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('CUSTOM_ERROR');
      expect(error).toBeInstanceOf(Error);
    });

    test('should have correct name property', () => {
      const error = new AppError('Test error');
      expect(error.name).toBe('AppError');
    });
  });

  describe('ValidationError', () => {
    test('should create ValidationError', () => {
      const error = new ValidationError('Invalid field', 'email');

      expect(error.message).toBe('Invalid field');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.field).toBe('email');
      expect(error).toBeInstanceOf(AppError);
    });

    test('should have correct name property', () => {
      const error = new ValidationError('Test', 'field');
      expect(error.name).toBe('ValidationError');
    });
  });

  describe('AuthenticationError', () => {
    test('should create AuthenticationError with default message', () => {
      const error = new AuthenticationError();

      expect(error.message).toBe('Ошибка аутентификации');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTHENTICATION_ERROR');
      expect(error).toBeInstanceOf(AppError);
    });

    test('should create AuthenticationError with custom message', () => {
      const error = new AuthenticationError('Custom auth error');

      expect(error.message).toBe('Custom auth error');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTHENTICATION_ERROR');
    });

    test('should have correct name property', () => {
      const error = new AuthenticationError();
      expect(error.name).toBe('AuthenticationError');
    });
  });

  describe('AuthorizationError', () => {
    test('should create AuthorizationError', () => {
      const error = new AuthorizationError('Access denied');

      expect(error.message).toBe('Access denied');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('AUTHORIZATION_ERROR');
      expect(error).toBeInstanceOf(AppError);
    });

    test('should have correct name property', () => {
      const error = new AuthorizationError('Test');
      expect(error.name).toBe('AuthorizationError');
    });
  });

  describe('NotFoundError', () => {
    test('should create NotFoundError with default resource', () => {
      const error = new NotFoundError();

      expect(error.message).toBe('Ресурс не найден');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error).toBeInstanceOf(AppError);
    });

    test('should create NotFoundError with custom resource', () => {
      const error = new NotFoundError('User');

      expect(error.message).toBe('User не найден');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });

    test('should have correct name property', () => {
      const error = new NotFoundError();
      expect(error.name).toBe('NotFoundError');
    });
  });

  describe('ConflictError', () => {
    test('should create ConflictError', () => {
      const error = new ConflictError('Data already exists');

      expect(error.message).toBe('Data already exists');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
      expect(error).toBeInstanceOf(AppError);
    });

    test('should have correct name property', () => {
      const error = new ConflictError('Test');
      expect(error.name).toBe('ConflictError');
    });
  });

  describe('RateLimitError', () => {
    test('should create RateLimitError', () => {
      const error = new RateLimitError('Too many requests');

      expect(error.message).toBe('Too many requests');
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT');
      expect(error).toBeInstanceOf(AppError);
    });

    test('should have correct name property', () => {
      const error = new RateLimitError('Test');
      expect(error.name).toBe('RateLimitError');
    });
  });
});

