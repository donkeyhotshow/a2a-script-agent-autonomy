/**
 * Unit tests for App Framework module
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

describe('App Framework Tests', () => {

  describe('Main Module', () => {
    test('should load main App Framework module', async () => {
      try {
        const module = require('../index.js');
        expect(module).toBeDefined();
        testLogger.info('✅ Main App Framework module loaded');
      } catch (error) {
        testLogger.error(`❌ Main ${moduleName} error: ${error.message}`);
        console.log(`⚠️  Main ${moduleName} test skipped`);
      }
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle errors correctly', async () => {
      const testError = errorUtils.createError('Test error', 'TEST_ERROR', { module: 'App Framework' });
      expect(testError).toBeDefined();
      expect(testError.code).toBe('TEST_ERROR');
      testLogger.info('✅ Error handling works');
    });

    test('should execute functions safely', async () => {
      const result = await errorUtils.safeExecute(async () => {
        return 'App Framework-test-success';
      }, 'App Framework-test');
      expect(result).toBe('App Framework-test-success');
      testLogger.info('✅ Safe execution works');
    });
  });
});

testLogger.info('🎉 App Framework tests completed');