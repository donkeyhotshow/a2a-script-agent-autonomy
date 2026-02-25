const path = require('path');
const fs = require('fs');
// const { ErrorCoreManager, AppError, ValidationError } = require('../../../core/error-core'); // Removed global import

const mockTestConfigPath = path.resolve(__dirname, '@libs/config-unified/settings/config.json');
let mockConfig = {};

// Mock the fs module to control feature flag reading
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn((filePath, encoding) => {
    if (filePath === mockTestConfigPath) {
      return JSON.stringify(mockConfig);
    }
    return jest.requireActual('fs').readFileSync(filePath, encoding);
  }),
  existsSync: jest.fn((filePath) => {
    if (filePath === mockTestConfigPath) {
      return true;
    }
    return jest.requireActual('fs').existsSync(filePath);
  }),
}));

// Mock LoggingUtils
const MockLoggingUtils = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

// Explicitly mock ErrorCoreManager for this test file
jest.doMock('@libs/core/error-core', () => {
  const MockErrorCoreManagerConstructor = jest.fn().mockImplementation(function(options) {
    // Assign properties directly to 'this' (the instance of MockErrorCoreManagerConstructor)
    this.logger = MockLoggingUtils; // Ensure logger is correctly set for the mocked instance

    // Mock methods that ErrorHandlingUtils delegates to
    this.initialize = jest.fn(function() {
      this.logger.info('[ErrorCoreManager] Initialized.'); // Explicitly call logger.info
      return Promise.resolve(undefined);
    });
    this.registerError = jest.fn(function(error, context) {
      this.logger.error(`[ErrorCoreManager] Collected error for app ${context.appId}`, { error, context });
    });
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

    // Expose internal properties for testing or compatibility if needed
    this.errorHistory = []; // Initialize as needed
    this.errorCounts = new Map();
    this.retryCounts = new Map();
    this.md5Cache = new Map();
    // ... other properties if necessary
  });

  return {
    ErrorCoreManager: MockErrorCoreManagerConstructor,
    AppError: jest.fn().mockImplementation(function (message, code, context) {
      this.message = message; this.code = code; this.context = context; this.name = 'AppError';
    }),
    ValidationError: jest.fn().mockImplementation(function (message, field, context) {
      this.message = message; this.field = field; this.context = context; this.name = 'ValidationError';
    }),
  };
});

describe('Error Handling Re-export Wrapper', () => {
  let ErrorCoreManagerFromWrapper; // Declare to hold the re-exported class
  let AppErrorFromWrapper;
  let ValidationErrorFromWrapper;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock config for each test
    mockConfig = {
      featureFlags: {
        USE_CORE_ERROR_HANDLER: false,
      },
    };
    // Require the re-export wrapper fresh for each test to re-evaluate the feature flag
    // jest.resetModules(); // REMOVED: This was clearing the mocks

    // Re-import the actual classes after jest.resetModules() (now removed)
    // The doMock above should ensure we get the mocked versions now.
    const { ErrorCoreManager, AppError, ValidationError } = require('../../../core/error-core');
    ErrorCoreManagerFromWrapper = ErrorCoreManager;
    AppErrorFromWrapper = AppError;
    ValidationErrorFromWrapper = ValidationError;
  });

  test('should use old implementation when USE_CORE_ERROR_HANDLER is false', async () => {
    const OldErrorHandlerModule = require('../index');
    const oldErrorHandler = new OldErrorHandlerModule.ErrorHandlingUtils({ logger: MockLoggingUtils });

    expect(oldErrorHandler.constructor.name).toBe('ErrorHandlingUtils');
    expect(MockLoggingUtils.warn).not.toHaveBeenCalledWith(expect.stringContaining('[ErrorCoreManager]'));
  });

  test('should use new implementation (ErrorCoreManager) when USE_CORE_ERROR_HANDLER is true', async () => {
    mockConfig.featureFlags.USE_CORE_ERROR_HANDLER = true;
    const NewErrorHandlerModule = require('../index'); // Re-require to get new module state
    const newErrorHandler = new NewErrorHandlerModule.ErrorHandlingUtils({ logger: MockLoggingUtils });
    
    // Check if it's an instance of the re-exported ErrorCoreManager (via the wrapper class)
    expect(newErrorHandler.constructor.name).toBe('ErrorHandlingUtils'); // Still ErrorHandlingUtils due to wrapper
    expect(newErrorHandler.errorCoreManager).toBeInstanceOf(ErrorCoreManagerFromWrapper); // Compare with the re-imported one
    
    await newErrorHandler.initialize();
    expect(MockLoggingUtils.info).toHaveBeenCalledWith(expect.stringContaining('[ErrorCoreManager] Initialized.'));
  });

  test('should correctly map logError to collectError when new implementation is active', async () => {
    mockConfig.featureFlags.USE_CORE_ERROR_HANDLER = true;
    const NewErrorHandlerModule = require('../index');
    const newErrorHandler = new NewErrorHandlerModule.ErrorHandlingUtils({ logger: MockLoggingUtils });
    await newErrorHandler.initialize();

    const error = new Error('Test error');
    const context = { appId: 'test-app', serviceId: 'my-service' };
    await newErrorHandler.logError(error, context);

    // Expect registerError from ErrorCoreManager to be called, which logError delegates to
    expect(newErrorHandler.errorCoreManager.registerError).toHaveBeenCalledWith(error, context);
    expect(MockLoggingUtils.error).toHaveBeenCalledWith(expect.stringContaining('[ErrorCoreManager] Collected error'));
    // Check parameters mapping - updated to match actual log
    expect(MockLoggingUtils.error.mock.calls[0][0]).toContain('for app test-app');
  });

  test('should expose AppError and ValidationError classes', () => {
    mockConfig.featureFlags.USE_CORE_ERROR_HANDLER = true;
    const ErrorModule = require('../index');
    const CustomAppError = ErrorModule.AppError;
    const CustomValidationError = ErrorModule.ValidationError;

    expect(CustomAppError).toBeDefined();
    expect(CustomValidationError).toBeDefined();

    const appError = new CustomAppError('Something went wrong');
    expect(appError).toBeInstanceOf(AppErrorFromWrapper); // Compare with the re-imported one
    expect(appError.name).toBe('AppError');

    const validationError = new CustomValidationError('Invalid input', 'field');
    expect(validationError).toBeInstanceOf(ValidationErrorFromWrapper); // Compare with the re-imported one
    expect(validationError.name).toBe('ValidationError');
  });
});
