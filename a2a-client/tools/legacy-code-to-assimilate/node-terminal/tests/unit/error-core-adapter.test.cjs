#!/usr/bin/env node
'use strict';

/**
 * Unit-тесты для проверки error-core-adapter
 *
 * Цели:
 * - Проверить что createErrorCoreAdapter корректно создает адаптер
 * - Проверить работу registerError метода
 * - Убедиться что адаптер правильно обрабатывает ошибки без рекурсии
 * - Проверить fallback логику при отсутствии внешних зависимостей
 */

const path = require('path');

function logOk(message) {
  console.log(`✅ ${message}`);
}

function logFail(message, error) {
  console.error(`❌ ${message}`);
  if (error) {
    console.error(`   ${error.message || String(error)}`);
  }
}

async function testErrorCoreAdapterCreation() {
  try {
    const { createErrorCoreAdapter } = require('../../mcp/server/core/error-core-adapter.cjs');

    // Тестируем создание адаптера без параметров
    const adapter1 = createErrorCoreAdapter();
    if (typeof adapter1.registerError !== 'function') {
      throw new Error('Adapter should have registerError method');
    }

    // Тестируем создание адаптера с mock объектами
    const mockLogger = {
      error: (msg, meta) => console.log(`[MOCK-LOG] ${msg}`, meta || ''),
      warn: (msg) => console.log(`[MOCK-WARN] ${msg}`)
    };

    const mockErrorUtils = {
      safeExecute: (fn) => fn()
    };

    const adapter2 = createErrorCoreAdapter({
      errorUtils: mockErrorUtils,
      logger: mockLogger
    });

    if (typeof adapter2.registerError !== 'function') {
      throw new Error('Adapter with parameters should have registerError method');
    }

    logOk('createErrorCoreAdapter корректно создает адаптеры');
  } catch (error) {
    logFail('Ошибка при создании error-core-adapter', error);
    throw error;
  }
}

async function testRegisterErrorMethod() {
  try {
    const { createErrorCoreAdapter } = require('../../mcp/server/core/error-core-adapter.cjs');

    let logMessages = [];
    const mockLogger = {
      error: (msg, meta) => logMessages.push({ level: 'error', msg, meta }),
      warn: (msg) => logMessages.push({ level: 'warn', msg })
    };

    const adapter = createErrorCoreAdapter({
      logger: mockLogger
    });

    // Тестируем registerError без externalErrorCoreManager
    const testError = new Error('Test error');
    const testContext = { operation: 'test', userId: '123' };

    adapter.registerError(testError, testContext);

    // Проверяем что логирование произошло
    const errorLogs = logMessages.filter(log => log.level === 'error');
    if (errorLogs.length === 0) {
      throw new Error('Error should be logged');
    }

    // Проверяем что сообщение об ошибке залогировано
    const hasErrorMessage = errorLogs.some(log => log.msg.includes('error registered via direct logging'));
    if (!hasErrorMessage) {
      throw new Error('Error message should be logged');
    }

    logOk('registerError метод работает корректно');
  } catch (error) {
    logFail('Ошибка при тестировании registerError метода', error);
    throw error;
  }
}

async function testRegisterErrorWithExternalManager() {
  try {
    const { createErrorCoreAdapter } = require('../../mcp/server/core/error-core-adapter.cjs');

    let externalCalled = false;
    let logMessages = [];

    const mockLogger = {
      error: (msg, meta) => logMessages.push({ level: 'error', msg, meta }),
      warn: (msg) => logMessages.push({ level: 'warn', msg })
    };

    // Мокаем внешний errorCoreManager без registerError метода
    const mockExternalManager = {
      handleError: () => { externalCalled = true; }
      // Нет registerError метода
    };

    const adapter = createErrorCoreAdapter({
      logger: mockLogger,
      externalErrorCoreManager: mockExternalManager
    });

    // Тестируем registerError с external manager без registerError
    const testError = new Error('Test error with external manager');
    adapter.registerError(testError);

    // Проверяем что fallback логика сработала (external не имеет registerError)
    const errorLogs = logMessages.filter(log => log.level === 'error');
    const hasFallbackLog = errorLogs.some(log => log.msg.includes('error registered via direct logging'));

    if (!hasFallbackLog) {
      throw new Error('Fallback logging should occur when external manager lacks registerError');
    }

    logOk('registerError корректно работает с external manager без registerError');
  } catch (error) {
    logFail('Ошибка при тестировании registerError с external manager', error);
    throw error;
  }
}

async function testRegisterErrorWithErrorUtils() {
  try {
    const { createErrorCoreAdapter } = require('../../mcp/server/core/error-core-adapter.cjs');

    let logMessages = [];

    const mockLogger = {
      error: (msg, meta) => logMessages.push({ level: 'error', msg, meta }),
      warn: (msg) => logMessages.push({ level: 'warn', msg })
    };

    // В новой реализации errorUtils.safeExecute больше не используется для предотвращения рекурсии
    // Вместо этого используется прямое логирование
    const adapter = createErrorCoreAdapter({
      logger: mockLogger,
      errorUtils: {} // Пустой объект, safeExecute не будет использоваться
    });

    // Тестируем registerError с errorUtils (который не используется в новой реализации)
    const testError = new Error('Test error with errorUtils');
    adapter.registerError(testError);

    // Проверяем логирование
    const errorLogs = logMessages.filter(log => log.level === 'error');
    const hasDirectLog = errorLogs.some(log => log.msg.includes('error registered via direct logging'));

    if (!hasDirectLog) {
      throw new Error('Direct logging should occur');
    }

    logOk('registerError корректно работает без errorUtils.safeExecute (предотвращение рекурсии)');
  } catch (error) {
    logFail('Ошибка при тестировании registerError с errorUtils', error);
    throw error;
  }
}

async function testRegisterErrorErrorHandling() {
  try {
    const { createErrorCoreAdapter } = require('../../mcp/server/core/error-core-adapter.cjs');

    let logMessages = [];

    // Создаем logger который будет выбрасывать исключения
    const failingLogger = {
      error: () => { throw new Error('Logger failed'); },
      warn: () => { throw new Error('Logger failed'); }
    };

    const adapter = createErrorCoreAdapter({
      logger: failingLogger
    });

    // Тестируем registerError когда logger падает
    const testError = new Error('Test error with failing logger');

    // Это не должно выбросить исключение, даже если logger падает
    adapter.registerError(testError);

    logOk('registerError корректно обрабатывает ошибки логирования');
  } catch (error) {
    logFail('Ошибка при тестировании обработки ошибок в registerError', error);
    throw error;
  }
}

async function testNoRecursion() {
  try {
    const { createErrorCoreAdapter } = require('../../mcp/server/core/error-core-adapter.cjs');

    let callCount = 0;
    let logMessages = [];

    const mockLogger = {
      error: (msg, meta) => {
        logMessages.push({ level: 'error', msg, meta });
        callCount++;
      },
      warn: (msg) => logMessages.push({ level: 'warn', msg })
    };

    // Создаем errorUtils.safeExecute который пытается вызвать logError (имитируя рекурсию)
    const mockErrorUtils = {
      safeExecute: (fn) => {
        // Имитируем вызов errorHandler.logError который приведет к рекурсии
        // Но в нашем адаптере это должно быть предотвращено
        try {
          return fn();
        } catch (e) {
          // Если функция падает, логируем напрямую
          mockLogger.error('safeExecute function failed', { error: e.message });
          throw e;
        }
      }
    };

    const adapter = createErrorCoreAdapter({
      logger: mockLogger,
      errorUtils: mockErrorUtils
    });

    // Вызываем registerError
    const testError = new Error('Test recursion prevention');
    adapter.registerError(testError);

    // Проверяем что логирование произошло только один раз (без рекурсии)
    const errorLogs = logMessages.filter(log => log.level === 'error');
    if (errorLogs.length !== 1) {
      throw new Error(`Expected 1 log message, got ${errorLogs.length} (possible recursion)`);
    }

    logOk('registerError предотвращает рекурсию');
  } catch (error) {
    logFail('Ошибка при тестировании предотвращения рекурсии', error);
    throw error;
  }
}

async function main() {
  console.log('\n🧪 Запуск тестов error-core-adapter...\n');

  await testErrorCoreAdapterCreation();
  await testRegisterErrorMethod();
  await testRegisterErrorWithExternalManager();
  await testRegisterErrorWithErrorUtils();
  await testRegisterErrorErrorHandling();
  await testNoRecursion();

  console.log('\n✅ Все тесты error-core-adapter завершены успешно\n');
}

if (require.main === module) {
  main().catch((error) => {
    logFail('Фатальная ошибка в тестах error-core-adapter', error);
    process.exit(1);
  });
}
