import { LoggingUtils } from '@libs/core/logging';
import { ErrorHandlingUtils } from '@libs/error-management/error-handler';
import { ConfigurationUtils } from '@libs/core/configuration'; // Используем новую утилиту конфигурации
import { SharedUtils } from '@libs/core/shared'; // Используем новую общую утилиту
import EventEmitter from 'eventemitter3';
import PluginLoader from './PluginLoader';
import { PluginManager } from './PluginManager';
import { ErrorHandlerIntegration } from './ErrorHandlerIntegration';
import { RequestValidator } from './RequestValidator.js';
import { RequestTransformer } from './RequestTransformer.js';
import { ResponseTransformer } from './ResponseTransformer.js';
import { ControllerMiddleware } from './ControllerMiddleware.js'; // Импортируем новый модуль

/**
 * Универсальный контроллер с улучшенной архитектурой
 * - Поддержка middleware
 * - Улучшенная маршрутизация
 * - Управление жизненным циклом
 * - Версионирование API
 * - Интеграция с core библиотеками
 */
export class UniversalController extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Инициализация core библиотек
    this.logger = options.logger || new LoggingUtils();
    this.errorHandler = options.errorHandler || new ErrorHandlingUtils({ logger: this.logger });
    this.configManager = options.configManager || new ConfigurationUtils();
    
    // Инициализация ErrorHandlerIntegration
    this.errorHandlerIntegration = new ErrorHandlerIntegration(this.errorHandler);
    // Инициализация RequestValidator
    this.requestValidator = new RequestValidator({ configManager: this.configManager, logger: this.logger });
    // Инициализация RequestTransformer и ResponseTransformer
    this.requestTransformer = new RequestTransformer({ logger: this.logger });
    this.responseTransformer = new ResponseTransformer({ logger: this.logger });
    // Инициализация ControllerMiddleware
    this.controllerMiddleware = new ControllerMiddleware(this.logger, this.errorHandler, this.config, this.cache);

    // Основные компоненты
    this.resources = new Map(); // resourceName -> handlers
    this.cache = new Map(); // resourceName -> any
    this.middleware = []; // Глобальные middleware
    this.routes = new Map(); // route -> handler
    this.versions = new Map(); // version -> routes
    
    // Конфигурация
    this.config = {
      enableCaching: options.enableCaching !== false,
      cacheTimeout: options.cacheTimeout || 5 * 60 * 1000, // 5 минут
      maxCacheSize: options.maxCacheSize || 1000,
      enableVersioning: options.enableVersioning !== false,
      defaultVersion: options.defaultVersion || 'v1',
      enableMiddleware: options.enableMiddleware !== false,
      ...options
    };
    
    // Состояние
    this.isInitialized = false;
    this.isShutdown = false;
    
    this.logger.info('UniversalController инициализирован', { 
      enableCaching: this.config.enableCaching,
      cacheTimeout: this.config.cacheTimeout,
      maxCacheSize: this.config.maxCacheSize,
      enableVersioning: this.config.enableVersioning,
      defaultVersion: this.config.defaultVersion,
      enableMiddleware: this.config.enableMiddleware
    });
  }

  /**
   * Инициализация контроллера
   */
  async initialize() {
    if (this.isInitialized) {
      this.logger.warn('UniversalController уже инициализирован');
      return;
    }

    try {
      // Загрузка конфигурации
      await this.configManager.autoLoad('unified-controller');
      
      // Инициализация базовых middleware
      if (this.config.enableMiddleware) {
        this.addGlobalMiddleware(this.controllerMiddleware.loggingMiddleware.bind(this.controllerMiddleware));
        this.addGlobalMiddleware(this.controllerMiddleware.errorHandlingMiddleware.bind(this.controllerMiddleware));
        this.addGlobalMiddleware(this.controllerMiddleware.cachingMiddleware.bind(this.controllerMiddleware));
      }
      
      this.isInitialized = true;
      this.emit('initialized');
      this.logger.info('UniversalController успешно инициализирован');
    } catch (error) {
      this.errorHandler.handleError(error, { context: 'UniversalController.initialize' });
      throw error;
    }
  }

  /**
   * Добавление глобального middleware
   */
  addGlobalMiddleware(middleware) {
    if (typeof middleware !== 'function') {
      throw new Error('Middleware должен быть функцией');
    }
    this.middleware.push(middleware);
    this.logger.debug('Добавлен глобальный middleware', { middlewareCount: this.middleware.length });
  }

  /**
   * Регистрация маршрута
   * @param {string} method - Метод HTTP (GET, POST, PUT, DELETE)
   * @param {string} path - Путь маршрута
   * @param {Function} handler - Обработчик маршрута
   * @param {object} options - Дополнительные опции маршрута
   * @param {string} [options.validationSchema] - Имя схемы для валидации входящих данных.
   * @param {Function} [options.requestTransform] - Функция трансформации входящих данных запроса.
   * @param {Function} [options.responseTransform] - Функция трансформации исходящих данных ответа.
   */
  registerRoute(method, path, handler, options = {}) {
    const routeKey = `${method.toUpperCase()}:${path}`;
    // Оборачиваем основной обработчик для перехвата асинхронных ошибок
    let finalHandler = async (context) => {
      try {
        return await handler(context);
      } catch (error) {
        this.errorHandler.handleError(error, { context: 'UniversalController.registerRoute', routeKey });
        throw error;
      }
    };
    
    const routeMiddleware = [...(options.middleware || [])];
    
    if (options.requestTransform) {
      routeMiddleware.push(this.requestTransformer.transformationMiddleware(options.requestTransform));
    }
    
    if (options.validationSchema) {
      routeMiddleware.push(this.requestValidator.validationMiddleware(options.validationSchema));
    }

    // Middleware для трансформации ответа должен быть последним, но до finalHandler
    if (options.responseTransform) {
      routeMiddleware.push(this.responseTransformer.transformationMiddleware(options.responseTransform));
    }

    const routeConfig = {
      method: method.toUpperCase(),
      path,
      handler: finalHandler,
      middleware: routeMiddleware,
      version: options.version || this.config.defaultVersion,
      description: options.description,
      ...options
    };
    
    this.routes.set(routeKey, routeConfig);
    
    // Добавление в версионирование
    if (this.config.enableVersioning) {
      if (!this.versions.has(routeConfig.version)) {
        this.versions.set(routeConfig.version, new Map());
      }
      this.versions.get(routeConfig.version).set(routeKey, routeConfig);
    }
    
    this.logger.debug('Маршрут зарегистрирован', { routeKey, version: routeConfig.version });
  }

  /**
   * Поиск маршрута с параметрами
   */
  findRouteWithParams(method, path) {
    const methodUpper = method.toUpperCase();
    
    for (const [routeKey, route] of this.routes) {
      if (routeKey.startsWith(`${methodUpper}:`)) {
        const routePath = routeKey.substring(methodUpper.length + 1);
        
        // Простая проверка на соответствие паттерну с параметрами
        if (this.matchRoutePath(routePath, path)) {
          return route;
        }
      }
    }
    
    return null;
  }

  /**
   * Проверка соответствия пути маршрута с параметрами
   */
  matchRoutePath(routePath, requestPath) {
    const routeParts = routePath.split('/');
    const requestParts = requestPath.split('/');
    
    if (routeParts.length !== requestParts.length) {
      return false;
    }
    
    for (let i = 0; i < routeParts.length; i++) {
      const routePart = routeParts[i];
      const requestPart = requestParts[i];
      
      // Если часть маршрута начинается с :, это параметр
      if (routePart.startsWith(':')) {
        continue; // Параметр может быть любым
      }
      
      // Иначе части должны точно совпадать
      if (routePart !== requestPart) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Выполнение запроса с middleware
   */
  async executeRequest(method, path, params = {}, context = {}) {
    const routeKey = `${method.toUpperCase()}:${path}`;
    let route = this.routes.get(routeKey);
    
    // Если точный маршрут не найден, ищем маршрут с параметрами
    if (!route) {
      route = this.findRouteWithParams(method, path);
    }
    
    if (!route) {
      throw new Error(`Маршрут не найден: ${method} ${path}`);
    }

    const requestContext = {
      method: route.method,
      path: route.path,
      params,
      context,
      timestamp: Date.now(),
      requestId: SharedUtils.generateId() // Используем SharedUtils.generateId
    };

    // Выполнение middleware цепочки
    const middlewareChain = [...this.middleware, ...route.middleware];
    let currentIndex = 0;

    const next = async (error) => {
      if (error) {
        throw error;
      }
      
      if (currentIndex >= middlewareChain.length) {
        // Выполнение основного обработчика
        return await route.handler(requestContext);
      }
      
      const middleware = middlewareChain[currentIndex++];
      return await middleware(requestContext, next);
    };

    try {
      return await next();
    } catch (error) {
      this.errorHandler.handleError(error, { 
        context: 'UniversalController.executeRequest',
        requestContext 
      });
      throw error;
    }
  }

  /**
   * Регистрация обработчиков для ресурса
   */
  registerResource(resourceName, handlers, options = {}) {
    const safe = { actions: {}, ...handlers };
    this.resources.set(resourceName, safe);
    
    // Автоматическая регистрация CRUD маршрутов
    if (options.autoRoutes !== false) {
      this.registerCrudRoutes(resourceName, safe, options);
    }
    
    this.logger.info('Ресурс зарегистрирован', { resourceName, handlers: Object.keys(safe) });
  }

  /**
   * Автоматическая регистрация CRUD маршрутов
   */
  registerCrudRoutes(resourceName, handlers, options = {}) {
    const basePath = options.basePath || `/api/${resourceName}`;
    const version = options.version || this.config.defaultVersion;
    
    // GET /api/resource - список
    if (handlers.list) {
      this.registerRoute('GET', basePath, async (context) => {
        return await handlers.list(context.params);
      }, { version, description: `Получить список ${resourceName}` });
    }
    
    // GET /api/resource/:id - элемент
    if (handlers.get) {
      this.registerRoute('GET', `${basePath}/:id`, async (context) => {
        const id = context.params.id;
        return await handlers.get(id, context.params);
      }, { version, description: `Получить ${resourceName} по ID` });
    }
    
    // POST /api/resource - создание
    if (handlers.create) {
      this.registerRoute('POST', basePath, async (context) => {
        return await handlers.create(context.params);
      }, { version, description: `Создать новый ${resourceName}` });
    }
    
    // PUT /api/resource/:id - обновление
    if (handlers.update) {
      this.registerRoute('PUT', `${basePath}/:id`, async (context) => {
        const id = context.params.id;
        return await handlers.update(id, context.params);
      }, { version, description: `Обновить ${resourceName}` });
    }
    
    // DELETE /api/resource/:id - удаление
    if (handlers.remove) {
      this.registerRoute('DELETE', `${basePath}/:id`, async (context) => {
        const id = context.params.id;
        return await handlers.remove(id);
      }, { version, description: `Удалить ${resourceName}` });
    }
    
    // Регистрация кастомных действий
    if (handlers.actions) {
      Object.keys(handlers.actions).forEach(actionName => {
        this.registerRoute('POST', `${basePath}/actions/${actionName}`, async (context) => {
          return await handlers.actions[actionName](context.params);
        }, { version, description: `Выполнить действие ${actionName} для ${resourceName}` });
      });
    }
  }

  /**
   * Удаление ресурса
   */
  unregisterResource(resourceName) {
    this.resources.delete(resourceName);
    this.cache.delete(resourceName);
    this.logger.info('Ресурс удален', { resourceName });
  }

  /**
   * Получение зарегистрированных ресурсов
   */
  getRegisteredResources() {
    return Array.from(this.resources.keys());
  }

  /**
   * Получение маршрутов по версии
   */
  getRoutesByVersion(version = this.config.defaultVersion) {
    return this.versions.get(version) || new Map();
  }

  /**
   * Получение всех маршрутов
   */
  getAllRoutes() {
    return this.routes;
  }

  /**
   * Очистка кэша
   */
  clearCache(pattern = null) {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
    this.logger.info('Кэш очищен', { pattern });
  }

  /**
   * Получение статистики
   */
  getStats() {
    return {
      resources: this.resources.size,
      routes: this.routes.size,
      cacheSize: this.cache.size,
      middlewareCount: this.middleware.length,
      versions: Array.from(this.versions.keys()),
      isInitialized: this.isInitialized,
      isShutdown: this.isShutdown
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    if (this.isShutdown) {
      return;
    }
    
    this.logger.info('Начало graceful shutdown UniversalController');
    this.isShutdown = true;
    
    try {
      // Очистка кэша
      this.clearCache();
      
      // Уведомление о shutdown
      this.emit('shutdown');
      
      this.logger.info('UniversalController успешно завершен');
    } catch (error) {
      this.errorHandler.handleError(error, { context: 'UniversalController.shutdown' });
    }
  }

  // Обратная совместимость с существующим API
  async list(resourceName, params = {}) {
    return await this.executeRequest('GET', `/api/${resourceName}`, params);
  }

  async get(resourceName, id, params = {}) {
    return await this.executeRequest('GET', `/api/${resourceName}/${id}`, params);
  }

  async create(resourceName, payload) {
    return await this.executeRequest('POST', `/api/${resourceName}`, payload);
  }

  async update(resourceName, id, payload) {
    return await this.executeRequest('PUT', `/api/${resourceName}/${id}`, payload);
  }

  async remove(resourceName, id) {
    return await this.executeRequest('DELETE', `/api/${resourceName}/${id}`);
  }

  async action(resourceName, actionName, payload) {
    return await this.executeRequest('POST', `/api/${resourceName}/actions/${actionName}`, payload);
  }
}

export const universalController = new UniversalController();
export default UniversalController;
