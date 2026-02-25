/**
 * error-core-adapter: локальный адаптер для регистрации ошибок
 * Гарантирует наличие метода registerError(error, context?)
 * и защищает от падений при отсутствии/некорректной реализации errorCoreManager.
 */

function createErrorCoreAdapter({ errorUtils, errorHandler, logger, externalErrorCoreManager } = {}) {
  const safeLogger = logger && typeof logger.error === 'function'
    ? logger
    : {
        error: (...args) => {
          try {
            // eslint-disable-next-line no-console
            console.error('[MCP-SERVER][ERROR-CORE]', ...args);
          } catch {
            /* ignore */
          }
        },
        warn: (...args) => {
          try {
            // eslint-disable-next-line no-console
            console.warn('[MCP-SERVER][ERROR-CORE]', ...args);
          } catch {
            /* ignore */
          }
        },
      };

  function logSafe(message, meta) {
    try {
      if (meta) {
        safeLogger.error(message, meta);
      } else {
        safeLogger.error(message);
      }
    } catch {
      /* ignore */
    }
  }

  function callExternalRegister(error, context) {
    if (!externalErrorCoreManager) {
      return false;
    }
    const register = externalErrorCoreManager.registerError;
    if (typeof register !== 'function') {
      return false;
    }
    try {
      register.call(externalErrorCoreManager, error, context);
      return true;
    } catch (e) {
      logSafe('external errorCoreManager.registerError failed', {
        originalError: error && error.message,
        registerErrorFailure: e && e.message,
      });
      return false;
    }
  }

  function registerError(error, context) {
    const ctx = context || {};

    // 1) Пытаемся вызвать внешний errorCoreManager (если он корректный)
    if (callExternalRegister(error, ctx)) {
      return;
    }

    // 2) Используем прямое логирование без errorUtils.safeExecute, чтобы избежать рекурсии
    try {
      logSafe('error registered via direct logging', {
        message: error && error.message,
        name: error && error.name,
        context: ctx,
      });
      return;
    } catch (e) {
      // Если даже логирование не работает, просто игнорируем
      try {
        // eslint-disable-next-line no-console
        console.error('[ERROR-CORE] Fallback error registration failed:', e.message);
      } catch {
        // Полностью игнорируем ошибки логирования
      }
    }

    // 3) Fallback: прямое логирование без доп. инфраструктуры
    logSafe('fallback error registration', {
      message: error && error.message,
      name: error && error.name,
      context: ctx,
    });
  }

  return {
    registerError,
  };
}

module.exports = {
  createErrorCoreAdapter,
};














