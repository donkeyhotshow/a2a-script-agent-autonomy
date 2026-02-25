const path = require('path');
const { ErrorCategorizationManager } = require('../../error-operations/src/ErrorCategorizationManager');
const { ErrorHandlingStrategies } = require('../../error-operations/src/ErrorHandlingStrategies');
const { ServiceConfigurationValidator } = require('../../error-operations/src/ServiceConfigurationValidator');

jest.mock('@libs/logging-monitoring/logging', () => ({
  LoggingUtils: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
  })),
}));

jest.mock('@libs/core/file-utils', () => {
  const mockFileManagerInstance = {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    copyPath: jest.fn(),
    movePath: jest.fn(),
    deletePath: jest.fn(),
    listDirectory: jest.fn(),
    ensureDir: jest.fn(),
    fileExists: jest.fn(),
    getFileStats: jest.fn(),
    join: jest.fn(),
    resolve: jest.fn(),
    dirname: jest.fn(),
    existsSync: jest.fn(),
    mkdir: jest.fn(),
    rm: jest.fn(),
    // Aliases
    readJson: jest.fn(),
    writeJson: jest.fn(),
    readDirectory: jest.fn(),
    remove: jest.fn(),
  };

  const MockFileManager = jest.fn(() => mockFileManagerInstance);

  return {
    FileManager: MockFileManager,
    FileSystemUtils: MockFileManager,
    fileUtilsFactory: jest.fn(() => mockFileManagerInstance),
  };
});

describe('ErrorCategorizationManager', () => {
  let mockErrorReporting;
  let manager;

  beforeEach(() => {
    mockErrorReporting = {
      _generateMd5Hash: jest.fn(params => JSON.stringify(params)),
      checkExistingReport: jest.fn(() => Promise.resolve({ exists: false })),
      createErrorReport: jest.fn(() => Promise.resolve()),
    };
    manager = new ErrorCategorizationManager(mockErrorReporting);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should categorize errors correctly', () => {
    // TODO: Implement tests for ErrorCategorizationManager
    expect(true).toBe(true);
  });

  describe('processOperation', () => {
    test('should execute operation successfully', async () => {
      const operation = jest.fn(async () => 'success');
      const result = await manager.processOperation(operation, { pid: 123 });
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledWith({ pid: 123 });
      expect(mockErrorReporting._generateMd5Hash).toHaveBeenCalledWith({ pid: 123 });
      expect(mockErrorReporting.checkExistingReport).not.toHaveBeenCalled();
      expect(mockErrorReporting.createErrorReport).not.toHaveBeenCalled();
    });

    test('should categorize ENOENT error', async () => {
      const error = new Error('Command failed');
      error.code = 'ENOENT';
      error.cmd = 'test-command';
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.processOperation(operation, { command: 'test' })).rejects.toThrow(error);
      expect(mockErrorReporting._generateMd5Hash).toHaveBeenCalledWith({ command: 'test' });
      expect(mockErrorReporting.checkExistingReport).toHaveBeenCalled();
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'COMMAND_NOT_FOUND',
        title: 'Ошибка процесса: COMMAND_NOT_FOUND',
        description: 'Команда не найдена: test-command. Убедитесь что команда установлена и доступна в PATH.',
        parameters: { command: 'test', errorCode: 'ENOENT', errorSignal: undefined },
      }));
    });

    test('should categorize EACCES error', async () => {
      const error = new Error('Permission denied');
      error.code = 'EACCES';
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.processOperation(operation, { command: 'test' })).rejects.toThrow(error);
      expect(mockErrorReporting._generateMd5Hash).toHaveBeenCalledWith({ command: 'test' });
      expect(mockErrorReporting.checkExistingReport).toHaveBeenCalled();
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'PERMISSION_DENIED',
        title: 'Ошибка процесса: PERMISSION_DENIED',
        description: 'Отказано в доступе. Проверьте права доступа к файлу.',
        parameters: { command: 'test', errorCode: 'EACCES', errorSignal: undefined },
      }));
    });

    test('should categorize ENOTDIR error', async () => {
      const error = new Error('Not a directory');
      error.code = 'ENOTDIR';
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.processOperation(operation, { path: '/invalid' })).rejects.toThrow(error);
      expect(mockErrorReporting._generateMd5Hash).toHaveBeenCalledWith({ path: '/invalid' });
      expect(mockErrorReporting.checkExistingReport).toHaveBeenCalled();
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'INVALID_DIRECTORY',
        title: 'Ошибка процесса: INVALID_DIRECTORY',
        description: 'Неверная директория. Проверьте что путь существует и является директорией.',
        parameters: { path: '/invalid', errorCode: 'ENOTDIR', errorSignal: undefined },
      }));
    });

    test('should categorize ENOSPC error', async () => {
      const error = new Error('No space left');
      error.code = 'ENOSPC';
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.processOperation(operation, { drive: 'C:' })).rejects.toThrow(error);
      expect(mockErrorReporting._generateMd5Hash).toHaveBeenCalledWith({ drive: 'C:' });
      expect(mockErrorReporting.checkExistingReport).toHaveBeenCalled();
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'NO_SPACE_LEFT',
        title: 'Ошибка процесса: NO_SPACE_LEFT',
        description: 'Недостаточно места на диске.',
        parameters: { drive: 'C:', errorCode: 'ENOSPC', errorSignal: undefined },
      }));
    });

    test('should categorize SIGKILL error', async () => {
      const error = new Error('Process killed');
      error.signal = 'SIGKILL';
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.processOperation(operation, { pid: 456 })).rejects.toThrow(error);
      expect(mockErrorReporting._generateMd5Hash).toHaveBeenCalledWith({ pid: 456 });
      expect(mockErrorReporting.checkExistingReport).toHaveBeenCalled();
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'PROCESS_KILLED',
        title: 'Ошибка процесса: PROCESS_KILLED',
        description: 'Процесс был принудительно завершен.',
        parameters: { pid: 456, errorCode: undefined, errorSignal: 'SIGKILL' },
      }));
    });

    test('should categorize SIGTERM error', async () => {
      const error = new Error('Process terminated');
      error.signal = 'SIGTERM';
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.processOperation(operation, { pid: 789 })).rejects.toThrow(error);
      expect(mockErrorReporting._generateMd5Hash).toHaveBeenCalledWith({ pid: 789 });
      expect(mockErrorReporting.checkExistingReport).toHaveBeenCalled();
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'PROCESS_TERMINATED',
        title: 'Ошибка процесса: PROCESS_TERMINATED',
        description: 'Процесс был завершен.',
        parameters: { pid: 789, errorCode: undefined, errorSignal: 'SIGTERM' },
      }));
    });

    test('should categorize generic process error', async () => {
      const error = new Error('Something went wrong');
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.processOperation(operation, { task: 'generic' })).rejects.toThrow(error);
      expect(mockErrorReporting._generateMd5Hash).toHaveBeenCalledWith({ task: 'generic' });
      expect(mockErrorReporting.checkExistingReport).toHaveBeenCalled();
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'PROCESS_ERROR',
        title: 'Ошибка процесса: PROCESS_ERROR',
        description: 'Something went wrong',
        parameters: { task: 'generic', errorCode: undefined, errorSignal: undefined },
      }));
    });

    test('should not create error report if error already exists', async () => {
      mockErrorReporting.checkExistingReport.mockResolvedValueOnce({ exists: true });
      const error = new Error('Existing error');
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.processOperation(operation, { id: 'existing' })).rejects.toThrow(error);
      expect(mockErrorReporting._generateMd5Hash).toHaveBeenCalledWith({ id: 'existing' });
      expect(mockErrorReporting.checkExistingReport).toHaveBeenCalled();
      expect(mockErrorReporting.createErrorReport).not.toHaveBeenCalled();
    });
  });

  describe('fileSystemOperation', () => {
    test('should execute operation successfully', async () => {
      const operation = jest.fn(async () => 'file_success');
      const result = await manager.fileSystemOperation(operation, { filename: 'test.txt' });
      expect(result).toBe('file_success');
      expect(operation).toHaveBeenCalledWith({ filename: 'test.txt' });
      expect(mockErrorReporting._generateMd5Hash).toHaveBeenCalledWith({ filename: 'test.txt' });
      expect(mockErrorReporting.checkExistingReport).not.toHaveBeenCalled();
      expect(mockErrorReporting.createErrorReport).not.toHaveBeenCalled();
    });

    test('should categorize ENOENT error (file not found)', async () => {
      const error = new Error('No such file or directory');
      error.code = 'ENOENT';
      error.path = '/path/to/nonexistent-file.txt';
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.fileSystemOperation(operation, { path: error.path })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'FILE_NOT_FOUND',
        title: 'Ошибка файловой системы: FILE_NOT_FOUND',
        description: `Файл или директория не найдены: ${error.path}`,
        parameters: { path: error.path, errorCode: 'ENOENT', errorPath: error.path },
      }));
    });

    test('should categorize EACCES error (permission denied)', async () => {
      const error = new Error('Permission denied');
      error.code = 'EACCES';
      error.path = '/path/to/restricted-file.txt';
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.fileSystemOperation(operation, { path: error.path })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'PERMISSION_DENIED',
        title: 'Ошибка файловой системы: PERMISSION_DENIED',
        description: `Отказано в доступе к файлу: ${error.path}`,
        parameters: { path: error.path, errorCode: 'EACCES', errorPath: error.path },
      }));
    });

    test('should categorize EEXIST error (file exists)', async () => {
      const error = new Error('File exists');
      error.code = 'EEXIST';
      error.path = '/path/to/existing-file.txt';
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.fileSystemOperation(operation, { path: error.path })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'FILE_EXISTS',
        title: 'Ошибка файловой системы: FILE_EXISTS',
        description: `Файл уже существует: ${error.path}`,
        parameters: { path: error.path, errorCode: 'EEXIST', errorPath: error.path },
      }));
    });

    test('should categorize ENOSPC error (no space left)', async () => {
      const error = new Error('No space left on device');
      error.code = 'ENOSPC';
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.fileSystemOperation(operation, { path: '/large-file.bin' })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'NO_SPACE_LEFT',
        title: 'Ошибка файловой системы: NO_SPACE_LEFT',
        description: 'Недостаточно места на диске',
        parameters: { path: '/large-file.bin', errorCode: 'ENOSPC', errorPath: undefined },
      }));
    });

    test('should categorize ENOTDIR error (not a directory)', async () => {
      const error = new Error('Not a directory');
      error.code = 'ENOTDIR';
      error.path = '/path/to/file-as-dir';
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.fileSystemOperation(operation, { path: error.path })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'NOT_DIRECTORY',
        title: 'Ошибка файловой системы: NOT_DIRECTORY',
        description: `Путь не является директорией: ${error.path}`,
        parameters: { path: error.path, errorCode: 'ENOTDIR', errorPath: error.path },
      }));
    });

    test('should categorize EISDIR error (is a directory)', async () => {
      const error = new Error('Is a directory');
      error.code = 'EISDIR';
      error.path = '/path/to/directory';
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.fileSystemOperation(operation, { path: error.path })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'IS_DIRECTORY',
        title: 'Ошибка файловой системы: IS_DIRECTORY',
        description: `Путь является директорией, а не файлом: ${error.path}`,
        parameters: { path: error.path, errorCode: 'EISDIR', errorPath: error.path },
      }));
    });

    test('should categorize generic file system error', async () => {
      const error = new Error('Generic file system issue');
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.fileSystemOperation(operation, { file: 'generic.log' })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'FILE_SYSTEM_ERROR',
        title: 'Ошибка файловой системы: FILE_SYSTEM_ERROR',
        description: 'Generic file system issue',
        parameters: { file: 'generic.log', errorCode: undefined, errorPath: undefined },
      }));
    });

    test('should not create error report if file system error already exists', async () => {
      mockErrorReporting.checkExistingReport.mockResolvedValueOnce({ exists: true });
      const error = new Error('Existing file system error');
      error.code = 'ENOENT';
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.fileSystemOperation(operation, { file: 'existing.txt' })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).not.toHaveBeenCalled();
    });
  });

  describe('networkOperation', () => {
    test('should execute operation successfully', async () => {
      const operation = jest.fn(async () => 'network_success');
      const result = await manager.networkOperation(operation, { url: 'http://example.com' });
      expect(result).toBe('network_success');
      expect(operation).toHaveBeenCalledWith({ url: 'http://example.com' });
      expect(mockErrorReporting._generateMd5Hash).toHaveBeenCalledWith({ url: 'http://example.com' });
      expect(mockErrorReporting.checkExistingReport).not.toHaveBeenCalled();
      expect(mockErrorReporting.createErrorReport).not.toHaveBeenCalled();
    });

    test('should categorize ECONNREFUSED error', async () => {
      const error = new Error('Connection refused');
      error.code = 'ECONNREFUSED';
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.networkOperation(operation, { host: 'localhost', port: 8080 })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'CONNECTION_REFUSED',
        title: 'Сетевая ошибка: CONNECTION_REFUSED',
        description: 'Соединение отклонено. Сервер недоступен или порт закрыт.',
        parameters: { host: 'localhost', port: 8080, errorCode: 'ECONNREFUSED', errorStatus: undefined },
      }));
    });

    test('should categorize ETIMEDOUT error', async () => {
      const error = new Error('Connection timed out');
      error.code = 'ETIMEDOUT';
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.networkOperation(operation, { url: 'http://slow.com' })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'CONNECTION_TIMEOUT',
        title: 'Сетевая ошибка: CONNECTION_TIMEOUT',
        description: 'Таймаут соединения. Сервер не отвечает в течение заданного времени.',
        parameters: { url: 'http://slow.com', errorCode: 'ETIMEDOUT', errorStatus: undefined },
      }));
    });

    test('should categorize ENOTFOUND error', async () => {
      const error = new Error('Host not found');
      error.code = 'ENOTFOUND';
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.networkOperation(operation, { host: 'nonexistent.domain' })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'DNS_ERROR',
        title: 'Сетевая ошибка: DNS_ERROR',
        description: 'Ошибка DNS. Хост не найден.',
        parameters: { host: 'nonexistent.domain', errorCode: 'ENOTFOUND', errorStatus: undefined },
      }));
    });

    test('should categorize ECONNRESET error', async () => {
      const error = new Error('Connection reset by peer');
      error.code = 'ECONNRESET';
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.networkOperation(operation, { url: 'http://resets.com' })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'CONNECTION_RESET',
        title: 'Сетевая ошибка: CONNECTION_RESET',
        description: 'Соединение сброшено сервером.',
        parameters: { url: 'http://resets.com', errorCode: 'ECONNRESET', errorStatus: undefined },
      }));
    });

    test('should categorize EHOSTUNREACH error', async () => {
      const error = new Error('Host unreachable');
      error.code = 'EHOSTUNREACH';
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.networkOperation(operation, { ip: '192.168.1.1' })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'HOST_UNREACHABLE',
        title: 'Сетевая ошибка: HOST_UNREACHABLE',
        description: 'Хост недоступен.',
        parameters: { ip: '192.168.1.1', errorCode: 'EHOSTUNREACH', errorStatus: undefined },
      }));
    });

    test('should categorize HTTP error with statusCode', async () => {
      const error = new Error('Not Found');
      error.statusCode = 404;
      error.statusMessage = 'Not Found';
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.networkOperation(operation, { url: 'http://example.com/404' })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'HTTP_404',
        title: 'Сетевая ошибка: HTTP_404',
        description: 'HTTP ошибка 404: Not Found',
        parameters: { url: 'http://example.com/404', errorCode: undefined, errorStatus: 404 },
      }));
    });

    test('should categorize generic network error', async () => {
      const error = new Error('Unknown network issue');
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.networkOperation(operation, { api: 'someApi' })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'NETWORK_ERROR',
        title: 'Сетевая ошибка: NETWORK_ERROR',
        description: 'Unknown network issue',
        parameters: { api: 'someApi', errorCode: undefined, errorStatus: undefined },
      }));
    });

    test('should not create error report if network error already exists', async () => {
      mockErrorReporting.checkExistingReport.mockResolvedValueOnce({ exists: true });
      const error = new Error('Existing network error');
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.networkOperation(operation, { url: 'http://existing.com' })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).not.toHaveBeenCalled();
    });
  });

  describe('timeoutOperation', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should execute operation successfully within timeout', async () => {
      const operation = jest.fn(async ({ delay }) => {
        await new Promise(resolve => setTimeout(resolve, delay));
        return 'timeout_success';
      });
      const resultPromise = manager.timeoutOperation(operation, 100, { data: 'test' });
      jest.advanceTimersByTime(50);
      const result = await resultPromise;

      expect(result).toBe('timeout_success');
      expect(operation).toHaveBeenCalledWith({ data: 'test' });
      expect(mockErrorReporting._generateMd5Hash).toHaveBeenCalledWith({ data: 'test' });
      expect(mockErrorReporting.checkExistingReport).not.toHaveBeenCalled();
      expect(mockErrorReporting.createErrorReport).not.toHaveBeenCalled();
    });

    test('should categorize timeout error if operation exceeds timeout', async () => {
      const operation = jest.fn(async ({ delay }) => {
        await new Promise(resolve => setTimeout(resolve, delay));
        return 'should_not_reach_here';
      });
      const timeoutMs = 100;
      const resultPromise = manager.timeoutOperation(operation, timeoutMs, { action: 'long_task' });
      jest.advanceTimersByTime(timeoutMs + 10);

      await expect(resultPromise).rejects.toThrow(`Operation timed out after ${timeoutMs}ms`);
      expect(operation).toHaveBeenCalledWith({ action: 'long_task' });
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'TIMEOUT_ERROR',
        title: 'Ошибка таймаута',
        description: `Operation timed out after ${timeoutMs}ms`,
        parameters: { action: 'long_task', timeoutMs },
      }));
    });

    test('should not create error report if timeout error already exists', async () => {
      mockErrorReporting.checkExistingReport.mockResolvedValueOnce({ exists: true });
      const operation = jest.fn(async ({ delay }) => {
        await new Promise(resolve => setTimeout(resolve, delay));
        return 'should_not_reach_here';
      });
      const timeoutMs = 100;
      const resultPromise = manager.timeoutOperation(operation, timeoutMs, { action: 'existing_timeout' });
      jest.advanceTimersByTime(timeoutMs + 10);

      await expect(resultPromise).rejects.toThrow(`Operation timed out after ${timeoutMs}ms`);
      expect(mockErrorReporting.createErrorReport).not.toHaveBeenCalled();
    });
  });

  describe('memoryOperation', () => {
    test('should execute operation successfully', async () => {
      const operation = jest.fn(async () => 'memory_success');
      const result = await manager.memoryOperation(operation, { dataSize: 1024 });
      expect(result).toBe('memory_success');
      expect(operation).toHaveBeenCalledWith({ dataSize: 1024 });
      expect(mockErrorReporting._generateMd5Hash).toHaveBeenCalledWith({ dataSize: 1024 });
      expect(mockErrorReporting.checkExistingReport).not.toHaveBeenCalled();
      expect(mockErrorReporting.createErrorReport).not.toHaveBeenCalled();
    });

    test('should categorize HEAP_OUT_OF_MEMORY error', async () => {
      const error = new Error('JavaScript heap out of memory');
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.memoryOperation(operation, { process: 'node' })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'HEAP_OUT_OF_MEMORY',
        title: 'Ошибка памяти: HEAP_OUT_OF_MEMORY',
        description: 'Недостаточно памяти в куче JavaScript. Попробуйте увеличить лимит памяти или оптимизировать код.',
        parameters: expect.objectContaining({ process: 'node' }),
      }));
    });

    test('should categorize CANNOT_ALLOCATE_MEMORY error', async () => {
      const error = new Error('Cannot allocate memory');
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.memoryOperation(operation, { service: 'db' })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'CANNOT_ALLOCATE_MEMORY',
        title: 'Ошибка памяти: CANNOT_ALLOCATE_MEMORY',
        description: 'Невозможно выделить память. Система исчерпала доступную память.',
        parameters: expect.objectContaining({ service: 'db' }),
      }));
    });

    test('should categorize STACK_OVERFLOW error', async () => {
      const error = new Error('Maximum call stack size exceeded');
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.memoryOperation(operation, { function: 'recursive' })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'STACK_OVERFLOW',
        title: 'Ошибка памяти: STACK_OVERFLOW',
        description: 'Переполнение стека. Возможно, бесконечная рекурсия или слишком глубокая вложенность вызовов.',
        parameters: expect.objectContaining({ function: 'recursive' }),
      }));
    });

    test('should categorize generic memory error', async () => {
      const error = new Error('Out of memory');
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.memoryOperation(operation, { task: 'large_alloc' })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'MEMORY_ERROR',
        title: 'Ошибка памяти: MEMORY_ERROR',
        description: 'Out of memory',
        parameters: expect.objectContaining({ task: 'large_alloc' }),
      }));
    });

    test('should not create error report if memory error already exists', async () => {
      mockErrorReporting.checkExistingReport.mockResolvedValueOnce({ exists: true });
      const error = new Error('Existing memory error');
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.memoryOperation(operation, { id: 'mem_id' })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).not.toHaveBeenCalled();
    });
  });

  describe('portOperation', () => {
    test('should execute operation successfully', async () => {
      const operation = jest.fn(async () => 'port_success');
      const result = await manager.portOperation(operation, { port: 3000 });
      expect(result).toBe('port_success');
      expect(operation).toHaveBeenCalledWith({ port: 3000 });
      expect(mockErrorReporting._generateMd5Hash).toHaveBeenCalledWith({ port: 3000 });
      expect(mockErrorReporting.checkExistingReport).not.toHaveBeenCalled();
      expect(mockErrorReporting.createErrorReport).not.toHaveBeenCalled();
    });

    test('should categorize EADDRINUSE error', async () => {
      const error = new Error('Port already in use');
      error.code = 'EADDRINUSE';
      error.port = 3000;
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.portOperation(operation, { port: 3000 })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'PORT_ALREADY_IN_USE',
        title: 'Ошибка порта: PORT_ALREADY_IN_USE',
        description: 'Порт 3000 уже используется другим процессом.',
        parameters: { port: 3000, errorCode: 'EADDRINUSE', errorPort: 3000 },
      }));
    });

    test('should categorize EACCES error for port', async () => {
      const error = new Error('Permission denied for port');
      error.code = 'EACCES';
      error.port = 80;
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.portOperation(operation, { port: 80 })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'PORT_PERMISSION_DENIED',
        title: 'Ошибка порта: PORT_PERMISSION_DENIED',
        description: 'Отказано в доступе к порту 80. Требуются права администратора.',
        parameters: { port: 80, errorCode: 'EACCES', errorPort: 80 },
      }));
    });

    test('should categorize EINVAL error for port', async () => {
      const error = new Error('Invalid port number');
      error.code = 'EINVAL';
      error.port = 99999;
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.portOperation(operation, { port: 99999 })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'INVALID_PORT',
        title: 'Ошибка порта: INVALID_PORT',
        description: 'Неверный номер порта: 99999',
        parameters: { port: 99999, errorCode: 'EINVAL', errorPort: 99999 },
      }));
    });

    test('should categorize generic port error', async () => {
      const error = new Error('Unknown port issue');
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.portOperation(operation, { device: 'eth0' })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'PORT_ERROR',
        title: 'Ошибка порта: PORT_ERROR',
        description: 'Unknown port issue',
        parameters: { device: 'eth0', errorCode: undefined, errorPort: undefined },
      }));
    });

    test('should not create error report if port error already exists', async () => {
      mockErrorReporting.checkExistingReport.mockResolvedValueOnce({ exists: true });
      const error = new Error('Existing port error');
      error.code = 'EADDRINUSE';
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.portOperation(operation, { port: 8080 })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).not.toHaveBeenCalled();
    });
  });

  describe('configOperation', () => {
    test('should execute operation successfully', async () => {
      const operation = jest.fn(async () => 'config_success');
      const result = await manager.configOperation(operation, { file: 'config.json' });
      expect(result).toBe('config_success');
      expect(operation).toHaveBeenCalledWith({ file: 'config.json' });
      expect(mockErrorReporting._generateMd5Hash).toHaveBeenCalledWith({ file: 'config.json' });
      expect(mockErrorReporting.checkExistingReport).not.toHaveBeenCalled();
      expect(mockErrorReporting.createErrorReport).not.toHaveBeenCalled();
    });

    test('should categorize INVALID_JSON error', async () => {
      const error = new Error('Unexpected token { in JSON at position 1');
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.configOperation(operation, { file: 'bad.json' })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'INVALID_JSON',
        title: 'Ошибка конфигурации: INVALID_JSON',
        description: 'Неверный формат JSON в конфигурационном файле.',
        parameters: { file: 'bad.json', errorMessage: error.message },
      }));
    });

    test('should categorize MISSING_MODULE error', async () => {
      const error = new Error('Cannot find module \'config-module\'');
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.configOperation(operation, { module: 'config-module' })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'MISSING_MODULE',
        title: 'Ошибка конфигурации: MISSING_MODULE',
        description: 'Отсутствует необходимый модуль.',
        parameters: { module: 'config-module', errorMessage: error.message },
      }));
    });

    test('should categorize INVALID_CONFIG error', async () => {
      const error = new Error('Invalid configuration: missing API key');
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.configOperation(operation, { type: 'api_config' })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'INVALID_CONFIG',
        title: 'Ошибка конфигурации: INVALID_CONFIG',
        description: 'Неверная конфигурация. Проверьте параметры.',
        parameters: { type: 'api_config', errorMessage: error.message },
      }));
    });

    test('should categorize MISSING_REQUIRED_FIELD error', async () => {
      const error = new Error('Required field missing: username');
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.configOperation(operation, { configId: 'user_settings' })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'MISSING_REQUIRED_FIELD',
        title: 'Ошибка конфигурации: MISSING_REQUIRED_FIELD',
        description: 'Отсутствует обязательное поле в конфигурации.',
        parameters: { configId: 'user_settings', errorMessage: error.message },
      }));
    });

    test('should categorize generic config error', async () => {
      const error = new Error('Unknown config issue');
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.configOperation(operation, { component: 'ui' })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'CONFIG_ERROR',
        title: 'Ошибка конфигурации: CONFIG_ERROR',
        description: 'Unknown config issue',
        parameters: { component: 'ui', errorMessage: error.message },
      }));
    });

    test('should not create error report if config error already exists', async () => {
      mockErrorReporting.checkExistingReport.mockResolvedValueOnce({ exists: true });
      const error = new Error('Existing config error');
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.configOperation(operation, { config: 'existing' })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).not.toHaveBeenCalled();
    });
  });

  describe('databaseOperation', () => {
    test('should execute operation successfully', async () => {
      const operation = jest.fn(async () => 'db_success');
      const result = await manager.databaseOperation(operation, { query: 'SELECT * FROM users' });
      expect(result).toBe('db_success');
      expect(operation).toHaveBeenCalledWith({ query: 'SELECT * FROM users' });
      expect(mockErrorReporting._generateMd5Hash).toHaveBeenCalledWith({ query: 'SELECT * FROM users' });
      expect(mockErrorReporting.checkExistingReport).not.toHaveBeenCalled();
      expect(mockErrorReporting.createErrorReport).not.toHaveBeenCalled();
    });

    test('should categorize SQLITE_CANTOPEN error', async () => {
      const error = new Error('unable to open database file');
      error.code = 'SQLITE_CANTOPEN';
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.databaseOperation(operation, { db: 'users.db' })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'DATABASE_CANNOT_OPEN',
        title: 'Ошибка базы данных: DATABASE_CANNOT_OPEN',
        description: 'Невозможно открыть базу данных. Проверьте права доступа и путь.',
        parameters: { db: 'users.db', errorCode: 'SQLITE_CANTOPEN' },
      }));
    });

    test('should categorize SQLITE_READONLY error', async () => {
      const error = new Error('database is readonly');
      error.code = 'SQLITE_READONLY';
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.databaseOperation(operation, { db: 'reports.db' })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'DATABASE_READONLY',
        title: 'Ошибка базы данных: DATABASE_READONLY',
        description: 'База данных доступна только для чтения.',
        parameters: { db: 'reports.db', errorCode: 'SQLITE_READONLY' },
      }));
    });

    test('should categorize SQLITE_LOCKED error', async () => {
      const error = new Error('database is locked');
      error.code = 'SQLITE_LOCKED';
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.databaseOperation(operation, { db: 'tasks.db' })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'DATABASE_LOCKED',
        title: 'Ошибка базы данных: DATABASE_LOCKED',
        description: 'База данных заблокирована другим процессом.',
        parameters: { db: 'tasks.db', errorCode: 'SQLITE_LOCKED' },
      }));
    });

    test('should categorize SQLITE_CORRUPT error', async () => {
      const error = new Error('database disk image is malformed');
      error.code = 'SQLITE_CORRUPT';
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.databaseOperation(operation, { db: 'corrupt.db' })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'DATABASE_CORRUPT',
        title: 'Ошибка базы данных: DATABASE_CORRUPT',
        description: 'База данных повреждена. Требуется восстановление.',
        parameters: { db: 'corrupt.db', errorCode: 'SQLITE_CORRUPT' },
      }));
    });

    test('should categorize DUPLICATE_KEY error', async () => {
      const error = new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed: users.email (duplicate key)');
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.databaseOperation(operation, { entity: 'user', field: 'email' })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'DUPLICATE_KEY',
        title: 'Ошибка базы данных: DUPLICATE_KEY',
        description: 'Нарушение уникальности ключа.',
        parameters: { entity: 'user', field: 'email', errorCode: undefined },
      }));
    });

    test('should categorize FOREIGN_KEY_VIOLATION error', async () => {
      const error = new Error('SQLITE_CONSTRAINT: foreign key constraint failed');
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.databaseOperation(operation, { table: 'orders', ref: 'product' })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'FOREIGN_KEY_VIOLATION',
        title: 'Ошибка базы данных: FOREIGN_KEY_VIOLATION',
        description: 'Нарушение внешнего ключа.',
        parameters: { table: 'orders', ref: 'product', errorCode: undefined },
      }));
    });

    test('should categorize generic database error', async () => {
      const error = new Error('Unknown database error');
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.databaseOperation(operation, { query: 'INSERT something' })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'DATABASE_ERROR',
        title: 'Ошибка базы данных: DATABASE_ERROR',
        description: 'Unknown database error',
        parameters: { query: 'INSERT something', errorCode: undefined },
      }));
    });

    test('should not create error report if database error already exists', async () => {
      mockErrorReporting.checkExistingReport.mockResolvedValueOnce({ exists: true });
      const error = new Error('Existing database error');
      error.code = 'SQLITE_LOCKED';
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.databaseOperation(operation, { db: 'existing.db' })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).not.toHaveBeenCalled();
    });
  });

  describe('authOperation', () => {
    test('should execute operation successfully', async () => {
      const operation = jest.fn(async () => 'auth_success');
      const result = await manager.authOperation(operation, { user: 'testuser' });
      expect(result).toBe('auth_success');
      expect(operation).toHaveBeenCalledWith({ user: 'testuser' });
      expect(mockErrorReporting._generateMd5Hash).toHaveBeenCalledWith({ user: 'testuser' });
      expect(mockErrorReporting.checkExistingReport).not.toHaveBeenCalled();
      expect(mockErrorReporting.createErrorReport).not.toHaveBeenCalled();
    });

    test('should categorize UNAUTHORIZED error (statusCode 401)', async () => {
      const error = new Error('Unauthorized');
      error.statusCode = 401;
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.authOperation(operation, { endpoint: '/api/data' })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'UNAUTHORIZED',
        title: 'Ошибка аутентификации: UNAUTHORIZED',
        description: 'Неавторизованный доступ. Проверьте учетные данные.',
        parameters: { endpoint: '/api/data', errorStatus: 401 },
      }));
    });

    test('should categorize FORBIDDEN error (statusCode 403)', async () => {
      const error = new Error('Forbidden');
      error.statusCode = 403;
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.authOperation(operation, { resource: '/admin' })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'FORBIDDEN',
        title: 'Ошибка аутентификации: FORBIDDEN',
        description: 'Доступ запрещен. Недостаточно прав.',
        parameters: { resource: '/admin', errorStatus: 403 },
      }));
    });

    test('should categorize INVALID_TOKEN error', async () => {
      const error = new Error('Invalid token provided');
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.authOperation(operation, { token: 'abc' })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'INVALID_TOKEN',
        title: 'Ошибка аутентификации: INVALID_TOKEN',
        description: 'Неверный токен аутентификации.',
        parameters: { token: 'abc', errorStatus: undefined },
      }));
    });

    test('should categorize TOKEN_EXPIRED error', async () => {
      const error = new Error('Token expired');
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.authOperation(operation, { userId: '123' })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'TOKEN_EXPIRED',
        title: 'Ошибка аутентификации: TOKEN_EXPIRED',
        description: 'Токен аутентификации истек.',
        parameters: { userId: '123', errorStatus: undefined },
      }));
    });

    test('should categorize INVALID_CREDENTIALS error', async () => {
      const error = new Error('Invalid credentials');
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.authOperation(operation, { username: 'baduser' })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'INVALID_CREDENTIALS',
        title: 'Ошибка аутентификации: INVALID_CREDENTIALS',
        description: 'Неверные учетные данные.',
        parameters: { username: 'baduser', errorStatus: undefined },
      }));
    });

    test('should categorize generic auth error', async () => {
      const error = new Error('Generic auth issue');
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.authOperation(operation, { flow: 'oauth' })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
        code: 'AUTH_ERROR',
        title: 'Ошибка аутентификации: AUTH_ERROR',
        description: 'Generic auth issue',
        parameters: { flow: 'oauth', errorStatus: undefined },
      }));
    });

    test('should not create error report if auth error already exists', async () => {
      mockErrorReporting.checkExistingReport.mockResolvedValueOnce({ exists: true });
      const error = new Error('Existing auth error');
      error.statusCode = 401;
      const operation = jest.fn(async () => { throw error; });

      await expect(manager.authOperation(operation, { session: 'active' })).rejects.toThrow(error);
      expect(mockErrorReporting.createErrorReport).not.toHaveBeenCalled();
    });
  });

  describe('ErrorHandlingStrategies', () => {
    let mockErrorReporting;
    let manager;
    let originalSetTimeout;

    beforeEach(() => {
      mockErrorReporting = {
        _generateMd5Hash: jest.fn(params => JSON.stringify(params)),
        checkExistingReport: jest.fn(() => Promise.resolve({ exists: false })),
        createErrorReport: jest.fn(() => Promise.resolve()),
      };
      manager = new ErrorHandlingStrategies(mockErrorReporting);
      jest.useFakeTimers();
      // Mock setTimeout to avoid real delays in retry logic
      originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((callback) => {
        callback();
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
      jest.useRealTimers();
      global.setTimeout = originalSetTimeout;
    });

    test('should apply error handling strategies', () => {
      // TODO: Implement tests for ErrorHandlingStrategies
      expect(true).toBe(true);
    });

    describe('retryOperation', () => {
      test('should execute operation successfully on first attempt', async () => {
        const operation = jest.fn(async () => 'success');
        const fallback = jest.fn(async () => 'fallback_result');
        const result = await manager.retryOperation(operation, fallback, { id: 1 });
        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(1);
        expect(fallback).not.toHaveBeenCalled();
        expect(mockErrorReporting.createErrorReport).not.toHaveBeenCalled();
      });

      test('should retry and execute operation successfully within max attempts', async () => {
        let callCount = 0;
        const operation = jest.fn(async () => {
          callCount++;
          if (callCount < 2) {
            throw new Error('Transient error');
          }
          return 'retried_success';
        });
        const fallback = jest.fn(async () => 'fallback_result');

        const resultPromise = manager.retryOperation(operation, fallback, { id: 2 }, 3);
        jest.runAllTimers(); // Use runAllTimers to advance all pending timers
        const result = await resultPromise;

        expect(result).toBe('retried_success');
        expect(operation).toHaveBeenCalledTimes(2);
        expect(fallback).not.toHaveBeenCalled();
        expect(mockErrorReporting.createErrorReport).not.toHaveBeenCalled();
      }, 5000); // Reduced timeout since setTimeout is mocked

      test('should exhaust retries and call fallback function', async () => {
        const error = new Error('Permanent failure');
        const operation = jest.fn(async () => { throw error; });
        const fallback = jest.fn(async () => 'fallback_executed');

        const resultPromise = manager.retryOperation(operation, fallback, { id: 3 }, 2);
        jest.runAllTimers(); // Use runAllTimers to advance all pending timers
        const result = await resultPromise;

        expect(result).toBe('fallback_executed');
        expect(operation).toHaveBeenCalledTimes(2);
        expect(fallback).toHaveBeenCalledWith({ id: 3 });
        expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
          code: 'RETRY_EXHAUSTED',
          title: 'Исчерпаны попытки повтора',
          description: `${error.message} (попытка 2/2)`,
          parameters: { id: 3, attempts: 2, maxAttempts: 2 },
        }));
      }, 5000); // Reduced timeout since setTimeout is mocked

      test('should not create error report if retry exhausted error already exists', async () => {
        mockErrorReporting.checkExistingReport.mockResolvedValueOnce({ exists: true });
        const error = new Error('Existing retry failure');
        const operation = jest.fn(async () => { throw error; });
        const fallback = jest.fn(async () => 'fallback_executed');

        const resultPromise = manager.retryOperation(operation, fallback, { id: 4 }, 1);
        jest.runAllTimers();
        const result = await resultPromise;

        expect(result).toBe('fallback_executed');
        expect(operation).toHaveBeenCalledTimes(1);
        expect(fallback).toHaveBeenCalledWith({ id: 4 });
        expect(mockErrorReporting.createErrorReport).not.toHaveBeenCalled();
      });
    });

    describe('featureOperation', () => {
      test('should execute primary operation successfully', async () => {
        const operation = jest.fn(async () => 'primary_success');
        const reducedOperation = jest.fn(async () => 'reduced_success');
        const result = await manager.featureOperation(operation, reducedOperation, { feature: 'export' });

        expect(result).toBe('primary_success');
        expect(operation).toHaveBeenCalledWith({ feature: 'export' });
        expect(reducedOperation).not.toHaveBeenCalled();
        expect(mockErrorReporting.createErrorReport).not.toHaveBeenCalled();
      });

      test('should fall back to reduced operation on primary operation failure', async () => {
        const error = new Error('Primary feature unavailable');
        const operation = jest.fn(async () => { throw error; });
        const reducedOperation = jest.fn(async () => 'reduced_functionality');
        const result = await manager.featureOperation(operation, reducedOperation, { feature: 'analytics' });

        expect(result).toBe('reduced_functionality');
        expect(operation).toHaveBeenCalledWith({ feature: 'analytics' });
        expect(reducedOperation).toHaveBeenCalledWith({ feature: 'analytics' });
        expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
          code: 'FEATURE_DISABLED',
          title: 'Функциональность отключена',
          description: 'Primary feature unavailable',
          parameters: { feature: 'analytics' },
        }));
      });

      test('should not create error report if feature disabled error already exists', async () => {
        mockErrorReporting.checkExistingReport.mockResolvedValueOnce({ exists: true });
        const error = new Error('Existing feature issue');
        const operation = jest.fn(async () => { throw error; });
        const reducedOperation = jest.fn(async () => 'reduced_functionality_existing');
        const result = await manager.featureOperation(operation, reducedOperation, { feature: 'reporting' });

        expect(result).toBe('reduced_functionality_existing');
        expect(mockErrorReporting.createErrorReport).not.toHaveBeenCalled();
      });
    });

    describe('batchOperation', () => {
      test('should process all items successfully', async () => {
        const processItem = jest.fn(async (item) => `processed_${item}`);
        const items = ['a', 'b', 'c'];
        const { results, errors } = await manager.batchOperation(processItem, items);

        expect(results).toEqual(['processed_a', 'processed_b', 'processed_c']);
        expect(errors).toEqual([]);
        expect(processItem).toHaveBeenCalledTimes(3);
        expect(mockErrorReporting.createErrorReport).not.toHaveBeenCalled();
      });

      test('should process some items and report failed ones', async () => {
        const processItem = jest.fn(async (item) => {
          if (item === 'b') {
            throw new Error('Failed to process b');
          }
          return `processed_${item}`;
        });
        const items = ['a', 'b', 'c'];

        const { results, errors } = await manager.batchOperation(processItem, items);

        expect(results).toEqual(['processed_a', 'processed_c']);
        expect(errors.length).toBe(1);
        expect(errors[0].item).toBe('b');
        expect(errors[0].error.message).toBe('Failed to process b');
        expect(mockErrorReporting.createErrorReport).toHaveBeenCalledTimes(2); // BATCH_ITEM_FAILED and BATCH_SUMMARY
        expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
          code: 'BATCH_ITEM_FAILED',
          title: 'Ошибка обработки элемента',
          description: 'Failed to process b',
          parameters: { item: 'b', index: 1 },
        }));
        expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
          code: 'BATCH_SUMMARY',
          title: 'Сводка ошибок batch операции',
          description: 'Обработано 2 из 3 элементов. Ошибок: 1',
          parameters: expect.objectContaining({
            total: 3,
            success: 2,
            errors: 1,
            errorDetails: expect.arrayContaining([{ item: 'b', md5: expect.any(String) }]),
          }),
        }));
      });

      test('should not create duplicate error reports for same item in batch', async () => {
        mockErrorReporting.checkExistingReport.mockImplementation((hash) => {
          if (hash === JSON.stringify({ item: 'b', index: 1 })) {
            return Promise.resolve({ exists: true });
          }
          return Promise.resolve({ exists: false });
        });

        const processItem = jest.fn(async (item) => {
          if (item === 'b') {
            throw new Error('Failed to process b');
          }
          return `processed_${item}`;
        });
        const items = ['a', 'b', 'b']; // Process 'b' twice to trigger duplicate check

        const { results, errors } = await manager.batchOperation(processItem, items);

        expect(results).toEqual(['processed_a']);
        expect(errors.length).toBe(2);
        expect(errors[0].item).toBe('b');
        expect(errors[1].item).toBe('b');
        expect(mockErrorReporting.createErrorReport).toHaveBeenCalledTimes(1); // Only BATCH_SUMMARY should be called, as BATCH_ITEM_FAILED for 'b' exists
        expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
          code: 'BATCH_SUMMARY',
          title: 'Сводка ошибок batch операции',
          description: 'Обработано 1 из 3 элементов. Ошибок: 2',
        }));
      });

      test('should not create BATCH_SUMMARY report if no errors occurred', async () => {
        const processItem = jest.fn(async (item) => `processed_${item}`);
        const items = ['x', 'y'];

        const { results, errors } = await manager.batchOperation(processItem, items);

        expect(results).toEqual(['processed_x', 'processed_y']);
        expect(errors).toEqual([]);
        expect(mockErrorReporting.createErrorReport).not.toHaveBeenCalled();
      });
    });
  });

  describe('ServiceConfigurationValidator', () => {
    let mockErrorReporting;
    let mockLogger;
    let mockServiceManagementUtils;
    let validator;
    let mockFsUtils;
    let mockChildProcess;

    beforeEach(() => {
      mockErrorReporting = {
        _generateMd5Hash: jest.fn(params => JSON.stringify(params)),
        checkExistingReport: jest.fn(() => Promise.resolve({ exists: false })),
        createErrorReport: jest.fn(() => Promise.resolve()),
      };
      mockLogger = {
        info: jest.fn(),
        error: jest.fn(),
      };
      mockServiceManagementUtils = {}; // Not directly used in the provided methods, but good to mock

      // Mock FileSystemUtils
      mockFsUtils = {
        readFile: jest.fn(),
      };
      jest.mock('../../../core/file-utils', () => ({
        FileSystemUtils: mockFsUtils,
      }));

      // Mock child_process
      mockChildProcess = {
        spawn: jest.fn(() => ({
          on: jest.fn(),
          unref: jest.fn(),
        })),
      };
      jest.mock('child_process', () => mockChildProcess);

      const { ServiceConfigurationValidator } = require('../../error-operations/src/ServiceConfigurationValidator');
      validator = new ServiceConfigurationValidator(mockErrorReporting, mockLogger, mockServiceManagementUtils);
    });

    afterEach(() => {
      jest.clearAllMocks();
      jest.resetModules(); // Unmock modules after each test
    });

    test('should validate service configurations', () => {
      // TODO: Implement tests for ServiceConfigurationValidator
      expect(true).toBe(true);
    });

    describe('validateServiceConfig', () => {
      test('should return true for a valid configuration', async () => {
        mockFsUtils.readFile.mockResolvedValueOnce(JSON.stringify({
          apps: [
            { id: 'app1', enabled: true, command: 'start app1' },
            { id: 'app2', enabled: false, command: 'start app2' },
          ],
        }));

        const isValid = await validator.validateServiceConfig();
        expect(isValid).toBe(true);
        expect(mockFsUtils.readFile).toHaveBeenCalledWith('config/apps-list.json', 'utf8');
        expect(mockErrorReporting.createErrorReport).not.toHaveBeenCalled();
      });

      test('should return false and report error for invalid configuration (enabled without command)', async () => {
        mockFsUtils.readFile.mockResolvedValueOnce(JSON.stringify({
          apps: [
            { id: 'app1', enabled: true, command: 'start app1' },
            { id: 'app2', enabled: true }, // Missing command
          ],
        }));

        const isValid = await validator.validateServiceConfig();
        expect(isValid).toBe(false);
        expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
          code: 'CONFIG_VALIDATION_FAILED',
          title: 'Ошибки валидации конфигурации',
          description: 'Найдено 1 ошибок в конфигурации',
          parameters: { errors: [{ appId: 'app2', issue: 'Включенное приложение без команды' }] },
        }));
      });

      test('should return false and report error if config file cannot be read', async () => {
        const readError = new Error('File not found');
        mockFsUtils.readFile.mockRejectedValueOnce(readError);

        const isValid = await validator.validateServiceConfig();
        expect(isValid).toBe(false);
        expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
          code: 'CONFIG_READ_FAILED',
          title: 'Ошибка чтения конфигурации',
          description: 'File not found',
          parameters: { configPath: 'config/apps-list.json' },
        }));
      });

      test('should return false and report error for invalid JSON in config file', async () => {
        mockFsUtils.readFile.mockResolvedValueOnce('invalid json');

        const isValid = await validator.validateServiceConfig();
        expect(isValid).toBe(false);
        expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
          code: 'CONFIG_READ_FAILED',
          title: 'Ошибка чтения конфигурации',
          description: expect.stringContaining('Unexpected token'),
          parameters: { configPath: 'config/apps-list.json' },
        }));
      });
    });

    describe('startFallbackService', () => {
      test('should start the fallback service successfully', async () => {
        mockFsUtils.readFile.mockResolvedValueOnce(JSON.stringify({
          apps: [
            { id: 'app1', enabled: true, command: 'start app1', path: '/path/to/app1' },
            { id: 'projects-manager-ui', enabled: true, command: 'node server.js', path: '/path/to/ui' },
          ],
        }));
        mockChildProcess.spawn.mockReturnValueOnce({ on: jest.fn(), unref: jest.fn() });

        const childProcess = await validator.startFallbackService('projects-manager-ui');
        expect(childProcess).toBeDefined();
        expect(mockFsUtils.readFile).toHaveBeenCalledWith('config/apps-list.json', 'utf8');
        expect(mockLogger.info).toHaveBeenCalledWith('🔄 Запускаю fallback сервис: projects-manager-ui');
        expect(mockLogger.info).toHaveBeenCalledWith('📦 Команда: node server.js');
        expect(mockChildProcess.spawn).toHaveBeenCalledWith('node server.js', [], {
          cwd: '/path/to/ui',
          stdio: 'inherit',
          shell: true,
        });
        expect(mockErrorReporting.createErrorReport).not.toHaveBeenCalled();
      });

      test('should throw error and report if service not found', async () => {
        mockFsUtils.readFile.mockResolvedValueOnce(JSON.stringify({
          apps: [
            { id: 'app1', enabled: true, command: 'start app1' },
          ],
        }));

        await expect(validator.startFallbackService('nonexistent-service')).rejects.toThrow('Сервис nonexistent-service не найден в конфигурации');
        expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
          code: 'FALLBACK_SERVICE_FAILED',
          title: 'Ошибка запуска fallback сервиса',
          description: 'Сервис nonexistent-service не найден в конфигурации',
          parameters: { serviceId: 'nonexistent-service' },
        }));
      });

      test('should throw error and report if service has no command', async () => {
        mockFsUtils.readFile.mockResolvedValueOnce(JSON.stringify({
          apps: [
            { id: 'projects-manager-ui', enabled: true }, // Missing command
          ],
        }));

        await expect(validator.startFallbackService('projects-manager-ui')).rejects.toThrow('Сервис projects-manager-ui не имеет команды запуска');
        expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
          code: 'FALLBACK_SERVICE_FAILED',
          title: 'Ошибка запуска fallback сервиса',
          description: 'Сервис projects-manager-ui не имеет команды запуска',
          parameters: { serviceId: 'projects-manager-ui' },
        }));
      });

      test('should throw error and report if config file cannot be read for fallback service', async () => {
        const readError = new Error('Config file inaccessible');
        mockFsUtils.readFile.mockRejectedValueOnce(readError);

        await expect(validator.startFallbackService('projects-manager-ui')).rejects.toThrow(readError);
        expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
          code: 'FALLBACK_SERVICE_FAILED',
          title: 'Ошибка запуска fallback сервиса',
          description: 'Config file inaccessible',
          parameters: { serviceId: 'projects-manager-ui' },
        }));
      });

      test('should throw error and report for invalid JSON in config file for fallback service', async () => {
        mockFsUtils.readFile.mockResolvedValueOnce('broken json');

        await expect(validator.startFallbackService('projects-manager-ui')).rejects.toThrow(expect.any(SyntaxError));
        expect(mockErrorReporting.createErrorReport).toHaveBeenCalledWith(expect.objectContaining({
          code: 'FALLBACK_SERVICE_FAILED',
          title: 'Ошибка запуска fallback сервиса',
          description: expect.stringContaining('Unexpected token'),
          parameters: { serviceId: 'projects-manager-ui' },
        }));
      });
    });
  });
});
