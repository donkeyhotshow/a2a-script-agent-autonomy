const SystemController = require('../index.js');
const request = require('supertest');
const express = require('express');

// Мокаем зависимости SystemController
jest.mock('../../utils/api', () => ({
  ApiUtils: {
    successResponse: jest.fn((res, data, message) => res.status(200).json({ success: true, data, message })),
    errorResponse: jest.fn((res, status, message) => res.status(status).json({ success: false, error: message }))
  }
}));

jest.mock('../../utils/logging', () => ({
  LoggingUtils: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    listLogFiles: jest.fn(),
    readLogFile: jest.fn()
  }))
}));

jest.mock('../../utils/file-system', () => ({
  FileSystemUtils: jest.fn().mockImplementation(() => ({
    getLogsDirectory: jest.fn(() => '/mock/logs'),
    getCacheDirectory: jest.fn(() => '/mock/cache'),
    getCurrentWorkingDirectory: jest.fn(() => '/mock/cwd'),
    pathExists: jest.fn()
  }))
}));

jest.mock('../../utils/configuration', () => ({
  ConfigurationUtils: jest.fn().mockImplementation(() => ({
    get: jest.fn()
  }))
}));

jest.mock('../../utils/process-management', () => ({
  ProcessManagementUtils: jest.fn().mockImplementation(() => ({
    executeCommand: jest.fn()
  }))
}));

jest.mock('../../utils/cache', () => ({
  CacheUtils: jest.fn().mockImplementation(() => ({
    getStats: jest.fn(() => ({ hits: 10, misses: 2, size: 5 })),
    clear: jest.fn()
  }))
}));

jest.mock('../../utils/shared', () => ({
  SharedUtils: jest.fn().mockImplementation(() => ({
    getSystemInfo: jest.fn(() => ({ platform: 'test', arch: 'x64' }))
  }))
}));

const { ApiUtils } = require('../../utils/api');
const { LoggingUtils } = require('../../utils/logging');
const { FileSystemUtils } = require('../../utils/file-system');
const { ConfigurationUtils } = require('../../utils/configuration');
const { ProcessManagementUtils } = require('../../utils/process-management');
const { CacheUtils } = require('../../utils/cache');
const { SharedUtils } = require('../../utils/shared');

describe('SystemController', () => {
  let systemController;
  let mockLoggerInstance;
  let mockProcessDaemonInstance;
  let mockCacheManagerInstance;
  let mockConfigManagerInstance;
  let mockFileSystemUtilsInstance;
  let mockSharedUtilsInstance;
  let app;

  beforeEach(() => {
    mockLoggerInstance = new LoggingUtils();
    mockProcessDaemonInstance = new ProcessManagementUtils();
    mockCacheManagerInstance = new CacheUtils();
    mockConfigManagerInstance = new ConfigurationUtils();
    mockFileSystemUtilsInstance = new FileSystemUtils();
    mockSharedUtilsInstance = new SharedUtils();

    systemController = new SystemController({
      logger: mockLoggerInstance,
      processDaemon: mockProcessDaemonInstance,
      cacheManager: mockCacheManagerInstance,
      configManager: mockConfigManagerInstance,
      fileSystemUtils: mockFileSystemUtilsInstance,
      sharedUtils: mockSharedUtilsInstance,
      getLogFiles: mockLoggerInstance.listLogFiles,
      getLogFileContent: mockLoggerInstance.readLogFile,
      getSystemInfo: mockSharedUtilsInstance.getSystemInfo,
      systemPaths: mockFileSystemUtilsInstance
    });

    app = express();
    app.use(express.json());
    app.use('/', systemController.getRouter());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('должен инициализироваться с предоставленными зависимостями', () => {
      expect(systemController.logger).toBe(mockLoggerInstance);
      expect(systemController.processDaemon).toBe(mockProcessDaemonInstance);
      expect(systemController.cacheManager).toBe(mockCacheManagerInstance);
      expect(systemController.configManager).toBe(mockConfigManagerInstance);
      expect(systemController.fileSystemUtils).toBe(mockFileSystemUtilsInstance);
      expect(systemController.sharedUtils).toBe(mockSharedUtilsInstance);
      expect(systemController.getLogFiles).toBe(mockLoggerInstance.listLogFiles);
      expect(systemController.getLogFileContent).toBe(mockLoggerInstance.readLogFile);
      expect(systemController.getSystemInfo).toBe(mockSharedUtilsInstance.getSystemInfo);
      expect(systemController.systemPaths).toBe(mockFileSystemUtilsInstance);
    });

    test('должен инициализироваться с дефолтными зависимостями, если они не предоставлены', () => {
      const defaultController = new SystemController();
      expect(defaultController.logger).toBeInstanceOf(LoggingUtils);
      expect(defaultController.processDaemon).toBeInstanceOf(ProcessManagementUtils);
      expect(defaultController.cacheManager).toBeInstanceOf(CacheUtils);
      expect(defaultController.configManager).toBeInstanceOf(ConfigurationUtils);
      expect(defaultController.fileSystemUtils).toBeInstanceOf(FileSystemUtils);
      expect(defaultController.sharedUtils).toBeInstanceOf(SharedUtils);
    });

    test('должен логировать предупреждения, если ключевые зависимости не предоставлены', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      new SystemController({}); // Создаем контроллер без зависимостей

      expect(warnSpy).toHaveBeenCalledWith('SystemController: ProcessDaemon не предоставлен. Будет использоваться экземпляр по умолчанию.');
      expect(warnSpy).toHaveBeenCalledWith('SystemController: CacheManager не предоставлен. Будет использоваться экземпляр по умолчанию.');
      expect(warnSpy).toHaveBeenCalledWith('SystemController: ConfigManager не предоставлен. Будет использоваться экземпляр по умолчанию.');
      warnSpy.mockRestore();
    });
  });

  describe('getRouter', () => {
    test('должен возвращать express router', () => {
      const router = systemController.getRouter();
      expect(router).toBeDefined();
      expect(typeof router.get).toBe('function');
      expect(typeof router.post).toBe('function');
    });

    test('должен настроить системные endpoints', () => {
      const router = systemController.getRouter();
      const paths = router.stack.filter(s => s.route).map(s => s.route.path);
      expect(paths).toContain('/logs');
      expect(paths).toContain('/logs/:filename');
      expect(paths).toContain('/cache');
      expect(paths).toContain('/cache/clear');
      expect(paths).toContain('/info');
      expect(paths).toContain('/execute');
    });
  });

  describe('GET /logs', () => {
    test('должен возвращать список логов', async () => {
      mockLoggerInstance.listLogFiles.mockResolvedValue(['log1.log', 'log2.log']);
      mockFileSystemUtilsInstance.getLogsDirectory.mockReturnValue('/mock/logs');

      const res = await request(app).get('/logs');

      expect(res.statusCode).toEqual(200);
      expect(ApiUtils.successResponse).toHaveBeenCalledWith(expect.any(Object), {
        logs: ['log1.log', 'log2.log'],
        total: 2
      });
      expect(mockLoggerInstance.listLogFiles).toHaveBeenCalledWith('/mock/logs');
    });

    test('должен возвращать 500, если функциональность логов недоступна', async () => {
      systemController.getLogFiles = null; // Имитация недоступности

      const res = await request(app).get('/logs');

      expect(res.statusCode).toEqual(500);
      expect(ApiUtils.errorResponse).toHaveBeenCalledWith(expect.any(Object), 500, 'Функциональность логов недоступна');
    });

    test('должен обрабатывать ошибки при получении логов', async () => {
      mockLoggerInstance.listLogFiles.mockRejectedValue(new Error('Test log error'));
      mockFileSystemUtilsInstance.getLogsDirectory.mockReturnValue('/mock/logs');

      const res = await request(app).get('/logs');

      expect(res.statusCode).toEqual(500);
      expect(mockLoggerInstance.error).toHaveBeenCalledWith('Ошибка при получении логов:', expect.any(Error));
      expect(ApiUtils.errorResponse).toHaveBeenCalledWith(expect.any(Object), 500, 'Ошибка при получении логов');
    });
  });

  describe('GET /logs/:filename', () => {
    test('должен возвращать содержимое лога', async () => {
      mockFileSystemUtilsInstance.getLogsDirectory.mockReturnValue('/mock/logs');
      mockFileSystemUtilsInstance.pathExists.mockResolvedValue(true);
      mockLoggerInstance.readLogFile.mockResolvedValue('Log content here');

      const res = await request(app).get('/logs/test.log');

      expect(res.statusCode).toEqual(200);
      expect(ApiUtils.successResponse).toHaveBeenCalledWith(expect.any(Object), 'Log content here');
      expect(mockLoggerInstance.readLogFile).toHaveBeenCalledWith('/mock/logs', 'test.log');
    });

    test('должен возвращать 404, если файл не найден', async () => {
      mockFileSystemUtilsInstance.getLogsDirectory.mockReturnValue('/mock/logs');
      mockFileSystemUtilsInstance.pathExists.mockResolvedValue(false);

      const res = await request(app).get('/logs/nonexistent.log');

      expect(res.statusCode).toEqual(404);
      expect(ApiUtils.errorResponse).toHaveBeenCalledWith(expect.any(Object), 404, 'Лог файл не найден');
    });

    test('должен возвращать 500, если функциональность логов недоступна', async () => {
      systemController.getLogFileContent = null; // Имитация недоступности

      const res = await request(app).get('/logs/test.log');

      expect(res.statusCode).toEqual(500);
      expect(ApiUtils.errorResponse).toHaveBeenCalledWith(expect.any(Object), 500, 'Функциональность логов недоступна');
    });

    test('должен обрабатывать ошибки при получении содержимого лога', async () => {
      mockFileSystemUtilsInstance.getLogsDirectory.mockReturnValue('/mock/logs');
      mockFileSystemUtilsInstance.pathExists.mockResolvedValue(true);
      mockLoggerInstance.readLogFile.mockRejectedValue(new Error('Read error'));

      const res = await request(app).get('/logs/error.log');

      expect(res.statusCode).toEqual(500);
      expect(mockLoggerInstance.error).toHaveBeenCalledWith('Ошибка при получении содержимого лога:', expect.any(Error));
      expect(ApiUtils.errorResponse).toHaveBeenCalledWith(expect.any(Object), 500, 'Ошибка при получении содержимого лога');
    });
  });

  describe('GET /cache', () => {
    test('должен возвращать информацию о кэше', async () => {
      mockCacheManagerInstance.getStats.mockReturnValue({ hits: 5, misses: 1, size: 3 });
      mockFileSystemUtilsInstance.getCacheDirectory.mockReturnValue('/mock/cache');

      const res = await request(app).get('/cache');

      expect(res.statusCode).toEqual(200);
      expect(ApiUtils.successResponse).toHaveBeenCalledWith(expect.any(Object), {
        hits: 5, misses: 1, size: 3, path: '/mock/cache'
      });
      expect(mockCacheManagerInstance.getStats).toHaveBeenCalled();
    });

    test('должен возвращать 500, если функциональность кэша недоступна', async () => {
      systemController.cacheManager = null; // Имитация недоступности

      const res = await request(app).get('/cache');

      expect(res.statusCode).toEqual(500);
      expect(ApiUtils.errorResponse).toHaveBeenCalledWith(expect.any(Object), 500, 'Функциональность кэша недоступна');
    });

    test('должен обрабатывать ошибки при получении информации о кэше', async () => {
      mockCacheManagerInstance.getStats.mockImplementation(() => { throw new Error('Cache error'); });

      const res = await request(app).get('/cache');

      expect(res.statusCode).toEqual(500);
      expect(mockLoggerInstance.error).toHaveBeenCalledWith('Ошибка при получении информации о кэше:', expect.any(Error));
      expect(ApiUtils.errorResponse).toHaveBeenCalledWith(expect.any(Object), 500, 'Ошибка при получении информации о кэше');
    });
  });

  describe('POST /cache/clear', () => {
    test('должен очищать кэш', async () => {
      const res = await request(app).post('/cache/clear');

      expect(res.statusCode).toEqual(200);
      expect(ApiUtils.successResponse).toHaveBeenCalledWith(expect.any(Object), null, 'Кэш очищен');
      expect(mockCacheManagerInstance.clear).toHaveBeenCalled();
    });

    test('должен возвращать 500, если функциональность кэша недоступна', async () => {
      systemController.cacheManager = null; // Имитация недоступности

      const res = await request(app).post('/cache/clear');

      expect(res.statusCode).toEqual(500);
      expect(ApiUtils.errorResponse).toHaveBeenCalledWith(expect.any(Object), 500, 'Функциональность кэша недоступна');
    });

    test('должен обрабатывать ошибки при очистке кэша', async () => {
      mockCacheManagerInstance.clear.mockImplementation(() => { throw new Error('Clear error'); });

      const res = await request(app).post('/cache/clear');

      expect(res.statusCode).toEqual(500);
      expect(mockLoggerInstance.error).toHaveBeenCalledWith('Ошибка при очистке кэша:', expect.any(Error));
      expect(ApiUtils.errorResponse).toHaveBeenCalledWith(expect.any(Object), 500, 'Ошибка при очистке кэша');
    });
  });

  describe('GET /info', () => {
    test('должен возвращать системную информацию', async () => {
      mockSharedUtilsInstance.getSystemInfo.mockReturnValue({ platform: 'linux', arch: 'x64' });
      mockConfigManagerInstance.get.mockReturnValue('production');

      const res = await request(app).get('/info');

      expect(res.statusCode).toEqual(200);
      expect(ApiUtils.successResponse).toHaveBeenCalledWith(expect.any(Object), {
        platform: 'linux', arch: 'x64', environment: 'production'
      });
      expect(mockSharedUtilsInstance.getSystemInfo).toHaveBeenCalled();
      expect(mockConfigManagerInstance.get).toHaveBeenCalledWith('server.environment');
    });

    test('должен возвращать 500, если функциональность системной информации недоступна', async () => {
      systemController.getSystemInfo = null; // Имитация недоступности

      const res = await request(app).get('/info');

      expect(res.statusCode).toEqual(500);
      expect(ApiUtils.errorResponse).toHaveBeenCalledWith(expect.any(Object), 500, 'Функциональность системной информации недоступна');
    });

    test('должен обрабатывать ошибки при получении системной информации', async () => {
      mockSharedUtilsInstance.getSystemInfo.mockImplementation(() => { throw new Error('System info error'); });

      const res = await request(app).get('/info');

      expect(res.statusCode).toEqual(500);
      expect(mockLoggerInstance.error).toHaveBeenCalledWith('Ошибка при получении системной информации:', expect.any(Error));
      expect(ApiUtils.errorResponse).toHaveBeenCalledWith(expect.any(Object), 500, 'Ошибка при получении системной информации');
    });
  });

  describe('POST /execute', () => {
    test('должен выполнять команду успешно', async () => {
      mockProcessDaemonInstance.executeCommand.mockResolvedValue({ success: true, output: 'Command output' });
      mockFileSystemUtilsInstance.getCurrentWorkingDirectory.mockReturnValue('/mock/cwd');

      const res = await request(app).post('/execute').send({ command: 'ls -la' });

      expect(res.statusCode).toEqual(200);
      expect(ApiUtils.successResponse).toHaveBeenCalledWith(expect.any(Object), 'Command output', 'Команда выполнена успешно');
      expect(mockProcessDaemonInstance.executeCommand).toHaveBeenCalledWith('ls -la', { cwd: '/mock/cwd' });
    });

    test('должен возвращать 400, если команда отсутствует', async () => {
      const res = await request(app).post('/execute').send({});

      expect(res.statusCode).toEqual(400);
      expect(ApiUtils.errorResponse).toHaveBeenCalledWith(expect.any(Object), 400, 'Команда обязательна');
    });

    test('должен возвращать 500, если функциональность выполнения команд недоступна', async () => {
      systemController.processDaemon = null; // Имитация недоступности

      const res = await request(app).post('/execute').send({ command: 'ls' });

      expect(res.statusCode).toEqual(500);
      expect(ApiUtils.errorResponse).toHaveBeenCalledWith(expect.any(Object), 500, 'Функциональность выполнения команд недоступна');
    });

    test('должен возвращать 500, если выполнение команды завершилось ошибкой', async () => {
      mockProcessDaemonInstance.executeCommand.mockResolvedValue({ success: false, error: 'Command failed' });
      mockFileSystemUtilsInstance.getCurrentWorkingDirectory.mockReturnValue('/mock/cwd');

      const res = await request(app).post('/execute').send({ command: 'bad-command' });

      expect(res.statusCode).toEqual(500);
      expect(mockLoggerInstance.error).toHaveBeenCalledWith('Ошибка выполнения команды: bad-command', 'Command failed');
      expect(ApiUtils.errorResponse).toHaveBeenCalledWith(expect.any(Object), 500, 'Ошибка выполнения команды');
    });

    test('должен обрабатывать исключения при выполнении команды', async () => {
      mockProcessDaemonInstance.executeCommand.mockImplementation(() => { throw new Error('Execution exception'); });
      mockFileSystemUtilsInstance.getCurrentWorkingDirectory.mockReturnValue('/mock/cwd');

      const res = await request(app).post('/execute').send({ command: 'throw-error' });

      expect(res.statusCode).toEqual(500);
      expect(mockLoggerInstance.error).toHaveBeenCalledWith('Ошибка при выполнении команды:', expect.any(Error));
      expect(ApiUtils.errorResponse).toHaveBeenCalledWith(expect.any(Object), 500, 'Ошибка при выполнении команды');
    });
  });
});