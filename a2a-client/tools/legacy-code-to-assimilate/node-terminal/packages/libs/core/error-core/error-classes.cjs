/**
 * Error Classes for Error Core Manager
 * Классы ошибок для централизованного управления ошибками
 */

/**
 * Базовый класс ошибки приложения
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Ошибка валидации
 */
class ValidationError extends AppError {
  constructor(message, field = null, details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.field = field;
    this.details = details;
  }
}

/**
 * Ошибка аутентификации
 */
class AuthenticationError extends AppError {
  constructor(message = 'Ошибка аутентификации') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

/**
 * Ошибка авторизации
 */
class AuthorizationError extends AppError {
  constructor(message = 'Ошибка авторизации') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

/**
 * Ошибка "Не найдено"
 */
class NotFoundError extends AppError {
  constructor(resource = 'Ресурс') {
    super(`${resource} не найден`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/**
 * Ошибка конфликта данных
 */
class ConflictError extends AppError {
  constructor(message = 'Конфликт данных') {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

/**
 * Ошибка превышения лимита запросов
 */
class RateLimitError extends AppError {
  constructor(message = 'Превышен лимит запросов') {
    super(message, 429, 'RATE_LIMIT');
    this.name = 'RateLimitError';
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError
};

