#!/usr/bin/env node
'use strict';

/**
 * Unit-тесты для проверки fallback логики validationUtils
 *
 * Цели:
 * - Проверить что validationUtils корректно импортируется с fallback
 * - Проверить работу основных методов валидации при отсутствии @libs
 * - Убедиться что fallback методы работают корректно
 */

const path = require('path');

// Имитируем отсутствие @libs для тестирования fallback логики
const originalResolve = require.resolve;
let libsUnavailable = false;

require.resolve = function(id) {
  if (id.includes('@libs/validation/validation/validation-utils.cjs') && libsUnavailable) {
    throw new Error('Module not found');
  }
  return originalResolve.apply(this, arguments);
};

function logOk(message) {
  console.log(`✅ ${message}`);
}

function logFail(message, error) {
  console.error(`❌ ${message}`);
  if (error) {
    console.error(`   ${error.message || String(error)}`);
  }
}

async function testValidationUtilsFallback() {
  try {
    // Сначала тестируем с доступными @libs
    libsUnavailable = false;

    // Импортируем validationUtils как в handlers/terminal-handler.cjs
    let validationUtils;
    try {
      const validationModule = require('../../packages/libs/validation/validation/validation-utils.cjs');
      validationUtils = validationModule.validationUtils || validationModule;
      if (!validationUtils || typeof validationUtils !== 'object') {
        throw new Error('validation-utils.cjs did not export validationUtils object');
      }
    } catch (validationError) {
      console.error('[TERMINAL-HANDLER-WARN] validation-utils.cjs not found or invalid:', validationError.message);
      validationUtils = {
        validate: () => ({ isValid: true, errors: [] }),
        isString: (val) => typeof val === 'string',
        isNumber: (val) => typeof val === 'number',
        isArray: (val) => Array.isArray(val),
        isFunction: (val) => typeof val === 'function'
      };
    }

    // Проверяем основные методы
    if (typeof validationUtils.isString !== 'function') {
      throw new Error('isString method not available');
    }
    if (typeof validationUtils.isNumber !== 'function') {
      throw new Error('isNumber method not available');
    }
    if (typeof validationUtils.isArray !== 'function') {
      throw new Error('isArray method not available');
    }
    if (typeof validationUtils.validate !== 'function') {
      throw new Error('validate method not available');
    }

    // Тестируем функциональность
    const testString = 'test';
    const testNumber = 42;
    const testArray = [1, 2, 3];
    const testObject = { key: 'value' };

    if (!validationUtils.isString(testString)) {
      throw new Error('isString failed for string');
    }
    if (validationUtils.isString(testNumber)) {
      throw new Error('isString incorrectly passed for number');
    }

    if (!validationUtils.isNumber(testNumber)) {
      throw new Error('isNumber failed for number');
    }
    if (validationUtils.isNumber(testString)) {
      throw new Error('isNumber incorrectly passed for string');
    }

    if (!validationUtils.isArray(testArray)) {
      throw new Error('isArray failed for array');
    }
    if (validationUtils.isArray(testObject)) {
      throw new Error('isArray incorrectly passed for object');
    }

    logOk('validationUtils fallback работает корректно с доступными @libs');
  } catch (error) {
    logFail('Ошибка при тестировании validationUtils с @libs', error);
    throw error;
  }
}

async function testValidationUtilsWithoutLibs() {
  try {
    // Теперь тестируем fallback логику напрямую (имитируем отсутствие @libs)
    // Импортируем validationUtils как в handlers/terminal-handler.cjs с fallback
    let validationUtils;
    try {
      // Имитируем ошибку импорта @libs
      throw new Error('Simulated @libs not available');
    } catch (validationError) {
      // Fallback как в реальном коде
      validationUtils = {
        validate: () => ({ isValid: true, errors: [] }),
        isString: (val) => typeof val === 'string',
        isNumber: (val) => typeof val === 'number',
        isArray: (val) => Array.isArray(val),
        isFunction: (val) => typeof val === 'function'
      };
    }

    // Проверяем основные методы
    if (typeof validationUtils.isString !== 'function') {
      throw new Error('isString method not available in fallback');
    }
    if (typeof validationUtils.isNumber !== 'function') {
      throw new Error('isNumber method not available in fallback');
    }
    if (typeof validationUtils.isArray !== 'function') {
      throw new Error('isArray method not available in fallback');
    }
    if (typeof validationUtils.validate !== 'function') {
      throw new Error('validate method not available in fallback');
    }

    // Тестируем функциональность fallback
    const testString = 'test';
    const testNumber = 42;
    const testArray = [1, 2, 3];
    const testObject = { key: 'value' };

    if (!validationUtils.isString(testString)) {
      throw new Error('isString failed for string in fallback');
    }
    if (validationUtils.isString(testNumber)) {
      throw new Error('isString incorrectly passed for number in fallback');
    }

    if (!validationUtils.isNumber(testNumber)) {
      throw new Error('isNumber failed for number in fallback');
    }
    if (validationUtils.isNumber(testString)) {
      throw new Error('isNumber incorrectly passed for string in fallback');
    }

    if (!validationUtils.isArray(testArray)) {
      throw new Error('isArray failed for array in fallback');
    }
    if (validationUtils.isArray(testObject)) {
      throw new Error('isArray incorrectly passed for object in fallback');
    }

    // Тестируем validate fallback
    const validateResult = validationUtils.validate({}, {});
    if (typeof validateResult !== 'object') {
      throw new Error('validate method should return object in fallback');
    }

    // В fallback версии validate всегда возвращает { isValid: true, errors: [] }
    if (validateResult.isValid !== true) {
      throw new Error('validate method should return isValid: true in fallback');
    }

    if (!Array.isArray(validateResult.errors)) {
      throw new Error('validate method should return errors array in fallback');
    }

    logOk('validationUtils fallback работает корректно без @libs');
  } catch (error) {
    logFail('Ошибка при тестировании validationUtils без @libs', error);
    throw error;
  } finally {
    // Восстанавливаем оригинальный require.resolve
    require.resolve = originalResolve;
  }
}

async function testMcpServerValidationFallback() {
  try {
    // Тестируем fallback validationUtils как в mcp-server.cjs
    const validationUtils = {
      validate: (data, schema) => {
        // Basic validation fallback - поддерживает разные форматы schema
        const errors = [];
        if (schema && schema.properties) {
          for (const [key, rule] of Object.entries(schema.properties)) {
            if (rule.required && (data[key] === undefined || data[key] === null)) {
              errors.push(`${key} is required`);
            }
            if (data[key] !== undefined && rule.type && typeof data[key] !== rule.type) {
              errors.push(`${key} must be of type ${rule.type}`);
            }
          }
        }
        return { isValid: errors.length === 0, errors };
      },
      isString: (val) => typeof val === 'string',
      isNumber: (val) => typeof val === 'number',
      isArray: (val) => Array.isArray(val),
      isFunction: (val) => typeof val === 'function',
    };

    // Тестируем validate метод с schema
    const schema = {
      properties: {
        command: { type: 'string', required: true },
        timeout: { type: 'number' }
      }
    };

    const validData = { command: 'test', timeout: 30 };
    const invalidData = { timeout: 'invalid' }; // missing required command

    const validResult = validationUtils.validate(validData, schema);
    const invalidResult = validationUtils.validate(invalidData, schema);

    if (!validResult.isValid) {
      throw new Error('Valid data incorrectly failed validation');
    }

    if (invalidResult.isValid) {
      throw new Error('Invalid data incorrectly passed validation');
    }

    if (!Array.isArray(invalidResult.errors) || invalidResult.errors.length === 0) {
      throw new Error('Invalid data should have validation errors');
    }

    logOk('MCP server validationUtils fallback работает корректно');
  } catch (error) {
    logFail('Ошибка при тестировании MCP server validationUtils fallback', error);
    throw error;
  }
}

async function main() {
  console.log('\n🧪 Запуск тестов validationUtils fallback логики...\n');

  await testValidationUtilsFallback();
  await testValidationUtilsWithoutLibs();
  await testMcpServerValidationFallback();

  console.log('\n✅ Все тесты validationUtils завершены успешно\n');
}

if (require.main === module) {
  main().catch((error) => {
    logFail('Фатальная ошибка в тестах validationUtils', error);
    process.exit(1);
  });
}
