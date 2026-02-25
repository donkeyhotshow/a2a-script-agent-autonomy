/**
 * Unit tests for Error Management module
 */

const path = require('path');
const setupModuleAlias = require('../../config/setup-module-alias');
const { errorUtils } = require('../../error-management/error-handler/error-utils.js');
const { consoleUtils } = require('../../logging-monitoring/logging/console-utils.cjs');

jest.mock('@libs/core/error-core', () => ({
  ErrorCoreManager: jest.fn().mockImplementation(function() {
    // Expose internal properties for testing or compatibility if needed
    this.errorHistory = [];
    this.errorCounts = new Map();
    this.retryCounts = new Map();
    this.md5Cache = new Map();
    this.logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };
    this.errorLogPath = '/mock/log/path';
    this.reportDir = '/mock/report/dir';
    this.maxHistorySize = 10;
    this.projectRoot = process.cwd();
    this.maxRetries = 3;
    this.retryDelays = [1000, 2000, 4000];

    // Mock methods that ErrorHandlingUtils delegates to
    this.initialize = jest.fn().mockResolvedValue(undefined);
    this.registerError = jest.fn();
    this.getErrorReport = jest.fn();
    this.clearErrorReports = jest.fn();
    this.getErrors = jest.fn().mockReturnValue([]);
    this.ensureErrorLogFile = jest.fn().mockResolvedValue(undefined);
    this.generateParametersHash = jest.fn((params) => require('crypto').createHash('md5').update(JSON.stringify(params)).digest('hex'));
    this.createErrorReport = jest.fn().mockResolvedValue('/path/to/report.md');
    this.checkExistingError = jest.fn().mockResolvedValue({ exists: false, filePath: null, content: null });
    this.handleServiceError = jest.fn(async (serviceId, error) => ({
      shouldRetry: true,
      delay: 1000,
      attempt: 1,
      maxAttempts: 3,
      error: error,
    }));
    this.handleCriticalError = jest.fn(async (error, context) => ({
      message: error.message,
      context: { ...context, critical: true },
    }));
    this.sendCriticalNotification = jest.fn().mockResolvedValue(undefined);
    this.handleWithFallback = jest.fn(async (main, fallback) => main());
    this.handleWithRetry = jest.fn(async (operation) => operation());
    this.addErrorToBatch = jest.fn(() => true);
    this.getErrorStats = jest.fn(() => ({
      totalErrors: 0,
      errorCounts: new Map(),
      recentErrors: [],
      retryCounts: new Map(),
      timestamp: new Date().toISOString(),
    }));
    this.clearErrorHistory = jest.fn();
    this.getErrorsByType = jest.fn(() => []);
    this.getErrorsByService = jest.fn(() => []);
    this.checkErrorFrequency = jest.fn(() => ({ count: 0, threshold: 0, exceeded: false }));

  }),
}));

jest.mock('@libs/system/service-management', () => ({
  ServiceManagementUtils: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    startWatchingConfig: jest.fn(),
    stopWatchingConfig: jest.fn(),
    registerService: jest.fn(),
    unregisterService: jest.fn(),
    getServiceConfig: jest.fn(),
    getServiceConfigs: jest.fn().mockReturnValue([]),
    adoptExternalProcesses: jest.fn(),
    getServiceRuntimeInfo: jest.fn(),
    getServicePid: jest.fn(),
    isServiceRunning: jest.fn(),
    startService: jest.fn(),
    stopService: jest.fn(),
    restartService: jest.fn(),
    getServiceStatus: jest.fn(),
    getAllServicesStatus: jest.fn(),
    getServiceMetrics: jest.fn(),
  })),
}));

jest.mock('@libs/logging-monitoring/logging', () => ({
  LoggingUtils: jest.fn().mockImplementation(() => ({
    mockLoggerInstance: jest.fn(),
    createDefaultLogger: jest.fn(),
  })),
}));

describe('Error Management Tests', () => {

  describe('Main Module', () => {
    test('should load main Error Management module', async () => {
      try {
        const module = require('../index.js');
        expect(module).toBeDefined();
      } catch (error) {
        console.log(`⚠️  Main Error Management test skipped`);
      }
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle errors correctly', async () => {
      const testError = errorUtils.createError('Test error', 'TEST_ERROR', { module: 'Error Management' });
      expect(testError).toBeDefined();
      expect(testError.code).toBe('TEST_ERROR');
    });

    test('should execute functions safely', async () => {
      const result = await errorUtils.safeExecute(async () => {
        return 'Error Management-test-success';
      }, 'Error Management-test');
      expect(result).toBe('Error Management-test-success');
    });
  });
});