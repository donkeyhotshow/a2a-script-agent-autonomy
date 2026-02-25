import { LoggingUtils } from '@libs/core/logging';
import { ErrorHandlingUtils } from '@libs/error-management/error-handler';

export class ControllerMiddleware {
  constructor(logger, errorHandler, config, cache) {
    this.logger = logger;
    this.errorHandler = errorHandler;
    this.config = config;
    this.cache = cache;
  }

  /**
   * Middleware для логирования
   */
  async loggingMiddleware(context, next) {
    const startTime = Date.now();
    const { method, path, requestId, params, context: reqContext } = context;
    const ip = reqContext?.ip || 'N/A';
    const userAgent = reqContext?.headers?.['user-agent'] || 'N/A';

    this.logger.info('Запрос начат', {
      method, 
      path, 
      requestId, 
      ip, 
      userAgent,
      params: this.filterSensitiveData(params) // Фильтруем чувствительные данные
    });
    
    try {
      const result = await next();
      const duration = Date.now() - startTime;
      
      this.logger.info('Запрос завершен', {
        method, 
        path, 
        requestId,
        duration,
        result: this.filterSensitiveData(result) // Фильтруем чувствительные данные из результата
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Запрос завершен с ошибкой', {
        method, 
        path, 
        requestId,
        duration,
        error: error.message, 
        stack: error.stack // Добавляем стек вызовов для отладки
      });
      throw error;
    }
  }

  /**
   * Вспомогательная функция для фильтрации чувствительных данных
   */
  filterSensitiveData(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveKeys = ['password', 'accessToken', 'privateKey', 'secret']; // Определите свои чувствительные ключи
    const filteredData = { ...data };

    for (const key of sensitiveKeys) {
      if (filteredData[key]) {
        filteredData[key] = '[FILTERED]';
      }
    }

    return filteredData;
  }

  /**
   * Middleware для обработки ошибок
   */
  async errorHandlingMiddleware(context, next) {
    try {
      return await next();
    } catch (error) {
      this.errorHandler.handleError(error, { 
        context: 'UniversalController.errorHandlingMiddleware',
        requestContext: context 
      });
      throw error;
    }
  }

  /**
   * Middleware для кэширования
   */
  async cachingMiddleware(context, next) {
    if (!this.config.enableCaching) {
      return await next();
    }

    const cacheKey = `${context.method}:${context.path}:${JSON.stringify(context.params)}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
      this.logger.debug('Данные получены из кэша', { cacheKey });
      return cached.data;
    }

    const result = await next();
    
    // Сохранение в кэш
    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    // Очистка старых записей
    if (this.cache.size > this.config.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    return result;
  }
}
