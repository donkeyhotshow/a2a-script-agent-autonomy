/**
 * Browser-compatible stub for ErrorHandlingUtils.
 * Provides a minimal implementation for client-side error handling without Node.js dependencies.
 */

// Directly import browser-compatible logger
import { defaultLogger } from '../../logging-monitoring/logging/index.browser.js';

// A browser-compatible stub for configuration manager. No actual config loading needed.
const unifiedConfigManager = {
  getFeatureConfig: () => ({ getConfig: () => ({ featureFlags: { USE_CORE_VALIDATION: false } }) })
};

// A browser-compatible stub for ValidationUtils. No actual validation needed in this stub.
const validationUtils = {
  validate: (data, schema) => ({ isValid: true, errors: {} })
};

class ErrorHandlingUtils {
  constructor(options = {}) {
    this.logger = options.logger || defaultLogger;
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

    defaultLogger.error('[ErrorHandlingUtils - Browser Stub] Logged error:', errorEntry);
    return errorEntry;
  }

  createErrorReport() {
    defaultLogger.warn('[ErrorHandlingUtils - Browser Stub] createErrorReport not supported in browser.');
  }

  handleServiceError(serviceId, error, context = {}) {
    defaultLogger.error(`[ErrorHandlingUtils - Browser Stub] Service ${serviceId} failed:`, error, context);
    return { shouldRetry: false, error: 'Browser stub: Service retry not supported' };
  }

  handleCriticalError(error, context = {}) {
    defaultLogger.error('[ErrorHandlingUtils - Browser Stub] Critical error:', error, context);
  }

  sendCriticalNotification(errorEntry) {
    defaultLogger.error('[ErrorHandlingUtils - Browser Stub] sendCriticalNotification not supported in browser.');
  }

  async handleWithFallback(operation, fallbackOperation, context = {}) {
    try {
      return await operation();
    } catch (error) {
      this.logError(error, { operation: 'main', ...context });
      defaultLogger.warn('[ErrorHandlingUtils - Browser Stub] Executing fallback operation');
      return await fallbackOperation();
    }
  }

  async handleWithRetry(operation, maxRetries = null, context = {}) {
    defaultLogger.warn('[ErrorHandlingUtils - Browser Stub] handleWithRetry not fully supported in browser context. Executing once.');
    try {
      return await operation();
    } catch (error) {
      this.logError(error, { operation: 'retry', attempts: 1, ...context });
      throw error;
    }
  }
}

// Export error classes if they are used by the client and do not have Node.js dependencies
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

class ValidationError extends AppError {
  constructor(message, field = null, details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.field = field;
    this.details = details;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Ошибка аутентификации') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Ошибка авторизации') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Ресурс') {
    super(`${resource} не найден`, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Конфликт данных') {
    super(message, 409, 'CONFLICT');
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Превышен лимит запросов') {
    super(message, 429, 'RATE_LIMIT');
  }
}

// Stub validateInput for browser environment
function validateInput(data, schema, logger) {
  defaultLogger.warn('[error-handler/index.mjs] validateInput is a browser stub and performs no actual validation.');
  return true;
}

export {
  ErrorHandlingUtils,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  validateInput
};