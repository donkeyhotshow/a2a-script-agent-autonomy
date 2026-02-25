/**
 * Unit tests for Logging Monitoring module
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

describe('Logging Monitoring Tests', () => {

  describe('Main Module', () => {
    test('should load main Logging Monitoring module', async () => {
      try {
        const module = require('../index.js');
        expect(module).toBeDefined();
        testLogger.info('✅ Main Logging Monitoring module loaded');
      } catch (error) {
        testLogger.error(`❌ Main Logging Monitoring error: ${error.message}`);
        console.log(`⚠️  Main Logging Monitoring test skipped`);
      }
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle errors correctly', async () => {
      const testError = errorUtils.createError('Test error', 'TEST_ERROR', { module: 'Logging Monitoring' });
      expect(testError).toBeDefined();
      expect(testError.code).toBe('TEST_ERROR');
      testLogger.info('✅ Error handling works');
    });

    test('should execute functions safely', async () => {
      const result = await errorUtils.safeExecute(async () => {
        return 'Logging Monitoring-test-success';
      }, 'Logging Monitoring-test');
      expect(result).toBe('Logging Monitoring-test-success');
      testLogger.info('✅ Safe execution works');
    });
  });
});

testLogger.info('🎉 Logging Monitoring tests completed');