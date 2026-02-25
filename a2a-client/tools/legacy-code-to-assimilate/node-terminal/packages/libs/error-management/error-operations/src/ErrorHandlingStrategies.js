/**
 * Стратегии обработки ошибок, такие как повторные попытки и отключение функциональности.
 */

const { LoggingUtils } = require('../../../logging-monitoring/logging');

export class ErrorHandlingStrategies {
  constructor(errorReporting, logger) {
    this.errorReporting = errorReporting;
    this.logger = logger || new LoggingUtils();
  }

  _generateParametersHash(parameters) {
    return this.errorReporting._generateMd5Hash(parameters);
  }

  async _checkExistingError(md5Hash) {
    return await this.errorReporting.checkExistingReport(md5Hash);
  }

  async _createErrorReport(reportData) {
    return await this.errorReporting.createErrorReport(reportData);
  }

  /**
   * Ошибки с retry и предотвращением циклов
   */
  async retryOperation(operation, fallback, parameters = {}, maxAttempts = 3) {
    const md5Hash = this._generateParametersHash(parameters);
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const result = await operation(parameters);
        return result;
      } catch (error) {
        attempts++;
        
        if (attempts >= maxAttempts) {
          // Проверяем существующую ошибку
          const existingError = await this._checkExistingError(md5Hash);
          if (!existingError.exists) {
            await this._createErrorReport({
              code: 'RETRY_EXHAUSTED',
              title: 'Исчерпаны попытки повтора',
              description: `${error.message} (попытка ${attempts}/${maxAttempts})`,
              parameters: { ...parameters, attempts, maxAttempts },
              priority: 'high',
              scriptName: 'retryOperation'
            });
          }
          
          // Выполняем fallback
          return await fallback(parameters);
        }
        
        // Ждем перед следующей попыткой
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }
  }

  /**
   * Ошибки с отключением функциональности
   */
  async featureOperation(operation, reducedOperation, parameters = {}) {
    const md5Hash = this._generateParametersHash(parameters);
    
    try {
      const result = await operation(parameters);
      return result;
    } catch (error) {
      // Проверяем существующую ошибку
      const existingError = await this._checkExistingError(md5Hash);
      if (!existingError.exists) {
        await this._createErrorReport({
          code: 'FEATURE_DISABLED',
          title: 'Функциональность отключена',
          description: error.message,
          parameters: parameters,
          priority: 'medium',
          scriptName: 'featureOperation'
        });
      }
      
      // Продолжаем с ограниченной функциональностью
      return await reducedOperation(parameters);
    }
  }

  /**
   * Batch обработка с группировкой ошибок
   */
  async batchOperation(processItem, items) {
    const results = [];
    const errors = [];
    const md5Cache = new Set();
    
    for (const item of items) {
      try {
        const result = await processItem(item);
        results.push(result);
      } catch (error) {
        const parameters = { item, index: items.indexOf(item) };
        const md5Hash = this._generateParametersHash(parameters);
        
        // Проверяем кэш MD5
        if (!md5Cache.has(md5Hash)) {
          md5Cache.add(md5Hash);
          
          // Проверяем существующую ошибку
          const existingError = await this._checkExistingError(md5Hash);
          if (!existingError.exists) {
            await this._createErrorReport({
              code: 'BATCH_ITEM_FAILED',
              title: 'Ошибка обработки элемента',
              description: error.message,
              parameters: parameters,
              priority: 'medium',
              scriptName: 'batchOperation'
            });
          }
        }
        
        errors.push({ item, error, md5Hash });
      }
    }
    
    // Создаем сводный отчет если есть ошибки
    if (errors.length > 0) {
      await this._createErrorReport({
        code: 'BATCH_SUMMARY',
        title: 'Сводка ошибок batch операции',
        description: `Обработано ${results.length} из ${items.length} элементов. Ошибок: ${errors.length}`,
        parameters: { 
          total: items.length, 
          success: results.length, 
          errors: errors.length,
          errorDetails: errors.map(e => ({ item: e.item, md5: e.md5Hash }))
        },
        priority: 'medium',
        scriptName: 'batchOperation'
      });
    }
    
    return { results, errors };
  }
}
