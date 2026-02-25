/**
 * Error Utils - CommonJS версия для совместимости
 * Упрощённая обёртка над ErrorHandlingUtils
 */

const { ErrorHandlingUtils } = require('./index.cjs');

// Простой логгер для errorUtils
const simpleLogger = {
  info: console.log,
  error: console.error,
  warn: console.warn,
  debug: console.debug
};

// Создаём экземпляр ErrorHandlingUtils
let errorHandlerInstance = null;

function getErrorHandler() {
  if (!errorHandlerInstance) {
    errorHandlerInstance = new ErrorHandlingUtils({
      logger: simpleLogger,
      projectRoot: process.cwd()
    });
  }
  return errorHandlerInstance;
}

// Форматирование ошибки для логирования
function formatError(error, level = 'error') {
  if (!(error instanceof Error)) {
    return {
      message: String(error),
      stack: new Error().stack,
      timestamp: new Date().toISOString(),
      level
    };
  }

  const formatted = {
    message: error.message,
    code: error.code || 'UNKNOWN_ERROR',
    stack: error.stack,
    context: error.context || {},
    timestamp: error.timestamp || new Date().toISOString(),
    level
  };

  // Если есть дополнительная информация
  if (error.name) formatted.name = error.name;
  if (error.cause) formatted.cause = error.cause;

  return formatted;
}

// Безопасное выполнение функции
async function safeExecute(fn, context = 'unknown') {
  try {
    return await fn();
  } catch (error) {
    const handler = getErrorHandler();
    handler.logError(error, context);
    throw error;
  }
}

// Синхронное безопасное выполнение
function safeExecuteSync(fn, context = 'unknown') {
  try {
    return fn();
  } catch (error) {
    const handler = getErrorHandler();
    handler.logError(error, context);
    throw error;
  }
}

// Обработка ошибки
function handleError(error, context = 'unknown') {
  const handler = getErrorHandler();
  handler.logError(error, context);
}

// Проверка на ошибку
function isError(value) {
  return value instanceof Error;
}

// Получение сообщения об ошибке
function getErrorMessage(error) {
  if (isError(error)) {
    return error.message;
  }
  return String(error);
}

// Получение стека ошибки
function getErrorStack(error) {
  if (isError(error)) {
    return error.stack;
  }
  return new Error().stack;
}

module.exports = {
  errorUtils: {
    formatError,
    safeExecute,
    safeExecuteSync,
    handleError,
    isError,
    getErrorMessage,
    getErrorStack
  },
  formatError,
  safeExecute,
  safeExecuteSync,
  handleError,
  isError,
  getErrorMessage,
  getErrorStack
};

