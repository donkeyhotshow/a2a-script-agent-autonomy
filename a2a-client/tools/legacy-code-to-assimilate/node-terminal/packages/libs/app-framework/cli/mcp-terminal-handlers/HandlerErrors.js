/**
 * Ошибки обработчиков
 */
class HandlerError extends Error {
  constructor(message, code = 'HANDLER_ERROR', statusCode = 500, details = {}) {
    super(message);
    this.name = 'HandlerError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Ошибка валидации
 */
class ValidationError extends HandlerError {
  constructor(message, field = null) {
    super(message, 'VALIDATION_ERROR', 400, { field });
    this.name = 'ValidationError';
  }
}

/**
 * Ошибка безопасности
 */
class SecurityError extends HandlerError {
  constructor(message, reason = 'security_violation') {
    super(message, 'SECURITY_ERROR', 403, { reason });
    this.name = 'SecurityError';
  }
}

export { HandlerError, ValidationError, SecurityError };
