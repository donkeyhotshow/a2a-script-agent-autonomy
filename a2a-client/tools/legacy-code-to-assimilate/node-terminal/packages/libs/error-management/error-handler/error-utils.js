/**
 * Error Utils - Унифицированные утилиты для обработки ошибок
 * Заменяет прямые throw new Error и try-catch блоки
 */

import { ErrorHandlingUtils } from './index.js';

class ErrorUtils {
  constructor(options = {}) {
    if (!options.errorHandler) {
      throw new Error('[ErrorUtils] ErrorHandler instance must be provided.');
    }
    this.errorHandler = options.errorHandler;
    this.logger = options.logger || this.errorHandler.logger;
  }

  /**
   * Создание ошибки с контекстом
   */
  createError(message, code = 'UNKNOWN_ERROR', context = {}) {
    const error = new Error(message);
    error.code = code;
    error.context = context;
    error.timestamp = new Date().toISOString();
    return error;
  }

  /**
   * Безопасное выполнение функции с обработкой ошибок
   */
  async safeExecute(fn, context = 'unknown') {
    try {
      return await fn();
    } catch (error) {
      this.errorHandler.logError(error, context);
      throw error;
    }
  }

  /**
   * Синхронное безопасное выполнение
   */
  safeExecuteSync(fn, context = 'unknown') {
    try {
      return fn();
    } catch (error) {
      this.errorHandler.logError(error, context);
      throw error;
    }
  }

  /**
   * Обработка ошибки с логированием
   */
  handleError(error, context = 'unknown') {
    if (this.logger) {
      this.logger.error(`Error in ${context}:`, error.message, error.stack);
    }
    
    if (this.errorHandler) {
      this.errorHandler.logError(error, { context });
    }
  }

  /**
   * Проверка на ошибку
   */
  isError(value) {
    return value instanceof Error;
  }

  /**
   * Получение сообщения об ошибке
   */
  getErrorMessage(error) {
    if (this.isError(error)) {
      return error.message;
    }
    return String(error);
  }

  /**
   * Получение стека ошибки
   */
  getErrorStack(error) {
    if (this.isError(error)) {
      return error.stack;
    }
    return new Error().stack;
  }

  /**
   * Создание ошибки валидации
   */
  createValidationError(message, field = null) {
    return this.createError(message, 'VALIDATION_ERROR', { field });
  }

  /**
   * Создание ошибки сети
   */
  createNetworkError(message, url = null) {
    return this.createError(message, 'NETWORK_ERROR', { url });
  }

  /**
   * Создание ошибки файловой системы
   */
  createFileSystemError(message, path = null) {
    return this.createError(message, 'FILE_SYSTEM_ERROR', { path });
  }

  /**
   * Создание ошибки конфигурации
   */
  createConfigError(message, configKey = null) {
    return this.createError(message, 'CONFIG_ERROR', { configKey });
  }

  /**
   * Создание ошибки базы данных
   */
  createDatabaseError(message, query = null) {
    return this.createError(message, 'DATABASE_ERROR', { query });
  }

  /**
   * Создание ошибки авторизации
   */
  createAuthError(message, action = null) {
    return this.createError(message, 'AUTH_ERROR', { action });
  }

  /**
   * Создание ошибки разрешений
   */
  createPermissionError(message, resource = null) {
    return this.createError(message, 'PERMISSION_ERROR', { resource });
  }

  /**
   * Создание ошибки таймаута
   */
  createTimeoutError(message, timeout = null) {
    return this.createError(message, 'TIMEOUT_ERROR', { timeout });
  }

  /**
   * Создание ошибки ресурса не найден
   */
  createNotFoundError(message, resource = null) {
    return this.createError(message, 'NOT_FOUND_ERROR', { resource });
  }

  /**
   * Создание ошибки конфликта
   */
  createConflictError(message, resource = null) {
    return this.createError(message, 'CONFLICT_ERROR', { resource });
  }

  /**
   * Создание ошибки сервера
   */
  createServerError(message, statusCode = 500) {
    return this.createError(message, 'SERVER_ERROR', { statusCode });
  }

  /**
   * Создание ошибки клиента
   */
  createClientError(message, statusCode = 400) {
    return this.createError(message, 'CLIENT_ERROR', { statusCode });
  }

  /**
   * Обработка Promise с catch
   */
  async handlePromise(promise, context = 'unknown') {
    try {
      return await promise;
    } catch (error) {
      this.errorHandler.logError(error, context);
      throw error;
    }
  }

  /**
   * Создание обработчика для Promise.catch
   */
  createCatchHandler(context = 'unknown') {
    return (error) => {
      this.errorHandler.logError(error, context);
      throw error;
    };
  }

  /**
   * Обертка для функции с обработкой ошибок
   */
  wrapFunction(fn, context = 'unknown') {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.errorHandler.logError(error, context);
        throw error;
      }
    };
  }

  /**
   * Обертка для синхронной функции
   */
  wrapFunctionSync(fn, context = 'unknown') {
    return (...args) => {
      try {
        return fn(...args);
      } catch (error) {
        this.errorHandler.logError(error, context);
        throw error;
      }
    };
  }

  /**
   * Проверка и обработка результата
   */
  checkResult(result, errorMessage, context = 'unknown') {
    if (!result) {
      const error = this.createError(errorMessage, 'RESULT_ERROR', { context });
      this.errorHandler.logError(error, context);
      throw error;
    }
    return result;
  }

  /**
   * Проверка и обработка условия
   */
  checkCondition(condition, errorMessage, context = 'unknown') {
    if (!condition) {
      const error = this.createError(errorMessage, 'CONDITION_ERROR', { context });
      this.errorHandler.logError(error, context);
      throw error;
    }
  }

  /**
   * Форматирование ошибки для логирования
   */
  formatError(error) {
    if (!this.isError(error)) {
      return {
        message: String(error),
        stack: new Error().stack,
        timestamp: new Date().toISOString()
      };
    }

    return {
      message: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      stack: error.stack,
      context: error.context || {},
      timestamp: error.timestamp || new Date().toISOString()
    };
  }

  /**
   * Группировка ошибок по типу
   */
  groupErrors(errors) {
    const groups = {};
    
    errors.forEach(error => {
      const code = error.code || 'UNKNOWN_ERROR';
      if (!groups[code]) {
        groups[code] = [];
      }
      groups[code].push(error);
    });
    
    return groups;
  }

  /**
   * Фильтрация ошибок по коду
   */
  filterErrorsByCode(errors, code) {
    return errors.filter(error => error.code === code);
  }

  /**
   * Получение уникальных кодов ошибок
   */
  getUniqueErrorCodes(errors) {
    return [...new Set(errors.map(error => error.code || 'UNKNOWN_ERROR'))];
  }
}

// Создаем простой логгер для errorUtils
const simpleLogger = {
  info: console.log,
  error: console.error,
  warn: console.warn,
  debug: console.debug
};

// Создаем экземпляр ErrorHandlingUtils
const errorHandler = new ErrorHandlingUtils({
  logger: simpleLogger,
  projectRoot: process.cwd()
});

// Создаем экземпляр ErrorUtils
const errorUtilsInstance = new ErrorUtils({
  errorHandler: errorHandler,
  logger: simpleLogger
});

// Экспортируем утилиты
export { ErrorUtils };
export const errorUtils = errorUtilsInstance;

// Удобные функции для быстрого доступа
export const createError = (message, code, context) => errorUtilsInstance.createError(message, code, context);
export const safeExecute = (fn, context) => errorUtilsInstance.safeExecute(fn, context);
export const safeExecuteSync = (fn, context) => errorUtilsInstance.safeExecuteSync(fn, context);
export const handleError = (error, context) => errorUtilsInstance.handleError(error, context);
export const isError = (value) => errorUtilsInstance.isError(value);
export const getErrorMessage = (error) => errorUtilsInstance.getErrorMessage(error);
export const getErrorStack = (error) => errorUtilsInstance.getErrorStack(error);
export const createValidationError = (message, field) => errorUtilsInstance.createValidationError(message, field);
export const createNetworkError = (message, url) => errorUtilsInstance.createNetworkError(message, url);
export const createFileSystemError = (message, path) => errorUtilsInstance.createFileSystemError(message, path);
export const createConfigError = (message, configKey) => errorUtilsInstance.createConfigError(message, configKey);
export const createDatabaseError = (message, query) => errorUtilsInstance.createDatabaseError(message, query);
export const createAuthError = (message, action) => errorUtilsInstance.createAuthError(message, action);
export const createPermissionError = (message, resource) => errorUtilsInstance.createPermissionError(message, resource);
export const createTimeoutError = (message, timeout) => errorUtilsInstance.createTimeoutError(message, timeout);
export const createNotFoundError = (message, resource) => errorUtilsInstance.createNotFoundError(message, resource);
export const createConflictError = (message, resource) => errorUtilsInstance.createConflictError(message, resource);
export const createServerError = (message, statusCode) => errorUtilsInstance.createServerError(message, statusCode);
export const createClientError = (message, statusCode) => errorUtilsInstance.createClientError(message, statusCode);
export const handlePromise = (promise, context) => errorUtilsInstance.handlePromise(promise, context);
export const createCatchHandler = (context) => errorUtilsInstance.createCatchHandler(context);
export const wrapFunction = (fn, context) => errorUtilsInstance.wrapFunction(fn, context);
export const wrapFunctionSync = (fn, context) => errorUtilsInstance.wrapFunctionSync(fn, context);
export const checkResult = (result, errorMessage, context) => errorUtilsInstance.checkResult(result, errorMessage, context);
export const checkCondition = (condition, errorMessage, context) => errorUtilsInstance.checkCondition(condition, errorMessage, context);
export const formatError = (error) => errorUtilsInstance.formatError(error);
export const groupErrors = (errors) => errorUtilsInstance.groupErrors(errors);
export const filterErrorsByCode = (errors, code) => errorUtilsInstance.filterErrorsByCode(errors, code);
export const getUniqueErrorCodes = (errors) => errorUtilsInstance.getUniqueErrorCodes(errors);
