/**
 * Классы ошибок приложения
 * Модуль содержит все классы ошибок для системы обработки ошибок
 */

/**
 * Базовый класс ошибки приложения
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    // Capture stack trace только в Node.js
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Ошибка валидации
 */
export class ValidationError extends AppError {
  constructor(message, field = null, details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.field = field;
    this.details = details;
  }
}

/**
 * Ошибка аутентификации
 */
export class AuthenticationError extends AppError {
  constructor(message = 'Ошибка аутентификации') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/**
 * Ошибка авторизации
 */
export class AuthorizationError extends AppError {
  constructor(message = 'Ошибка авторизации') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

/**
 * Ошибка "не найдено"
 */
export class NotFoundError extends AppError {
  constructor(resource = 'Ресурс') {
    super(`${resource} не найден`, 404, 'NOT_FOUND');
  }
}

/**
 * Ошибка конфликта
 */
export class ConflictError extends AppError {
  constructor(message = 'Конфликт данных') {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Ошибка превышения лимита запросов
 */
export class RateLimitError extends AppError {
  constructor(message = 'Превышен лимит запросов') {
    super(message, 429, 'RATE_LIMIT');
  }
}
