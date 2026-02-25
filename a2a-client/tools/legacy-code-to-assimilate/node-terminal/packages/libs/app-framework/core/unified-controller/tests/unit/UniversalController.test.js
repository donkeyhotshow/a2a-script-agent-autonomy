
import { UniversalController } from '../../src/UniversalController.js';
import { ErrorHandlerIntegration } from '../../src/ErrorHandlerIntegration.js';
import { RequestValidator } from '../../src/RequestValidator.js';
import { RequestTransformer } from '../../src/RequestTransformer.js';
import { ResponseTransformer } from '../../src/ResponseTransformer.js';
import { ControllerMiddleware } from '../../src/ControllerMiddleware.js'; // Импортируем новый модуль
import { SharedUtils } from '@libs/core/shared'; // Возвращаем импорт SharedUtils к псевдониму

// Моки для зависимостей UniversalController
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const mockErrorHandler = {
  handleError: jest.fn(),
  getErrorContext: jest.fn(),
};

const mockConfigManager = {
  get: jest.fn(),
  set: jest.fn(),
  validateSchema: jest.fn(),
  autoLoad: jest.fn().mockResolvedValue(true),
};

// Мокирование ControllerMiddleware
const mockLoggingMiddleware = jest.fn(async (ctx, next) => next());
const mockErrorHandlingMiddleware = jest.fn(async (ctx, next) => next());
const mockCachingMiddleware = jest.fn(async (ctx, next) => next());
const mockFilterSensitiveData = jest.fn((data) => data);

jest.mock('../../src/ErrorHandlerIntegration.js');
jest.mock('../../src/RequestValidator.js');
jest.mock('../../src/RequestTransformer.js');
jest.mock('../../src/ResponseTransformer.js');
jest.mock('../../src/ControllerMiddleware.js', () => {
  const mockLoggingMiddleware = jest.fn(async (ctx, next) => next());
  const mockErrorHandlingMiddleware = jest.fn(async (ctx, next) => next());
  const mockCachingMiddleware = jest.fn(async (ctx, next) => next());
  const mockFilterSensitiveData = jest.fn((data) => data);

  return {
    ControllerMiddleware: jest.fn().mockImplementation((logger, errorHandler, config, cache) => ({
      loggingMiddleware: mockLoggingMiddleware,
      errorHandlingMiddleware: mockErrorHandlingMiddleware,
      cachingMiddleware: mockCachingMiddleware,
      filterSensitiveData: mockFilterSensitiveData,
      config: config,
      cache: cache
    }))
  };
});

// Моки для SharedUtils
jest.mock('@libs/core/shared', () => ({
  SharedUtils: {
    generateId: jest.fn(() => 'test_id'),
    deepMerge: jest.fn((target, source) => ({ ...target, ...source })),
    isObject: jest.fn(val => typeof val === 'object' && val !== null),
    wait: jest.fn().mockResolvedValue(),
  },
}));

describe('UniversalController', () => {
  let controller;
  let consoleErrorSpy;
  let consoleWarnSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Сброс моков конструкторов
    ErrorHandlerIntegration.mockClear();
    RequestValidator.mockClear();
    RequestTransformer.mockClear();
    ResponseTransformer.mockClear();
    ControllerMiddleware.mockClear(); // Очищаем мок ControllerMiddleware

    // Сброс моков методов ControllerMiddleware
    mockLoggingMiddleware.mockClear();
    mockErrorHandlingMiddleware.mockClear();
    mockCachingMiddleware.mockClear();
    mockFilterSensitiveData.mockClear();

    // Имитация возвращаемых значений для моков
    mockConfigManager.get.mockImplementation((key, defaultValue) => {
      if (key === 'controller.enableMiddleware') return true;
      if (key === 'controller.enableCaching') return true;
      if (key === 'controller.cacheTTL') return 3600000;
      if (key === 'controller.maxCacheSize') return 100;
      return defaultValue;
    });

    controller = new UniversalController({
      logger: mockLogger,
      errorHandler: mockErrorHandler,
      configManager: mockConfigManager
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  test('конструктор должен корректно инициализировать зависимости и свойства по умолчанию', () => {
    expect(controller.logger).toBe(mockLogger);
    expect(controller.errorHandler).toBe(mockErrorHandler);
    expect(controller.configManager).toBe(mockConfigManager);

    expect(ErrorHandlerIntegration).toHaveBeenCalledWith(mockErrorHandler);
    expect(RequestValidator).toHaveBeenCalledWith({ configManager: mockConfigManager, logger: mockLogger });
    expect(RequestTransformer).toHaveBeenCalledWith({ logger: mockLogger });
    expect(ResponseTransformer).toHaveBeenCalledWith({ logger: mockLogger });
    // Проверяем, что ControllerMiddleware был вызван с корректными аргументами
    expect(ControllerMiddleware).toHaveBeenCalledWith(mockLogger, mockErrorHandler, controller.config, controller.cache);
    // Дополнительная проверка свойств экземпляра ControllerMiddleware
    const mockControllerMiddlewareInstanceInConstructor = ControllerMiddleware.mock.instances[0];
    expect(mockControllerMiddlewareInstanceInConstructor.config).toEqual(controller.config);
    expect(mockControllerMiddlewareInstanceInConstructor.cache).toEqual(controller.cache);

    expect(controller.errorHandlerIntegration).toBeInstanceOf(ErrorHandlerIntegration);
    expect(controller.requestValidator).toBeInstanceOf(RequestValidator);
    expect(controller.requestTransformer).toBeInstanceOf(RequestTransformer);
    expect(controller.responseTransformer).toBeInstanceOf(ResponseTransformer);
    expect(controller.controllerMiddleware).toBeInstanceOf(ControllerMiddleware);

    expect(controller.isInitialized).toBe(false);
    expect(controller.isShutdown).toBe(false);

    expect(controller.resources).toEqual(new Map());
    expect(controller.cache).toEqual(new Map());
    expect(controller.middleware).toEqual([]);
    expect(controller.routes).toEqual(new Map());
    expect(controller.versions).toEqual(new Map());

    expect(controller.config).toEqual(expect.objectContaining({
      enableMiddleware: true,
      enableCaching: true,
      cacheTimeout: 300000,
      maxCacheSize: 1000,
    }));

    expect(mockLogger.info).toHaveBeenCalledWith('UniversalController инициализирован', expect.any(Object));
  });

  test('конструктор должен корректно применять переданные опции', () => {
    const customOptions = {
      enableMiddleware: false,
      enableCaching: false,
      cacheTimeout: 10000,
      maxCacheSize: 50,
    };
    const customController = new UniversalController({
      logger: mockLogger,
      errorHandler: mockErrorHandler,
      configManager: mockConfigManager,
      ...customOptions
    });

    expect(customController.config).toEqual(expect.objectContaining(customOptions));
  });

  test('инициализация должна добавлять глобальные middleware из ControllerMiddleware', async () => {
    // В этом тесте ControllerMiddleware уже мокирован в beforeEach, и его методы уже jest.fn()

    const controllerWithMiddleware = new UniversalController({
      logger: mockLogger,
      errorHandler: mockErrorHandler,
      configManager: mockConfigManager,
      enableMiddleware: true,
    });

    await controllerWithMiddleware.initialize();
    expect(controllerWithMiddleware.middleware.length).toBe(3); // Ожидаем 3 глобальных middleware
    // Проверяем, что middleware были привязаны к экземпляру ControllerMiddleware
    // Здесь мы проверяем, что addGlobalMiddleware получил функцию. Детали реализации проверяются в тестах самого ControllerMiddleware.
    expect(typeof controllerWithMiddleware.middleware[0]).toBe('function');
    expect(typeof controllerWithMiddleware.middleware[1]).toBe('function');
    expect(typeof controllerWithMiddleware.middleware[2]).toBe('function');

    // Дополнительная проверка, что методы middleware были вызваны на mockControllerMiddlewareInstance
    // Здесь мы используем глобально объявленные mock-функции
    expect(mockLoggingMiddleware).toHaveBeenCalled();
    expect(mockErrorHandlingMiddleware).toHaveBeenCalled();
    expect(mockCachingMiddleware).toHaveBeenCalled();
  });

  test('initialize должен корректно инициализировать контроллер', async () => {
    const emitSpy = jest.spyOn(controller, 'emit');
    await controller.initialize();

    expect(mockConfigManager.autoLoad).toHaveBeenCalledWith('unified-controller');
    expect(controller.middleware.length).toBeGreaterThan(0); // Ожидаем добавления глобального middleware
    expect(controller.isInitialized).toBe(true);
    expect(emitSpy).toHaveBeenCalledWith('initialized');

    expect(mockLogger.info).toHaveBeenCalledWith('UniversalController успешно инициализирован');
  });

  test('initialize не должен повторно инициализировать контроллер', async () => {
    const emitSpy = jest.spyOn(controller, 'emit');
    await controller.initialize();
    await controller.initialize(); // Повторный вызов

    expect(mockConfigManager.autoLoad).toHaveBeenCalledTimes(1); // Должен быть вызван только один раз
    expect(emitSpy).toHaveBeenCalledTimes(1); // Событие только один раз
    expect(mockLogger.warn).toHaveBeenCalledWith('UniversalController уже инициализирован');
  });

  test('initialize должен обрабатывать ошибки во время инициализации', async () => {
    mockConfigManager.autoLoad.mockRejectedValueOnce(new Error('Config autoLoad error'));

    await expect(controller.initialize()).rejects.toThrow('Config autoLoad error');

    expect(controller.isInitialized).toBe(false);
    expect(mockErrorHandler.handleError).toHaveBeenCalledWith(expect.any(Error), { context: 'UniversalController.initialize' });
  });

  test('addGlobalMiddleware должен добавлять middleware', () => {
    const middleware = jest.fn();
    controller.addGlobalMiddleware(middleware);
    
    expect(controller.middleware).toContain(middleware);
    expect(mockLogger.debug).toHaveBeenCalledWith('Добавлен глобальный middleware', { middlewareCount: 1 });
  });

  test('addGlobalMiddleware должен выбрасывать ошибку для невалидного middleware', () => {
    expect(() => controller.addGlobalMiddleware('not a function')).toThrow('Middleware должен быть функцией');
  });

  test('registerRoute должен регистрировать маршрут с базовыми опциями', () => {
    const handler = jest.fn();
    controller.registerRoute('GET', '/test', handler);
    
    const routeKey = 'GET:/test';
    expect(controller.routes.has(routeKey)).toBe(true);
    
    const route = controller.routes.get(routeKey);
    expect(route.method).toBe('GET');
    expect(route.path).toBe('/test');
    expect(typeof route.handler).toBe('function');
    expect(route.version).toBe('v1');
    
    expect(mockLogger.debug).toHaveBeenCalledWith('Маршрут зарегистрирован', { routeKey, version: 'v1' });
  });

  test('registerRoute должен регистрировать маршрут с дополнительными опциями', () => {
    const handler = jest.fn();
    const middleware = jest.fn();
    const options = {
      version: 'v2',
      description: 'Test route',
      middleware: [middleware],
      validationSchema: 'testSchema',
      requestTransform: jest.fn(),
      responseTransform: jest.fn()
    };
    
    controller.registerRoute('POST', '/test', handler, options);
    
    const routeKey = 'POST:/test';
    const route = controller.routes.get(routeKey);
    expect(route.version).toBe('v2');
    expect(route.description).toBe('Test route');
    expect(route.middleware.length).toBeGreaterThan(0);
  });

  test('executeRequest должен выполнять запрос через зарегистрированный маршрут', async () => {
    const handler = jest.fn().mockResolvedValue({ result: 'success' });
    controller.registerRoute('GET', '/test', handler);
    
    const result = await controller.executeRequest('GET', '/test', { id: 1 });
    
    expect(result).toEqual({ result: 'success' });
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      method: 'GET',
      path: '/test',
      params: { id: 1 },
      requestId: 'test_id'
    }));
  });

  test('executeRequest должен выбрасывать ошибку для несуществующего маршрута', async () => {
    await expect(controller.executeRequest('GET', '/nonexistent')).rejects.toThrow('Маршрут не найден: GET /nonexistent');
  });

  test('registerResource должен регистрировать ресурс с обработчиками', () => {
    const handlers = {
      list: jest.fn(),
      get: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      actions: {
        custom: jest.fn()
      }
    };
    
    controller.registerResource('testResource', handlers);
    
    expect(controller.resources.has('testResource')).toBe(true);
    expect(controller.routes.size).toBeGreaterThan(0); // CRUD маршруты должны быть зарегистрированы
    expect(mockLogger.info).toHaveBeenCalledWith('Ресурс зарегистрирован', { 
      resourceName: 'testResource', 
      handlers: expect.any(Array) 
    });
  });

  test('unregisterResource должен удалять ресурс', () => {
    const handlers = { list: jest.fn() };
    controller.registerResource('testResource', handlers);
    
    controller.unregisterResource('testResource');
    
    expect(controller.resources.has('testResource')).toBe(false);
    expect(mockLogger.info).toHaveBeenCalledWith('Ресурс удален', { resourceName: 'testResource' });
  });

  test('getRegisteredResources должен возвращать список зарегистрированных ресурсов', () => {
    controller.registerResource('resource1', { list: jest.fn() });
    controller.registerResource('resource2', { list: jest.fn() });
    
    const resources = controller.getRegisteredResources();
    expect(resources).toEqual(['resource1', 'resource2']);
  });

  test('getRoutesByVersion должен возвращать маршруты по версии', () => {
    controller.registerRoute('GET', '/v1/test', jest.fn(), { version: 'v1' });
    controller.registerRoute('GET', '/v2/test', jest.fn(), { version: 'v2' });
    
    const v1Routes = controller.getRoutesByVersion('v1');
    const v2Routes = controller.getRoutesByVersion('v2');
    
    expect(v1Routes.size).toBe(1);
    expect(v2Routes.size).toBe(1);
  });

  test('getAllRoutes должен возвращать все маршруты', () => {
    controller.registerRoute('GET', '/test1', jest.fn());
    controller.registerRoute('POST', '/test2', jest.fn());
    
    const allRoutes = controller.getAllRoutes();
    expect(allRoutes.size).toBe(2);
  });

  test('clearCache должен очищать кэш', () => {
    controller.cache.set('key1', { data: 'value1', timestamp: Date.now() });
    controller.cache.set('key2', { data: 'value2', timestamp: Date.now() });
    
    controller.clearCache();
    expect(controller.cache.size).toBe(0);
    expect(mockLogger.info).toHaveBeenCalledWith('Кэш очищен', { pattern: null });
  });

  test('clearCache должен очищать кэш по паттерну', () => {
    controller.cache.set('test_key1', { data: 'value1', timestamp: Date.now() });
    controller.cache.set('other_key', { data: 'value2', timestamp: Date.now() });
    
    controller.clearCache('test_.*');
    expect(controller.cache.size).toBe(1);
    expect(controller.cache.has('other_key')).toBe(true);
  });

  test('getStats должен возвращать статистику контроллера', () => {
    controller.registerResource('testResource', { list: jest.fn() });
    controller.registerRoute('GET', '/test', jest.fn());
    controller.cache.set('key', { data: 'value', timestamp: Date.now() });
    
    const stats = controller.getStats();
    expect(stats.resources).toBe(1);
    expect(stats.routes).toBeGreaterThanOrEqual(1); // Может быть больше из-за ресурса
    expect(stats.cacheSize).toBe(1);
    expect(stats.middlewareCount).toBeGreaterThanOrEqual(0);
    expect(stats.isInitialized).toBe(false);
    expect(stats.isShutdown).toBe(false);
  });

  test('shutdown должен корректно завершать работу контроллера', async () => {
    const emitSpy = jest.spyOn(controller, 'emit');
    controller.cache.set('key', { data: 'value', timestamp: Date.now() });
    
    await controller.shutdown();
    
    expect(controller.isShutdown).toBe(true);
    expect(controller.cache.size).toBe(0);
    expect(emitSpy).toHaveBeenCalledWith('shutdown');
    expect(mockLogger.info).toHaveBeenCalledWith('Начало graceful shutdown UniversalController');
    expect(mockLogger.info).toHaveBeenCalledWith('UniversalController успешно завершен');
  });

  test('shutdown не должен выполняться повторно', async () => {
    await controller.shutdown();
    const emitSpy = jest.spyOn(controller, 'emit');
    
    await controller.shutdown();
    
    expect(emitSpy).not.toHaveBeenCalled();
  });

  test('обратная совместимость: list должен работать', async () => {
    const handler = jest.fn().mockResolvedValue([{ id: 1 }]);
    controller.registerRoute('GET', '/api/testResource', handler);
    
    const result = await controller.list('testResource', { page: 1 });
    
    expect(result).toEqual([{ id: 1 }]);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      params: { page: 1 }
    }));
  });

  test('обратная совместимость: get должен работать', async () => {
    const handler = jest.fn().mockResolvedValue({ id: 1, name: 'test' });
    controller.registerRoute('GET', '/api/testResource/:id', handler);
    
    const result = await controller.get('testResource', 1);
    
    expect(result).toEqual({ id: 1, name: 'test' });
  });

  test('обратная совместимость: create должен работать', async () => {
    const handler = jest.fn().mockResolvedValue({ id: 1, name: 'new' });
    controller.registerRoute('POST', '/api/testResource', handler);
    
    const result = await controller.create('testResource', { name: 'new' });
    
    expect(result).toEqual({ id: 1, name: 'new' });
  });

  test('обратная совместимость: update должен работать', async () => {
    const handler = jest.fn().mockResolvedValue({ id: 1, name: 'updated' });
    controller.registerRoute('PUT', '/api/testResource/:id', handler);
    
    const result = await controller.update('testResource', 1, { name: 'updated' });
    
    expect(result).toEqual({ id: 1, name: 'updated' });
  });

  test('обратная совместимость: remove должен работать', async () => {
    const handler = jest.fn().mockResolvedValue({ success: true });
    controller.registerRoute('DELETE', '/api/testResource/:id', handler);
    
    const result = await controller.remove('testResource', 1);
    
    expect(result).toEqual({ success: true });
  });

  test('обратная совместимость: action должен работать', async () => {
    const handler = jest.fn().mockResolvedValue({ result: 'action completed' });
    controller.registerRoute('POST', '/api/testResource/actions/custom', handler);
    
    const result = await controller.action('testResource', 'custom', { data: 'test' });
    
    expect(result).toEqual({ result: 'action completed' });
  });
});
