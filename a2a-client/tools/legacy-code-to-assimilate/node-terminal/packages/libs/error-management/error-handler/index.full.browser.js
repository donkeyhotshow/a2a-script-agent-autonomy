/**
 * Full browser-compatible implementation for ErrorHandlingUtils.
 * Provides client-side error handling capabilities, including sending error reports to a backend API.
 */

class ErrorHandlingUtils {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.apiClient = options.apiClient; // Expecting an apiClient instance
    this.logger.info('[ErrorHandlingUtils - Full Browser] Initializing full browser error handler.');
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

    this.logger.error('[ErrorHandlingUtils - Full Browser] Logged error:', errorEntry);
    this.sendErrorReport(errorEntry); // Attempt to send error report

    return errorEntry;
  }

  async sendErrorReport(errorEntry) {
    if (!this.apiClient || !this.apiClient.sendErrorReport) {
      this.logger.warn('[ErrorHandlingUtils - Full Browser] No API client or sendErrorReport method available to send error report.');
      return;
    }
    try {
      await this.apiClient.sendErrorReport(errorEntry);
      this.logger.info('[ErrorHandlingUtils - Full Browser] Error report sent to backend.');
    } catch (apiError) {
      this.logger.error('[ErrorHandlingUtils - Full Browser] Failed to send error report to backend:', apiError);
    }
  }

  createErrorReport() {
    this.logger.warn('[ErrorHandlingUtils - Full Browser] createErrorReport is not directly used for client-side reporting, logError sends data.');
    return this.errorHistory; // Return history for potential local display
  }

  // Other methods (handleServiceError, handleCriticalError, sendCriticalNotification, handleWithFallback, handleWithRetry)
  // can be implemented or adapted for browser context if needed.
  // For now, they will behave like the stub, or be more fully implemented as needed.

  handleServiceError(serviceId, error, context = {}) {
    this.logger.error(`[ErrorHandlingUtils - Full Browser] Service ${serviceId} failed:`, error, context);
    // Potentially send specific service error reports
    return { shouldRetry: false, error: 'Full browser: Service retry not supported in this client version' };
  }

  handleCriticalError(error, context = {}) {
    this.logger.error('[ErrorHandlingUtils - Full Browser] Critical error:', error, context);
    this.sendErrorReport({ ...error, context: { ...context, severity: 'critical' } });
  }

  sendCriticalNotification(errorEntry) {
    this.logger.warn('[ErrorHandlingUtils - Full Browser] sendCriticalNotification not fully implemented for browser context.');
    // Could integrate with a UI notification system here
  }

  async handleWithFallback(operation, fallbackOperation, context = {}) {
    try {
      return await operation();
    } catch (error) {
      this.logError(error, { operation: 'main', ...context });
      this.logger.warn('[ErrorHandlingUtils - Full Browser] Executing fallback operation');
      return await fallbackOperation();
    }
  }

  async handleWithRetry(operation, maxRetries = null, context = {}) {
    this.logger.warn('[ErrorHandlingUtils - Full Browser] handleWithRetry not fully implemented for browser context. Executing once.');
    try {
      return await operation();
    } catch (error) {
      this.logError(error, { operation: 'retry', attempts: 1, ...context });
      throw error;
    }
  }
}

// Export error classes (already defined in the stub, reusing them)
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

function validateInput(data, schema, logger) {
  const errors = [];

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];

    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(new ValidationError(`Поле ${field} обязательно`, field));
      continue;
    }

    if (value !== undefined && value !== null) {
      if (rules.type && typeof value !== rules.type) {
        errors.push(new ValidationError(`Поле ${field} должно быть типа ${rules.type}`, field));
      }

      if (rules.minLength && value.length < rules.minLength) {
        errors.push(new ValidationError(`Поле ${field} должно содержать минимум ${rules.minLength} символов`, field));
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(new ValidationError(`Поле ${field} должно содержать максимум ${rules.maxLength} символов`, field));
      }

      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(new ValidationError(`Поле ${field} имеет некорректный формат`, field));
      }

      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(new ValidationError(`Поле ${field} должно быть одним из: ${rules.enum.join(', ')}`, field));
      }
    }
  }

  if (errors.length > 0) {
    if (logger && logger.error) {
      logger.error('Ошибки валидации', errors);
    }
    throw new ValidationError('Ошибки валидации', null, errors);
  }

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
