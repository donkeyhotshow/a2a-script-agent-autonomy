/**
 * Ошибки приложения
 */
class AppError extends Error {
  constructor(message, code = 'APP_ERROR', statusCode = 500, details = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details
    };
  }
}

/**
 * Ошибка таймаута
 */
class TimeoutError extends Error {
  constructor(message = 'Operation timed out') {
    super(message);
    this.name = 'TimeoutError';
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message
    };
  }
}

/**
 * Ошибка выполнения команды
 */
class CommandExecutionError extends AppError {
  constructor(message, code = 'COMMAND_EXECUTION_ERROR', statusCode = 500, details = {}) {
    super(message, code, statusCode, details);
    this.name = 'CommandExecutionError';
  }
}

export { AppError, TimeoutError, CommandExecutionError };
