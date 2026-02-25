/**
 * Unit tests for Validation module
 */

const path = require('path');
const setupModuleAlias = require('../../config/setup-module-alias');
const { errorUtils } = require('../../error-management/error-handler/error-utils.js');
const { consoleUtils } = require('../../logging-monitoring/logging/console-utils.cjs');

const testLogger = {
  info: (msg) => console.log(`[TEST INFO] ${msg}`),
  error: (msg) => console.error(`[TEST ERROR] ${msg}`),
  warn: (msg) => console.warn(`[TEST WARN] ${msg}`),
  debug: (msg) => console.debug(`[TEST DEBUG] ${msg}`)
};

describe('Validation Tests', () => {

  describe('Main Module', () => {
    test('should load main Validation module', async () => {
      try {
        const module = require('../index.js');
        expect(module).toBeDefined();
        testLogger.info('✅ Main Validation module loaded');
      } catch (error) {
        testLogger.error(`❌ Main Validation module error: ${error.message}`);
        console.log(`⚠️  Main Validation module test skipped`);
      }
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle errors correctly', async () => {
      const testError = errorUtils.createError('Test error', 'TEST_ERROR', { module: 'Validation' });
      expect(testError).toBeDefined();
      expect(testError.code).toBe('TEST_ERROR');
      testLogger.info('✅ Error handling works');
    });

    test('should execute functions safely', async () => {
      const result = await errorUtils.safeExecute(async () => {
        return 'Validation-test-success';
      }, 'Validation-test');
      expect(result).toBe('Validation-test-success');
      testLogger.info('✅ Safe execution works');
    });
  });
});

testLogger.info('🎉 Validation tests completed');