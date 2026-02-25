const { UniversalController } = require('../../core/unified-controller/src/UniversalController');
const { LoggingUtils } = require('@libs/logging-monitoring/logging');
const { ErrorHandlingUtils } = require('@libs/error-management/error-handler');
const { ConfigurationUtils } = require('@libs/core/configuration');

const mockLogger = new LoggingUtils();
const mockErrorHandler = new ErrorHandlingUtils({ logger: mockLogger });
const mockConfigManager = new ConfigurationUtils();

describe('UniversalController', () => {
  let controller;

  beforeEach(() => {
    controller = new UniversalController({
      logger: mockLogger,
      errorHandler: mockErrorHandler,
      configManager: mockConfigManager,
    });
    jest.clearAllMocks();
  });

  test('should initialize with provided dependencies', () => {
    expect(controller.logger).toBe(mockLogger);
    expect(controller.errorHandler).toBe(mockErrorHandler);
    expect(controller.configManager).toBe(mockConfigManager);
    expect(controller.isInitialized).toBe(false);
  });

  test('should initialize without provided dependencies using defaults', () => {
    const defaultController = new UniversalController();
    expect(defaultController.logger).toBeInstanceOf(LoggingUtils);
    expect(defaultController.errorHandler).toBeInstanceOf(ErrorHandlingUtils);
    expect(defaultController.configManager).toBeInstanceOf(ConfigurationUtils);
  });
});
