/**
 * Browser-compatible stub for ErrorHandlingUtils.
 * Provides a minimal implementation for client-side error handling without Node.js dependencies.
 */

class ErrorHandlingUtils {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.logger.warn('[ErrorHandlingUtils - Browser Stub] Using a browser-compatible stub for error handling.');
  }

  logError(error, context = {}) {
    this.logger.error('[ErrorHandlingUtils - Browser Stub] Logged error:', error, context);
    return { success: false, error: 'Browser stub: Logging to file not supported' };
  }

  // Add other methods as no-op or basic logging if needed by client code
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
  
  handleWithFallback(operation, fallbackOperation, context = {}) {
    try {
      return operation();
    } catch (error) {
      this.logError(error, { operation: 'main', ...context });
      this.logger.warn('[ErrorHandlingUtils - Browser Stub] Executing fallback operation');
      return fallbackOperation();
    }
  }

  handleWithRetry(operation, maxRetries = null, context = {}) {
    this.logger.warn('[ErrorHandlingUtils - Browser Stub] handleWithRetry not fully supported in browser context. Executing once.');
    try {
      return operation();
    } catch (error) {
      this.logError(error, { operation: 'retry', attempts: 1, ...context });
      throw error;
    }
  }
}

// Export other error classes if they are used by the client and do not have Node.js dependencies
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
