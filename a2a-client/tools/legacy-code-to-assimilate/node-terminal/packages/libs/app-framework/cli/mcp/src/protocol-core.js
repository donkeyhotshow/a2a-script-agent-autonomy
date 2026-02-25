const { LoggerCore } = require('../../../logging-reporting/core-logger/index.js'); // Updated path after libs reorganization
const { ErrorHandler } = require('../../core/error-handler/src/error-handler.js');
const { ConfigManager } = require('../../core/config-manager/index.js');
const { generateId } = require('../../shared/general-utils.js');
const EventEmitter = require('eventemitter3');

/**
 * Protocol Core - улучшенная версия с интеграцией core библиотек
 * - Управление соединениями с мониторингом состояния
 * - Обработка сообщений с валидацией и роутингом
 * - Интеграция с core библиотеками
 * - Graceful shutdown и обработка ошибок
 */
class ProtocolCore extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Инициализация core библиотек
    this.logger = options.logger || new LoggerCore();
    this.errorHandler = options.errorHandler || new ErrorHandler({ logger: this.logger });
    this.configManager = options.configManager || new ConfigManager();
    
    // Основные компоненты
    this.connections = new Map(); // connectionId -> connection
    this.messageHandlers = new Map(); // messageType -> handler
    this.routes = new Map(); // route -> handler
    this.middleware = []; // Глобальные middleware
    
    // Конфигурация
    this.config = {
      maxConnections: options.maxConnections || 100,
      connectionTimeout: options.connectionTimeout || 30000,
      messageTimeout: options.messageTimeout || 10000,
      enableHeartbeat: options.enableHeartbeat !== false,
      heartbeatInterval: options.heartbeatInterval || 30000,
      enableCompression: options.enableCompression !== false,
      enableEncryption: options.enableEncryption !== false,
      ...options
    };
    
    // Состояние
    this.isInitialized = false;
    this.isShutdown = false;
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      totalMessages: 0,
      failedMessages: 0,
      totalBytes: 0
    };
    
    this.logger.info('ProtocolCore инициализирован', { config: this.config });
  }

  /**
   * Инициализация протокола
   */
  async initialize() {
    if (this.isInitialized) {
      this.logger.warn('ProtocolCore уже инициализирован');
      return;
    }

    try {
      // Загрузка конфигурации
      await this.configManager.autoLoad('mcp-protocol');
      
      // Инициализация базовых middleware
      this.addGlobalMiddleware(this.loggingMiddleware.bind(this));
      this.addGlobalMiddleware(this.errorHandlingMiddleware.bind(this));
      this.addGlobalMiddleware(this.validationMiddleware.bind(this));
      
      // Запуск heartbeat если включен
      if (this.config.enableHeartbeat) {
        this.startHeartbeat();
      }
      
      this.isInitialized = true;
      this.emit('initialized');
      this.logger.info('ProtocolCore успешно инициализирован');
    } catch (error) {
      this.errorHandler.handleError(error, { context: 'ProtocolCore.initialize' });
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
   * Регистрация обработчика сообщений
   */
  registerMessageHandler(messageType, handler, options = {}) {
    if (typeof handler !== 'function') {
      throw new Error('Handler должен быть функцией');
    }
    
    this.messageHandlers.set(messageType, {
      handler,
      priority: options.priority || 0,
      description: options.description,
      validation: options.validation,
      ...options
    });
    
    this.logger.debug('Обработчик сообщений зарегистрирован', { messageType, priority: options.priority });
  }

  /**
   * Регистрация маршрута
   */
  registerRoute(route, handler, options = {}) {
    this.routes.set(route, {
      handler,
      middleware: options.middleware || [],
      description: options.description,
      ...options
    });
    
    this.logger.debug('Маршрут зарегистрирован', { route });
  }

  /**
   * Создание соединения
   */
  async createConnection(connectionId, options = {}) {
    if (this.connections.size >= this.config.maxConnections) {
      throw new Error('Достигнут лимит соединений');
    }

    const connection = {
      id: connectionId,
      status: 'connecting',
      createdAt: Date.now(),
      lastActivity: Date.now(),
      messageCount: 0,
      bytesTransferred: 0,
      options,
      ...options
    };

    this.connections.set(connectionId, connection);
    this.stats.totalConnections++;
    this.stats.activeConnections++;

    this.logger.info('Соединение создано', { connectionId, totalConnections: this.stats.activeConnections });
    this.emit('connection:created', { connectionId, connection });

    return connection;
  }

  /**
   * Отправка сообщения
   */
  async sendMessage(connectionId, message, options = {}) {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Соединение ${connectionId} не найдено`);
    }

    if (connection.status !== 'connected') {
      throw new Error(`Соединение ${connectionId} не активно`);
    }

    const messageContext = {
      connectionId,
      message,
      timestamp: Date.now(),
      messageId: generateId(),
      ...options
    };

    // Выполнение middleware цепочки
    const middlewareChain = [...this.middleware];
    let currentIndex = 0;

    const next = async (error) => {
      if (error) {
        throw error;
      }
      
      if (currentIndex >= middlewareChain.length) {
        // Отправка сообщения
        return await this.executeSendMessage(messageContext);
      }
      
      const middleware = middlewareChain[currentIndex++];
      return await middleware(messageContext, next);
    };

    try {
      const result = await next();
      
      // Обновление статистики
      connection.messageCount++;
      connection.lastActivity = Date.now();
      this.stats.totalMessages++;
      this.stats.totalBytes += JSON.stringify(message).length;
      
      this.logger.debug('Сообщение отправлено', { connectionId, messageId: messageContext.messageId });
      this.emit('message:sent', { connectionId, message, result });
      
      return result;
    } catch (error) {
      this.stats.failedMessages++;
      this.errorHandler.handleError(error, { 
        context: 'ProtocolCore.sendMessage',
        connectionId,
        messageContext 
      });
      throw error;
    }
  }

  /**
   * Обработка входящего сообщения
   */
  async handleMessage(connectionId, message, options = {}) {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Соединение ${connectionId} не найдено`);
    }

    const messageContext = {
      connectionId,
      message,
      timestamp: Date.now(),
      messageId: generateId(),
      ...options
    };

    // Выполнение middleware цепочки
    const middlewareChain = [...this.middleware];
    let currentIndex = 0;

    const next = async (error) => {
      if (error) {
        throw error;
      }
      
      if (currentIndex >= middlewareChain.length) {
        // Обработка сообщения
        return await this.executeHandleMessage(messageContext);
      }
      
      const middleware = middlewareChain[currentIndex++];
      return await middleware(messageContext, next);
    };

    try {
      const result = await next();
      
      // Обновление статистики
      connection.messageCount++;
      connection.lastActivity = Date.now();
      this.stats.totalMessages++;
      this.stats.totalBytes += JSON.stringify(message).length;
      
      this.logger.debug('Сообщение обработано', { connectionId, messageId: messageContext.messageId });
      this.emit('message:handled', { connectionId, message, result });
      
      return result;
    } catch (error) {
      this.stats.failedMessages++;
      this.errorHandler.handleError(error, { 
        context: 'ProtocolCore.handleMessage',
        connectionId,
        messageContext 
      });
      throw error;
    }
  }

  /**
   * Middleware для логирования
   */
  async loggingMiddleware(context, next) {
    const startTime = Date.now();
    this.logger.debug('Обработка сообщения', { 
      connectionId: context.connectionId, 
      messageId: context.messageId 
    });
    
    try {
      const result = await next();
      const duration = Date.now() - startTime;
      
      this.logger.debug('Сообщение обработано', { 
        connectionId: context.connectionId, 
        messageId: context.messageId,
        duration 
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Ошибка обработки сообщения', { 
        connectionId: context.connectionId, 
        messageId: context.messageId,
        duration,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Middleware для обработки ошибок
   */
  async errorHandlingMiddleware(context, next) {
    try {
      return await next();
    } catch (error) {
      this.errorHandler.handleError(error, { 
        context: 'ProtocolCore.errorHandlingMiddleware',
        messageContext: context 
      });
      throw error;
    }
  }

  /**
   * Middleware для валидации
   */
  async validationMiddleware(context, next) {
    // Базовая валидация сообщения
    if (!context.message || typeof context.message !== 'object') {
      throw new Error('Неверный формат сообщения');
    }

    if (!context.message.type) {
      throw new Error('Сообщение должно содержать тип');
    }

    return await next();
  }

  /**
   * Выполнение отправки сообщения
   */
  async executeSendMessage(context) {
    // Здесь должна быть реализация отправки через WebSocket или другой транспорт
    this.logger.debug('Выполнение отправки сообщения', { 
      connectionId: context.connectionId,
      messageType: context.message.type 
    });
    
    return { success: true, messageId: context.messageId };
  }

  /**
   * Выполнение обработки сообщения
   */
  async executeHandleMessage(context) {
    const messageType = context.message.type;
    const handler = this.messageHandlers.get(messageType);
    
    if (!handler) {
      throw new Error(`Неизвестный тип сообщения: ${messageType}`);
    }

    // Валидация если есть
    if (handler.validation) {
      const validationResult = await handler.validation(context.message);
      if (!validationResult.valid) {
        throw new Error(`Ошибка валидации: ${validationResult.error}`);
      }
    }

    return await handler.handler(context.message, context);
  }

  /**
   * Закрытие соединения
   */
  async closeConnection(connectionId, reason = 'manual') {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      this.logger.warn('Попытка закрыть несуществующее соединение', { connectionId });
      return false;
    }

    try {
      connection.status = 'closing';
      connection.closedAt = Date.now();
      connection.closeReason = reason;

      // Выполнение cleanup логики
      this.emit('connection:closing', { connectionId, reason });

      this.connections.delete(connectionId);
      this.stats.activeConnections--;

      this.logger.info('Соединение закрыто', { 
        connectionId, 
        reason, 
        activeConnections: this.stats.activeConnections 
      });
      this.emit('connection:closed', { connectionId, reason });

      return true;
    } catch (error) {
      this.errorHandler.handleError(error, { 
        context: 'ProtocolCore.closeConnection',
        connectionId 
      });
      return false;
    }
  }

  /**
   * Запуск heartbeat
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.performHeartbeat();
    }, this.config.heartbeatInterval);
    
    this.logger.info('Heartbeat запущен', { interval: this.config.heartbeatInterval });
  }

  /**
   * Выполнение heartbeat
   */
  async performHeartbeat() {
    const now = Date.now();
    const timeoutConnections = [];

    for (const [connectionId, connection] of this.connections) {
      if (now - connection.lastActivity > this.config.connectionTimeout) {
        timeoutConnections.push(connectionId);
      }
    }

    for (const connectionId of timeoutConnections) {
      this.logger.warn('Закрытие соединения по таймауту', { connectionId });
      await this.closeConnection(connectionId, 'timeout');
    }

    if (timeoutConnections.length > 0) {
      this.logger.info('Heartbeat завершен', { closedConnections: timeoutConnections.length });
    }
  }

  /**
   * Получение информации о соединении
   */
  getConnectionInfo(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return null;
    }

    return {
      id: connection.id,
      status: connection.status,
      createdAt: connection.createdAt,
      lastActivity: connection.lastActivity,
      messageCount: connection.messageCount,
      bytesTransferred: connection.bytesTransferred,
      uptime: Date.now() - connection.createdAt
    };
  }

  /**
   * Получение всех соединений
   */
  getAllConnections() {
    return Array.from(this.connections.keys()).map(id => this.getConnectionInfo(id));
  }

  /**
   * Получение статистики
   */
  getStats() {
    return {
      ...this.stats,
      isInitialized: this.isInitialized,
      isShutdown: this.isShutdown,
      config: this.config
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    if (this.isShutdown) {
      return;
    }
    
    this.logger.info('Начало graceful shutdown ProtocolCore');
    this.isShutdown = true;
    
    try {
      // Остановка heartbeat
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }
      
      // Закрытие всех соединений
      const connectionIds = Array.from(this.connections.keys());
      for (const connectionId of connectionIds) {
        await this.closeConnection(connectionId, 'shutdown');
      }
      
      this.emit('shutdown');
      this.logger.info('ProtocolCore успешно завершен');
    } catch (error) {
      this.errorHandler.handleError(error, { context: 'ProtocolCore.shutdown' });
    }
  }
}

export default ProtocolCore;
