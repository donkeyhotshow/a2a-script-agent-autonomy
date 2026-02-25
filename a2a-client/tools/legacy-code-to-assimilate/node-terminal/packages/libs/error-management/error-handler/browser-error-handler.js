/**
 * Обработчик ошибок для браузера
 * Модуль содержит браузерную реализацию ErrorHandlingUtils
 */

/**
 * Browser-compatible stub for ErrorHandlingUtils.
 * Provides a minimal implementation for client-side error handling without Node.js dependencies.
 */
export class ErrorHandlingUtils {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.logger.warn('[ErrorHandlingUtils - Browser Stub] Using a browser-compatible stub for error handling.');
    this.errorHistory = [];
    this.maxHistorySize = options.maxHistorySize || 1000;
  }

  logError(error, context = {}) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      message: error.message || error,
      stack: error.stack,
      context,
      type: error.constructor.name || 'Error'
    };

    this.errorHistory.push(errorEntry);
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }

    this.logger.error('[ErrorHandlingUtils - Browser Stub] Logged error:', errorEntry);
    return errorEntry;
  }

  createErrorReport() {
    this.logger.warn('[ErrorHandlingUtils - Browser Stub] createErrorReport not supported in browser.');
  }

  handleServiceError(serviceId, error, context = {}) {
    this.logger.error(`[ErrorHandlingUtils - Browser Stub] Service ${serviceId} failed:`, error, context);
    return { shouldRetry: false, error: 'Browser stub: Service retry not supported' };
  }

  handleCriticalError(error, context = {}) {
    this.logger.error('[ErrorHandlingUtils - Browser Stub] Critical error:', error, context);
  }

  sendCriticalNotification(errorEntry) {
    this.logger.error('[ErrorHandlingUtils - Browser Stub] sendCriticalNotification not supported in browser.');
  }

  async handleWithFallback(operation, fallbackOperation, context = {}) {
    try {
      return await operation();
    } catch (error) {
      this.logError(error, { operation: 'main', ...context });
      this.logger.warn('[ErrorHandlingUtils - Browser Stub] Executing fallback operation');
      return await fallbackOperation();
    }
  }

  async handleWithRetry(operation, maxRetries = null, context = {}) {
    this.logger.warn('[ErrorHandlingUtils - Browser Stub] handleWithRetry not fully supported in browser context. Executing once.');
    try {
      return await operation();
    } catch (error) {
      this.logError(error, { operation: 'retry', attempts: 1, ...context });
      throw error;
    }
  }

  /**
   * Проверка частоты ошибок
   */
  checkErrorFrequency(threshold = 10, timeWindow = 60000) {
    const now = Date.now();
    const recentErrors = this.errorHistory.filter(error => 
      now - new Date(error.timestamp).getTime() < timeWindow
    );

    return {
      count: recentErrors.length,
      threshold,
      exceeded: recentErrors.length > threshold,
      timeWindow
    };
  }
}
