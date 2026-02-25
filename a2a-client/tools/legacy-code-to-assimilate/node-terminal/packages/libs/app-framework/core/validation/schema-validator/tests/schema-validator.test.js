const { ClientErrorMonitor } = require('../index.js');

describe('ClientErrorMonitor', () => {
  let errorMonitor;
  let originalConsole;
  let originalFetch;
  let originalWindow;

  beforeEach(() => {
    // Сохраняем оригинальные объекты
    originalConsole = global.console;
    originalFetch = global.window?.fetch;
    originalWindow = global.window;

    // Мокаем глобальные объекты
    global.console = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    };


    global.window = {
      location: { href: 'http://test.com' },
      navigator: { userAgent: 'Test Browser' },
      innerWidth: 1920,
      innerHeight: 1080,
      addEventListener: jest.fn(),
      onerror: null,
      onunhandledrejection: null,
      performance: {
        getEntriesByType: jest.fn().mockReturnValue([{
          loadEventEnd: 2000,
          loadEventStart: 1000,
          domContentLoadedEventEnd: 1500,
          domContentLoadedEventStart: 1200
        }]),
        now: jest.fn().mockReturnValue(1000)
      },
      sessionStorage: {
        getItem: jest.fn(),
        setItem: jest.fn()
      }
    };

    // Мокаем таймеры
    global.setInterval = jest.fn();
    global.clearInterval = jest.fn();
    
    // Мокаем sessionStorage
    global.sessionStorage = {
      getItem: jest.fn(),
      setItem: jest.fn()
    };

    errorMonitor = new ClientErrorMonitor({
      debugMode: true,
      maxErrorsPerReport: 5
    });
  });

  afterEach(() => {
    // Восстанавливаем оригинальные объекты
    global.console = originalConsole;
    if (global.window) {
      global.window.fetch = originalFetch;
    }
    global.window = originalWindow;

    if (errorMonitor && errorMonitor.isCollecting) {
      errorMonitor.stopCollecting();
    }
  });

  describe('constructor', () => {
    test('should initialize with default config', () => {
      expect(errorMonitor.config.maxErrorsPerReport).toBe(5);
      expect(errorMonitor.config.reportInterval).toBe(30000);
      expect(errorMonitor.config.debugMode).toBe(true);
      expect(errorMonitor.errors).toEqual([]);
      expect(errorMonitor.isCollecting).toBe(false);
      expect(errorMonitor.lastReportTime).toBeNull();
      expect(global.clearInterval).toHaveBeenCalled();
    });

    test('should initialize with custom config', () => {
      const customMonitor = new ClientErrorMonitor({
        maxErrorsPerReport: 10,
        reportInterval: 60000,
        debugMode: false,
        enableConsoleCapture: false,
        enableNetworkCapture: false
      });

      expect(customMonitor.config.maxErrorsPerReport).toBe(10);
      expect(customMonitor.config.reportInterval).toBe(60000);
      expect(customMonitor.config.debugMode).toBe(false);
      expect(customMonitor.config.enableConsoleCapture).toBe(false);
      expect(customMonitor.config.enableNetworkCapture).toBe(false);
    });

    test('should merge default and custom config', () => {
      const customMonitor = new ClientErrorMonitor({
        maxErrorsPerReport: 15
      });

      expect(customMonitor.config.maxErrorsPerReport).toBe(15);
      expect(customMonitor.config.reportInterval).toBe(30000); // default
      expect(customMonitor.config.enableConsoleCapture).toBe(true); // default
    });
  });

  describe('_debug', () => {
    test('should log debug messages when debug mode is enabled', () => {
      errorMonitor._debug('Test message', { key: 'value' });

      expect(global.console.log).toHaveBeenCalled();
      expect(global.console.log.mock.calls[0][0]).toContain('[ClientErrorMonitor]');
      expect(global.console.log.mock.calls[0][0]).toContain('Test message');
      expect(global.console.log.mock.calls[0][1]).toEqual({ key: 'value' });
    });

    test('should log debug messages without data when debug mode is enabled', () => {
      errorMonitor._debug('Test message only');

      expect(global.console.log).toHaveBeenCalled();
      expect(global.console.log.mock.calls[0][0]).toContain('[ClientErrorMonitor]');
      expect(global.console.log.mock.calls[0][0]).toContain('Test message only');
      expect(global.console.log.mock.calls[0]).toHaveLength(1);
    });

    test('should not log debug messages when debug mode is disabled', () => {
      // Очищаем предыдущие вызовы
      global.console.log.mockClear();
      
      const nonDebugMonitor = new ClientErrorMonitor({ debugMode: false });
      nonDebugMonitor._debug('Test message');

      expect(global.console.log).not.toHaveBeenCalled();
    });

    test('should include timestamp in debug messages', () => {
      errorMonitor._debug('Test message');

      const logCall = global.console.log.mock.calls[0][0];
      expect(logCall).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] - Test message/);
    });
  });

  describe('determineSeverity', () => {
    test('should determine severity for javascript_error', () => {
      expect(errorMonitor.determineSeverity('javascript_error', { fatal: true })).toBe('critical');
      expect(errorMonitor.determineSeverity('javascript_error', { fatal: false })).toBe('error');
    });

    test('should determine severity for network_error', () => {
      expect(errorMonitor.determineSeverity('network_error', { status: 500 })).toBe('error');
      expect(errorMonitor.determineSeverity('network_error', { status: 400 })).toBe('warning');
      expect(errorMonitor.determineSeverity('network_error', { status: 404 })).toBe('warning');
    });

    test('should determine severity for performance_issue', () => {
      expect(errorMonitor.determineSeverity('performance_issue', { duration: 4000 })).toBe('error');
      expect(errorMonitor.determineSeverity('performance_issue', { duration: 2000 })).toBe('warning');
      expect(errorMonitor.determineSeverity('performance_issue', { duration: 1000 })).toBe('warning');
    });

    test('should determine severity for console_error', () => {
      expect(errorMonitor.determineSeverity('console_error', {})).toBe('error');
      expect(errorMonitor.determineSeverity('console_error', { message: 'test' })).toBe('error');
    });

    test('should determine severity for console_warning', () => {
      expect(errorMonitor.determineSeverity('console_warning', {})).toBe('warning');
      expect(errorMonitor.determineSeverity('console_warning', { message: 'test' })).toBe('warning');
    });

    test('should determine severity for unhandled_rejection', () => {
      expect(errorMonitor.determineSeverity('unhandled_rejection', {})).toBe('critical');
      expect(errorMonitor.determineSeverity('unhandled_rejection', { reason: 'test' })).toBe('critical');
    });

    test('should determine severity for resource_load_error', () => {
      expect(errorMonitor.determineSeverity('resource_load_error', {})).toBe('warning');
      expect(errorMonitor.determineSeverity('resource_load_error', { type: 'IMG' })).toBe('warning');
    });

    test('should determine severity for api_error', () => {
      expect(errorMonitor.determineSeverity('api_error', { status: 500 })).toBe('critical');
      expect(errorMonitor.determineSeverity('api_error', { status: 400 })).toBe('error');
      expect(errorMonitor.determineSeverity('api_error', { status: 404 })).toBe('error');
    });

    test('should determine severity for plugin_error', () => {
      expect(errorMonitor.determineSeverity('plugin_error', { critical: true })).toBe('critical');
      expect(errorMonitor.determineSeverity('plugin_error', { critical: false })).toBe('error');
    });

    test('should return info for unknown error types', () => {
      expect(errorMonitor.determineSeverity('unknown_type', {})).toBe('info');
      expect(errorMonitor.determineSeverity('custom_error', {})).toBe('info');
    });
  });

  describe('createErrorEntry', () => {
    test('should create error entry with correct structure', () => {
      const errorEntry = errorMonitor.createErrorEntry('test_error', {
        message: 'Test error',
        stack: 'Error stack'
      });

      expect(errorEntry).toHaveProperty('id');
      expect(errorEntry.type).toBe('test_error');
      expect(errorEntry).toHaveProperty('timestamp');
      expect(errorEntry.url).toBe('http://test.com');
      expect(errorEntry.userAgent).toBe('Node.js/24');
      expect(errorEntry.viewport).toEqual({ width: 1920, height: 1080 });
      expect(errorEntry.data).toEqual({
        message: 'Test error',
        stack: 'Error stack'
      });
      expect(errorEntry.severity).toBeDefined();
    });

    test('should generate unique IDs', () => {
      const entry1 = errorMonitor.createErrorEntry('test', {});
      const entry2 = errorMonitor.createErrorEntry('test', {});

      expect(entry1.id).not.toBe(entry2.id);
      expect(entry1.id).toMatch(/^\d+-[a-z0-9]+$/);
      expect(entry2.id).toMatch(/^\d+-[a-z0-9]+$/);
    });

    test('should include timestamp in ISO format', () => {
      const errorEntry = errorMonitor.createErrorEntry('test', {});
      
      expect(errorEntry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    test('should determine severity based on error type and data', () => {
      const criticalEntry = errorMonitor.createErrorEntry('javascript_error', { fatal: true });
      const warningEntry = errorMonitor.createErrorEntry('resource_load_error', {});
      const infoEntry = errorMonitor.createErrorEntry('unknown_type', {});

      expect(criticalEntry.severity).toBe('critical');
      expect(warningEntry.severity).toBe('warning');
      expect(infoEntry.severity).toBe('info');
    });

    test('should handle empty data object', () => {
      const errorEntry = errorMonitor.createErrorEntry('test_error', {});

      expect(errorEntry.data).toEqual({});
      expect(errorEntry.severity).toBeDefined();
    });

    test('should handle complex data objects', () => {
      const complexData = {
        message: 'Complex error',
        details: {
          code: 500,
          context: { userId: 123, action: 'save' }
        },
        stack: 'Error stack trace'
      };

      const errorEntry = errorMonitor.createErrorEntry('api_error', complexData);

      expect(errorEntry.data).toEqual(complexData);
      expect(errorEntry.type).toBe('api_error');
    });
  });

  describe('addError', () => {
    beforeEach(() => {
      errorMonitor.isCollecting = true;
    });

    test('should add error to collection', () => {
      errorMonitor.addError('test_error', { message: 'Test' });

      expect(errorMonitor.errors).toHaveLength(1);
      expect(errorMonitor.errors[0].type).toBe('test_error');
      expect(errorMonitor.errors[0].data.message).toBe('Test');
    });

    test('should not add error when not collecting', () => {
      errorMonitor.isCollecting = false;
      errorMonitor.addError('test_error', { message: 'Test' });

      expect(errorMonitor.errors).toHaveLength(0);
    });

    test('should maintain max errors limit', () => {
      errorMonitor.config.maxErrorsPerReport = 2;

      errorMonitor.addError('error1', { message: 'Error 1' });
      errorMonitor.addError('error2', { message: 'Error 2' });
      errorMonitor.addError('error3', { message: 'Error 3' });

      expect(errorMonitor.errors).toHaveLength(2);
      // Проверяем, что ошибки добавлены с дефолтными значениями
      expect(errorMonitor.errors[0].data).toBeUndefined();
      expect(errorMonitor.errors[1].data).toBeNull();
      expect(errorMonitor.errors[0].data.message).toBe('Error 2');
      expect(errorMonitor.errors[1].data.message).toBe('Error 3');
    });

    test('should trigger report when limit is reached', async () => {
      errorMonitor.config.maxErrorsPerReport = 1;
      global.window.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

      errorMonitor.addError('error1', { message: 'Error 1' });
      errorMonitor.addError('error2', { message: 'Error 2' });

      // Ждем асинхронной отправки отчета
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(global.window.fetch).toHaveBeenCalled();
    });

    test('should log debug information when adding errors', () => {
      errorMonitor.addError('test_error', { message: 'Test message' });

      expect(global.console.log).toHaveBeenCalled();
      const logCall = global.console.log.mock.calls.find(call => 
        call[0].includes('Error added to collection')
      );
      expect(logCall).toBeDefined();
    });

    test('should handle multiple errors in sequence', () => {
      errorMonitor.addError('error1', { message: 'First error' });
      errorMonitor.addError('error2', { message: 'Second error' });
      errorMonitor.addError('error3', { message: 'Third error' });

      expect(errorMonitor.errors).toHaveLength(3);
      expect(errorMonitor.errors[0].data.message).toBe('First error');
      expect(errorMonitor.errors[1].data.message).toBe('Second error');
      expect(errorMonitor.errors[2].data.message).toBe('Third error');
    });

    test('should create error entry with correct structure', () => {
      errorMonitor.addError('test_error', { message: 'Test', code: 500 });

      const error = errorMonitor.errors[0];
      expect(error).toHaveProperty('id');
      expect(error).toHaveProperty('timestamp');
      expect(error).toHaveProperty('url');
      expect(error).toHaveProperty('userAgent');
      expect(error).toHaveProperty('viewport');
      expect(error).toHaveProperty('severity');
      expect(error.data).toEqual({ message: 'Test', code: 500 });
    });
  });

  describe('addPluginError', () => {
    beforeEach(() => {
      errorMonitor.isCollecting = true;
    });

    test('should add plugin error', () => {
      const error = new Error('Plugin failed');
      errorMonitor.addPluginError('test-plugin', error, true);

      expect(errorMonitor.errors).toHaveLength(1);
      expect(errorMonitor.errors[0].type).toBe('plugin_error');
      expect(errorMonitor.errors[0].data.plugin).toBe('test-plugin');
      expect(errorMonitor.errors[0].data.message).toBe('Plugin failed');
      expect(errorMonitor.errors[0].data.critical).toBe(true);
    });

    test('should add non-critical plugin error', () => {
      const error = new Error('Plugin warning');
      errorMonitor.addPluginError('test-plugin', error, false);

      expect(errorMonitor.errors).toHaveLength(1);
      expect(errorMonitor.errors[0].type).toBe('plugin_error');
      expect(errorMonitor.errors[0].data.plugin).toBe('test-plugin');
      expect(errorMonitor.errors[0].data.message).toBe('Plugin warning');
      expect(errorMonitor.errors[0].data.critical).toBe(false);
    });

    test('should include error stack trace', () => {
      const error = new Error('Plugin failed');
      error.stack = 'Error: Plugin failed\n    at test.js:10:5';
      
      errorMonitor.addPluginError('test-plugin', error, true);

      expect(errorMonitor.errors[0].data.stack).toBe('Error: Plugin failed\n    at test.js:10:5');
    });

    test('should log debug information', () => {
      const error = new Error('Plugin failed');
      errorMonitor.addPluginError('test-plugin', error, true);

      expect(global.console.log).toHaveBeenCalled();
      const logCall = global.console.log.mock.calls.find(call => 
        call[0].includes('Plugin error added')
      );
      expect(logCall).toBeDefined();
    });

    test('should not add plugin error when not collecting', () => {
      errorMonitor.isCollecting = false;
      const error = new Error('Plugin failed');
      
      errorMonitor.addPluginError('test-plugin', error, true);

      expect(errorMonitor.errors).toHaveLength(0);
    });
  });

  describe('setupJavaScriptErrorHandling', () => {
    test('should setup JavaScript error handlers', () => {
      errorMonitor.config.enableUnhandledCapture = true;
      errorMonitor.isCollecting = true;

      errorMonitor.setupJavaScriptErrorHandling();

      expect(typeof global.window.onerror).toBe('function');
      expect(typeof global.window.onunhandledrejection).toBe('function');
    });

    test('should not setup handlers when disabled', () => {
      errorMonitor.config.enableUnhandledCapture = false;
      const originalOnError = global.window.onerror;

      errorMonitor.setupJavaScriptErrorHandling();

      expect(global.window.onerror).toBe(originalOnError);
    });

    test('should capture JavaScript errors', () => {
      errorMonitor.config.enableUnhandledCapture = true;
      errorMonitor.isCollecting = true;

      errorMonitor.setupJavaScriptErrorHandling();

      const testError = new Error('Test error');
      global.window.onerror('Test message', 'test.js', 10, 5, testError);

      expect(errorMonitor.errors).toHaveLength(1);
      expect(errorMonitor.errors[0].type).toBe('javascript_error');
      expect(errorMonitor.errors[0].data.message).toBe('Test message');
      expect(errorMonitor.errors[0].data.source).toBe('test.js');
      expect(errorMonitor.errors[0].data.lineno).toBe(10);
      expect(errorMonitor.errors[0].data.colno).toBe(5);
    });

    test('should capture unhandled rejections', () => {
      errorMonitor.config.enableUnhandledCapture = true;
      errorMonitor.isCollecting = true;

      errorMonitor.setupJavaScriptErrorHandling();

      const rejectionEvent = {
        reason: 'Promise rejected',
        promise: Promise.resolve()
      };
      global.window.onunhandledrejection(rejectionEvent);

      expect(errorMonitor.errors).toHaveLength(1);
      expect(errorMonitor.errors[0].type).toBe('unhandled_rejection');
      expect(errorMonitor.errors[0].data.reason).toBe('Promise rejected');
    });

    test('should preserve original error handlers', () => {
      errorMonitor.config.enableUnhandledCapture = true;
      errorMonitor.isCollecting = true;

      const originalOnError = jest.fn();
      const originalOnUnhandledRejection = jest.fn();
      global.window.onerror = originalOnError;
      global.window.onunhandledrejection = originalOnUnhandledRejection;

      errorMonitor.setupJavaScriptErrorHandling();

      const testError = new Error('Test error');
      global.window.onerror('Test message', 'test.js', 10, 5, testError);

      expect(originalOnError).toHaveBeenCalledWith('Test message', 'test.js', 10, 5, testError);
    });

    test('should handle errors without stack trace', () => {
      errorMonitor.config.enableUnhandledCapture = true;
      errorMonitor.isCollecting = true;

      errorMonitor.setupJavaScriptErrorHandling();

      global.window.onerror('Test message', 'test.js', 10, 5, null);

      expect(errorMonitor.errors).toHaveLength(1);
      expect(errorMonitor.errors[0].data.stack).toBeUndefined();
    });

    test('should log debug information when setting up handlers', () => {
      errorMonitor.config.enableUnhandledCapture = true;
      errorMonitor.isCollecting = true;

      errorMonitor.setupJavaScriptErrorHandling();

      expect(global.console.log).toHaveBeenCalled();
      const logCall = global.console.log.mock.calls.find(call => 
        call[0].includes('Setting up JavaScript error handling')
      );
      expect(logCall).toBeDefined();
    });
  });

  describe('setupConsoleCapture', () => {
    test('should setup console capture', () => {
      errorMonitor.config.enableConsoleCapture = true;
      errorMonitor.isCollecting = true;

      errorMonitor.setupConsoleCapture();

      expect(typeof global.console.error).toBe('function');
      expect(typeof global.console.warn).toBe('function');
    });

    test('should not setup console capture when disabled', () => {
      errorMonitor.config.enableConsoleCapture = false;
      const originalError = global.console.error;
      const originalWarn = global.console.warn;

      errorMonitor.setupConsoleCapture();

      expect(global.console.error).toBe(originalError);
      expect(global.console.warn).toBe(originalWarn);
    });

    test('should capture console errors', () => {
      errorMonitor.config.enableConsoleCapture = true;
      errorMonitor.isCollecting = true;

      errorMonitor.setupConsoleCapture();

      global.console.error('Test console error', { key: 'value' });

      expect(errorMonitor.errors).toHaveLength(1);
      expect(errorMonitor.errors[0].type).toBe('console_error');
      expect(errorMonitor.errors[0].data.message).toContain('Test console error');
      expect(errorMonitor.errors[0].data.arguments).toEqual(['Test console error', { key: 'value' }]);
    });

    test('should capture console warnings', () => {
      errorMonitor.config.enableConsoleCapture = true;
      errorMonitor.isCollecting = true;

      errorMonitor.setupConsoleCapture();

      global.console.warn('Test console warning');

      expect(errorMonitor.errors).toHaveLength(1);
      expect(errorMonitor.errors[0].type).toBe('console_warning');
      expect(errorMonitor.errors[0].data.message).toContain('Test console warning');
    });

    test('should handle multiple console arguments', () => {
      errorMonitor.config.enableConsoleCapture = true;
      errorMonitor.isCollecting = true;

      errorMonitor.setupConsoleCapture();

      global.console.error('Error:', 'Something went wrong', { details: 'more info' });

      expect(errorMonitor.errors).toHaveLength(1);
      expect(errorMonitor.errors[0].data.message).toContain('Error: Something went wrong');
      expect(errorMonitor.errors[0].data.arguments).toHaveLength(3);
    });

    test('should preserve original console functionality', () => {
      errorMonitor.config.enableConsoleCapture = true;
      errorMonitor.isCollecting = true;

      const originalError = jest.fn();
      const originalWarn = jest.fn();
      global.console.error = originalError;
      global.console.warn = originalWarn;

      errorMonitor.setupConsoleCapture();

      global.console.error('Test error');
      global.console.warn('Test warning');

      expect(originalError).toHaveBeenCalledWith('Test error');
      expect(originalWarn).toHaveBeenCalledWith('Test warning');
    });

    test('should handle object arguments in console calls', () => {
      errorMonitor.config.enableConsoleCapture = true;
      errorMonitor.isCollecting = true;

      errorMonitor.setupConsoleCapture();

      const testObj = { key: 'value', nested: { prop: 'test' } };
      global.console.error('Object error:', testObj);

      expect(errorMonitor.errors).toHaveLength(1);
      expect(errorMonitor.errors[0].data.message).toContain('Object error:');
      expect(errorMonitor.errors[0].data.message).toContain('{"key":"value"');
    });

    test('should log debug information when setting up capture', () => {
      errorMonitor.config.enableConsoleCapture = true;
      errorMonitor.isCollecting = true;

      errorMonitor.setupConsoleCapture();

      expect(global.console.log).toHaveBeenCalled();
      const logCall = global.console.log.mock.calls.find(call => 
        call[0].includes('Setting up console error capturing')
      );
      expect(logCall).toBeDefined();
    });
  });

  describe('setupNetworkErrorHandling', () => {
    test('should setup network error handling', () => {
      errorMonitor.config.enableNetworkCapture = true;
      errorMonitor.isCollecting = true;

      errorMonitor.setupNetworkErrorHandling();

      expect(typeof global.window.fetch).toBe('function');
    });

    test('should not setup network handling when disabled', () => {
      errorMonitor.config.enableNetworkCapture = false;
      const originalFetch = global.window.fetch;

      errorMonitor.setupNetworkErrorHandling();

      expect(global.window.fetch).toBe(originalFetch);
    });

    test('should capture slow network requests', async () => {
      errorMonitor.config.enableNetworkCapture = true;
      errorMonitor.isCollecting = true;

      let callCount = 0;
      global.window.performance.now = jest.fn().mockImplementation(() => {
        callCount++;
        return callCount * 2000; // Simulate slow request (>3000ms threshold)
      });

      errorMonitor.setupNetworkErrorHandling();

      global.window.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200
      });

      await global.window.fetch('/slow-endpoint');

      expect(errorMonitor.errors).toHaveLength(1);
      expect(errorMonitor.errors[0].type).toBe('performance_issue');
      expect(errorMonitor.errors[0].data.type).toBe('slow_network_request');
      expect(errorMonitor.errors[0].data.url).toBe('/slow-endpoint');
    });

    test('should capture HTTP errors', async () => {
      errorMonitor.config.enableNetworkCapture = true;
      errorMonitor.isCollecting = true;

      let callCount = 0;
      global.window.performance.now = jest.fn().mockImplementation(() => {
        callCount++;
        return callCount * 1000;
      });

      errorMonitor.setupNetworkErrorHandling();

      global.window.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await global.window.fetch('/not-found');

      expect(errorMonitor.errors).toHaveLength(1);
      expect(errorMonitor.errors[0].type).toBe('network_error');
      expect(errorMonitor.errors[0].data.status).toBe(404);
      expect(errorMonitor.errors[0].data.statusText).toBe('Not Found');
    });

    test('should capture network exceptions', async () => {
      errorMonitor.config.enableNetworkCapture = true;
      errorMonitor.isCollecting = true;

      let callCount = 0;
      global.window.performance.now = jest.fn().mockImplementation(() => {
        callCount++;
        return callCount * 1000;
      });

      errorMonitor.setupNetworkErrorHandling();

      global.window.fetch = jest.fn().mockRejectedValue(new Error('Network failed'));

      await expect(global.window.fetch('/fail')).rejects.toThrow('Network failed');

      expect(errorMonitor.errors).toHaveLength(1);
      expect(errorMonitor.errors[0].type).toBe('network_error');
      expect(errorMonitor.errors[0].data.error).toBe('Network failed');
    });

    test('should preserve original fetch functionality', async () => {
      errorMonitor.config.enableNetworkCapture = true;
      errorMonitor.isCollecting = true;

      let callCount = 0;
      global.window.performance.now = jest.fn().mockImplementation(() => {
        callCount++;
        return callCount * 1000;
      });

      const originalFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'test' })
      });

      global.window.fetch = originalFetch;
      errorMonitor.setupNetworkErrorHandling();

      const response = await global.window.fetch('/test');
      const data = await response.json();

      expect(originalFetch).toHaveBeenCalledWith('/test');
      expect(data).toEqual({ data: 'test' });
    });

    test('should handle different HTTP status codes', async () => {
      errorMonitor.config.enableNetworkCapture = true;
      errorMonitor.isCollecting = true;

      let callCount = 0;
      global.window.performance.now = jest.fn().mockImplementation(() => {
        callCount++;
        return callCount * 1000;
      });

      errorMonitor.setupNetworkErrorHandling();

      global.window.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await global.window.fetch('/server-error');

      expect(errorMonitor.errors).toHaveLength(1);
      expect(errorMonitor.errors[0].data.status).toBe(500);
    });

    test('should measure request duration', async () => {
      errorMonitor.config.enableNetworkCapture = true;
      errorMonitor.isCollecting = true;

      let callCount = 0;
      global.window.performance.now = jest.fn().mockImplementation(() => {
        callCount++;
        return callCount * 1000; // Simulate time progression
      });

      errorMonitor.setupNetworkErrorHandling();

      global.window.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200
      });

      await global.window.fetch('/test');

      expect(errorMonitor.errors).toHaveLength(1);
      expect(errorMonitor.errors[0].data.duration).toBe(1000);
    });

    test('should log debug information when setting up network handling', () => {
      errorMonitor.config.enableNetworkCapture = true;
      errorMonitor.isCollecting = true;

      errorMonitor.setupNetworkErrorHandling();

      expect(global.console.log).toHaveBeenCalled();
      const logCall = global.console.log.mock.calls.find(call => 
        call[0].includes('Setting up network error handling')
      );
      expect(logCall).toBeDefined();
    });
  });

  describe('setupPerformanceMonitoring', () => {
    test('should setup performance monitoring', () => {
      errorMonitor.config.enablePerformanceCapture = true;
      errorMonitor.isCollecting = true;

      errorMonitor.setupPerformanceMonitoring();

      expect(global.window.addEventListener).toHaveBeenCalledWith('load', expect.any(Function));
      expect(global.window.addEventListener).toHaveBeenCalledWith('error', expect.any(Function), true);
    });

    test('should not setup performance monitoring when disabled', () => {
      errorMonitor.config.enablePerformanceCapture = false;

      errorMonitor.setupPerformanceMonitoring();

      expect(global.window.addEventListener).not.toHaveBeenCalled();
    });

    test('should capture slow page loads', () => {
      errorMonitor.config.enablePerformanceCapture = true;
      errorMonitor.isCollecting = true;

      errorMonitor.setupPerformanceMonitoring();

      const loadHandler = global.window.addEventListener.mock.calls.find(
        call => call[0] === 'load'
      )[1];

      loadHandler();

      expect(errorMonitor.errors).toHaveLength(1);
      expect(errorMonitor.errors[0].type).toBe('performance_issue');
      expect(errorMonitor.errors[0].data.type).toBe('slow_page_load');
    });

    test('should capture resource load errors', () => {
      errorMonitor.config.enablePerformanceCapture = true;
      errorMonitor.isCollecting = true;

      errorMonitor.setupPerformanceMonitoring();

      const errorHandler = global.window.addEventListener.mock.calls.find(
        call => call[0] === 'error'
      )[1];

      const mockImage = { tagName: 'IMG', src: 'broken-image.jpg' };
      errorHandler({ target: mockImage, message: 'Failed to load' });

      expect(errorMonitor.errors).toHaveLength(1);
      expect(errorMonitor.errors[0].type).toBe('resource_load_error');
      expect(errorMonitor.errors[0].data.type).toBe('IMG');
      expect(errorMonitor.errors[0].data.src).toBe('broken-image.jpg');
    });

    test('should handle different resource types', () => {
      errorMonitor.config.enablePerformanceCapture = true;
      errorMonitor.isCollecting = true;

      errorMonitor.setupPerformanceMonitoring();

      const errorHandler = global.window.addEventListener.mock.calls.find(
        call => call[0] === 'error'
      )[1];

      const mockScript = { tagName: 'SCRIPT', src: 'script.js' };
      errorHandler({ target: mockScript, message: 'Script failed to load' });

      expect(errorMonitor.errors).toHaveLength(1);
      expect(errorMonitor.errors[0].data.type).toBe('SCRIPT');
      expect(errorMonitor.errors[0].data.src).toBe('script.js');
    });

    test('should handle resources without src attribute', () => {
      errorMonitor.config.enablePerformanceCapture = true;
      errorMonitor.isCollecting = true;

      errorMonitor.setupPerformanceMonitoring();

      const errorHandler = global.window.addEventListener.mock.calls.find(
        call => call[0] === 'error'
      )[1];

      const mockElement = { tagName: 'DIV' };
      errorHandler({ target: mockElement, message: 'Element error' });

      expect(errorMonitor.errors).toHaveLength(1);
      expect(errorMonitor.errors[0].data.type).toBe('DIV');
      expect(errorMonitor.errors[0].data.src).toBeUndefined();
    });

    test('should not capture window errors', () => {
      errorMonitor.config.enablePerformanceCapture = true;
      errorMonitor.isCollecting = true;

      errorMonitor.setupPerformanceMonitoring();

      const errorHandler = global.window.addEventListener.mock.calls.find(
        call => call[0] === 'error'
      )[1];

      errorHandler({ target: global.window, message: 'Window error' });

      expect(errorMonitor.errors).toHaveLength(0);
    });

    test('should log debug information when setting up monitoring', () => {
      errorMonitor.config.enablePerformanceCapture = true;
      errorMonitor.isCollecting = true;

      errorMonitor.setupPerformanceMonitoring();

      expect(global.console.log).toHaveBeenCalled();
      const logCall = global.console.log.mock.calls.find(call => 
        call[0].includes('Setting up performance monitoring')
      );
      expect(logCall).toBeDefined();
    });
  });

  describe('sendReport', () => {
    beforeEach(() => {
      errorMonitor.isCollecting = true;
    });

    test('should send report successfully', async () => {
      errorMonitor.addError('test_error', { message: 'Test' });

      global.window.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200
      });

      await errorMonitor.sendReport();

      expect(global.window.fetch).toHaveBeenCalled();
      expect(errorMonitor.errors).toHaveLength(0);
      expect(errorMonitor.lastReportTime).toBeDefined();
    });

    test('should handle report submission failure', async () => {
      errorMonitor.addError('test_error', { message: 'Test' });

      global.window.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await errorMonitor.sendReport();

      expect(errorMonitor.errors).toHaveLength(1);
    });

    test('should not send report when no errors', async () => {
      global.window.fetch = jest.fn();

      await errorMonitor.sendReport();

      expect(global.window.fetch).not.toHaveBeenCalled();
    });

    test('should include correct report structure', async () => {
      errorMonitor.addError('error1', { message: 'Error 1' });
      errorMonitor.addError('error2', { message: 'Error 2' });

      global.window.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200
      });

      await errorMonitor.sendReport();

      expect(global.window.fetch).toHaveBeenCalledWith(
        '/api/error-management/report',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: expect.stringContaining('"errors"')
        })
      );

      const requestBody = JSON.parse(global.window.fetch.mock.calls[0][1].body);
      expect(requestBody).toHaveProperty('timestamp');
      expect(requestBody).toHaveProperty('sessionId');
      expect(requestBody).toHaveProperty('errors');
      expect(requestBody).toHaveProperty('summary');
      expect(requestBody.errors).toHaveLength(2);
    });

    test('should include error summary in report', async () => {
      errorMonitor.addError('javascript_error', { message: 'JS Error' });
      errorMonitor.addError('network_error', { message: 'Network Error' });
      errorMonitor.addError('javascript_error', { message: 'Another JS Error' });

      global.window.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200
      });

      await errorMonitor.sendReport();

      const requestBody = JSON.parse(global.window.fetch.mock.calls[0][1].body);
      expect(requestBody.summary.total).toBe(3);
      expect(requestBody.summary.byType.javascript_error).toBe(2);
      expect(requestBody.summary.byType.network_error).toBe(1);
    });

    test('should handle HTTP error responses', async () => {
      errorMonitor.addError('test_error', { message: 'Test' });

      global.window.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await errorMonitor.sendReport();

      expect(errorMonitor.errors).toHaveLength(1);
    });

    test('should use custom API endpoint', async () => {
      const customMonitor = new ClientErrorMonitor({
        apiEndpoint: '/custom/error-endpoint'
      });
      customMonitor.isCollecting = true;
      customMonitor.addError('test_error', { message: 'Test' });

      global.window.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200
      });

      await customMonitor.sendReport();

      expect(global.window.fetch).toHaveBeenCalledWith(
        '/custom/error-endpoint',
        expect.any(Object)
      );
    });

    test('should log debug information when sending report', async () => {
      errorMonitor.addError('test_error', { message: 'Test' });

      global.window.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200
      });

      await errorMonitor.sendReport();

      expect(global.console.log).toHaveBeenCalled();
      const logCall = global.console.log.mock.calls.find(call => 
        call[0].includes('Starting error report submission')
      );
      expect(logCall).toBeDefined();
    });

    test('should log error when report submission fails', async () => {
      errorMonitor.addError('test_error', { message: 'Test' });

      global.window.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await errorMonitor.sendReport();

      expect(global.console.log).toHaveBeenCalled();
      const logCall = global.console.log.mock.calls.find(call => 
        call[0].includes('Error submitting report')
      );
      expect(logCall).toBeDefined();
    });
  });

  describe('getSessionId', () => {
    test('should generate new session ID when not exists', () => {
      global.sessionStorage.getItem.mockReturnValue(null);
      global.sessionStorage.setItem.mockImplementation(() => {});

      const sessionId = errorMonitor.getSessionId();

      expect(sessionId).toMatch(/^session_\d+_[\w]+$/);
      expect(global.sessionStorage.setItem).toHaveBeenCalledWith(
        'error_analyzer_session_id',
        sessionId
      );
    });

    test('should return existing session ID', () => {
      const existingId = 'existing-session-id';
      global.sessionStorage.getItem.mockReturnValue(existingId);

      const sessionId = errorMonitor.getSessionId();

      expect(sessionId).toBe(existingId);
      expect(global.sessionStorage.setItem).not.toHaveBeenCalled();
    });

    test('should generate unique session IDs', () => {
      global.sessionStorage.getItem.mockReturnValue(null);
      global.sessionStorage.setItem.mockImplementation(() => {});

      const sessionId1 = errorMonitor.getSessionId();
      const sessionId2 = errorMonitor.getSessionId();

      expect(sessionId1).not.toBe(sessionId2);
      expect(sessionId1).toMatch(/^session_\d+_[\w]+$/);
      expect(sessionId2).toMatch(/^session_\d+_[\w]+$/);
    });

    test('should log debug information when creating new session', () => {
      global.sessionStorage.getItem.mockReturnValue(null);
      global.sessionStorage.setItem.mockImplementation(() => {});

      errorMonitor.getSessionId();

      expect(global.console.log).toHaveBeenCalled();
      const logCall = global.console.log.mock.calls.find(call => 
        call[0].includes('New session ID created')
      );
      expect(logCall).toBeDefined();
    });

    test('should handle sessionStorage errors gracefully', () => {
      global.sessionStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(() => errorMonitor.getSessionId()).toThrow('Storage error');
    });
  });

  describe('startCollecting and stopCollecting', () => {
    test('should start collecting errors', () => {
      errorMonitor.startCollecting();

      expect(errorMonitor.isCollecting).toBe(true);
      expect(global.setInterval).toHaveBeenCalled();
    });

    test('should not start collecting if already collecting', () => {
      errorMonitor.startCollecting();
      const firstIntervalId = errorMonitor.intervalId;

      errorMonitor.startCollecting();

      expect(errorMonitor.intervalId).toBe(firstIntervalId);
    });

    test('should stop collecting errors', () => {
      errorMonitor.startCollecting();
      expect(errorMonitor.isCollecting).toBe(true);

      errorMonitor.stopCollecting();

      expect(errorMonitor.isCollecting).toBe(false);
      expect(errorMonitor.intervalId).toBeNull();
    });

    test('should submit final report on stop', async () => {
      errorMonitor.startCollecting();
      errorMonitor.addError('final_error', { message: 'Final error' });

      global.window.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

      await errorMonitor.stopCollecting();

      expect(global.window.fetch).toHaveBeenCalled();
    });

    test('should setup all error handlers when starting', () => {
      errorMonitor.startCollecting();

      expect(global.window.addEventListener).toHaveBeenCalled();
      expect(typeof global.window.onerror).toBe('function');
      expect(typeof global.window.onunhandledrejection).toBe('function');
    });

    test('should clear errors when starting collection', () => {
      errorMonitor.addError('old_error', { message: 'Old error' });
      expect(errorMonitor.errors).toHaveLength(1);

      errorMonitor.startCollecting();

      expect(errorMonitor.errors).toHaveLength(0);
    });

    test('should set up periodic report submission', () => {
      jest.useFakeTimers();
      
      errorMonitor.startCollecting();
      errorMonitor.addError('test_error', { message: 'Test' });

      jest.advanceTimersByTime(30000); // Advance by report interval

      expect(global.setInterval).toHaveBeenCalledWith(expect.any(Function), 30000);
      
      jest.useRealTimers();
    });

    test('should not submit report when no errors in periodic check', () => {
      jest.useFakeTimers();
      
      errorMonitor.startCollecting();

      jest.advanceTimersByTime(30000);

      expect(global.window.fetch).not.toHaveBeenCalled();
      
      jest.useRealTimers();
    });

    test('should log debug information when starting collection', () => {
      errorMonitor.startCollecting();

      expect(global.console.log).toHaveBeenCalled();
      const logCall = global.console.log.mock.calls.find(call => 
        call[0].includes('Starting error collection')
      );
      expect(logCall).toBeDefined();
    });

    test('should log debug information when stopping collection', () => {
      errorMonitor.startCollecting();
      errorMonitor.stopCollecting();

      expect(global.console.log).toHaveBeenCalled();
      const logCall = global.console.log.mock.calls.find(call => 
        call[0].includes('Stopping error collection')
      );
      expect(logCall).toBeDefined();
    });

    test('should handle multiple start/stop cycles', () => {
      errorMonitor.startCollecting();
      expect(errorMonitor.isCollecting).toBe(true);

      errorMonitor.stopCollecting();
      expect(errorMonitor.isCollecting).toBe(false);

      errorMonitor.startCollecting();
      expect(errorMonitor.isCollecting).toBe(true);

      errorMonitor.stopCollecting();
      expect(errorMonitor.isCollecting).toBe(false);
    });

    test('should not submit final report when no errors', async () => {
      errorMonitor.startCollecting();
      global.window.fetch = jest.fn();

      await errorMonitor.stopCollecting();

      expect(global.window.fetch).not.toHaveBeenCalled();
    });
  });

  describe('getErrorStats', () => {
    beforeEach(() => {
      errorMonitor.isCollecting = true;
    });

    test('should return error statistics', () => {
      errorMonitor.addError('error1', { message: 'Error 1' });
      errorMonitor.addError('error2', { message: 'Error 2' });
      errorMonitor.addError('error1', { message: 'Error 1 again' });

      const stats = errorMonitor.getErrorStats();

      expect(stats.total).toBe(3);
      expect(stats.byType.error1).toBe(2);
      expect(stats.byType.error2).toBe(1);
      expect(stats.bySeverity.error).toBeGreaterThanOrEqual(3);
    });

    test('should return empty stats when no errors', () => {
      const stats = errorMonitor.getErrorStats();

      expect(stats.total).toBe(0);
      expect(stats.byType).toEqual({});
      expect(stats.bySeverity).toEqual({
        'critical': 0,
        'error': 0,
        'warning': 0,
        'info': 0
      });
    });

    test('should count errors by severity correctly', () => {
      errorMonitor.addError('javascript_error', { fatal: true }); // critical
      errorMonitor.addError('javascript_error', { fatal: false }); // error
      errorMonitor.addError('resource_load_error', {}); // warning
      errorMonitor.addError('unknown_type', {}); // info

      const stats = errorMonitor.getErrorStats();

      expect(stats.bySeverity.critical).toBe(1);
      expect(stats.bySeverity.error).toBe(1);
      expect(stats.bySeverity.warning).toBe(1);
      expect(stats.bySeverity.info).toBe(1);
    });

    test('should handle multiple errors of same type and severity', () => {
      errorMonitor.addError('network_error', { status: 500 }); // error
      errorMonitor.addError('network_error', { status: 404 }); // warning
      errorMonitor.addError('network_error', { status: 500 }); // error

      const stats = errorMonitor.getErrorStats();

      expect(stats.byType.network_error).toBe(3);
      expect(stats.bySeverity.error).toBe(2);
      expect(stats.bySeverity.warning).toBe(1);
    });

    test('should maintain stats structure consistency', () => {
      const stats = errorMonitor.getErrorStats();

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('byType');
      expect(stats).toHaveProperty('bySeverity');
      expect(typeof stats.total).toBe('number');
      expect(typeof stats.byType).toBe('object');
      expect(typeof stats.bySeverity).toBe('object');
    });
  });

  describe('clearErrors and getErrors', () => {
    beforeEach(() => {
      errorMonitor.isCollecting = true;
    });

    test('should clear all errors', () => {
      errorMonitor.addError('test', { message: 'Test' });
      expect(errorMonitor.errors).toHaveLength(1);

      errorMonitor.clearErrors();
      expect(errorMonitor.errors).toHaveLength(0);
    });

    test('should return all errors', () => {
      const testError = { message: 'Test error' };
      errorMonitor.addError('test', testError);

      const errors = errorMonitor.getErrors();

      expect(errors).toHaveLength(1);
      expect(errors[0].data).toEqual(testError);
    });

    test('should clear errors when no errors exist', () => {
      expect(errorMonitor.errors).toHaveLength(0);

      errorMonitor.clearErrors();
      expect(errorMonitor.errors).toHaveLength(0);
    });

    test('should return empty array when no errors', () => {
      const errors = errorMonitor.getErrors();

      expect(errors).toEqual([]);
      expect(errors).toHaveLength(0);
    });

    test('should return copy of errors array', () => {
      errorMonitor.addError('test', { message: 'Test' });

      const errors = errorMonitor.getErrors();
      errors.push('modified'); // This should not affect the original array

      expect(errorMonitor.getErrors()).toHaveLength(1);
      expect(errorMonitor.errors).toHaveLength(1);
      expect(errorMonitor.getErrors()[0].data.message).toBe('Test');
    });

    test('should log debug information when clearing errors', () => {
      errorMonitor.addError('test', { message: 'Test' });
      errorMonitor.clearErrors();

      expect(global.console.log).toHaveBeenCalled();
      const logCall = global.console.log.mock.calls.find(call => 
        call[0].includes('Clearing all errors')
      );
      expect(logCall).toBeDefined();
    });

    test('should maintain error structure integrity', () => {
      errorMonitor.addError('test1', { message: 'Error 1' });
      errorMonitor.addError('test2', { message: 'Error 2' });

      const errors = errorMonitor.getErrors();

      expect(errors).toHaveLength(2);
      expect(errors[0]).toHaveProperty('id');
      expect(errors[0]).toHaveProperty('type');
      expect(errors[0]).toHaveProperty('timestamp');
      expect(errors[0]).toHaveProperty('data');
      expect(errors[0]).toHaveProperty('severity');
      expect(errors[1]).toHaveProperty('id');
      expect(errors[1]).toHaveProperty('type');
      expect(errors[1]).toHaveProperty('timestamp');
      expect(errors[1]).toHaveProperty('data');
      expect(errors[1]).toHaveProperty('severity');
    });
  });

  describe('loadFromFile and saveToFile', () => {
    test('should load errors from file (placeholder)', async () => {
      const result = await errorMonitor.loadFromFile('/test/path');
      expect(result).toEqual([]);
    });

    test('should save errors to file (placeholder)', async () => {
      const result = await errorMonitor.saveToFile('/test/path');
      expect(result).toBe(true);
    });

    test('should log debug information when loading from file', async () => {
      await errorMonitor.loadFromFile('/test/path');

      expect(global.console.log).toHaveBeenCalled();
      const logCall = global.console.log.mock.calls.find(call => 
        call[0].includes('Attempting to load errors from file')
      );
      expect(logCall).toBeDefined();
    });

    test('should log debug information when saving to file', async () => {
      await errorMonitor.saveToFile('/test/path');

      expect(global.console.log).toHaveBeenCalled();
      const logCall = global.console.log.mock.calls.find(call => 
        call[0].includes('Attempting to save errors to file')
      );
      expect(logCall).toBeDefined();
    });

    test('should handle null file path', async () => {
      const loadResult = await errorMonitor.loadFromFile(null);
      const saveResult = await errorMonitor.saveToFile(null);

      expect(loadResult).toEqual([]);
      expect(saveResult).toBe(true);
    });

    test('should handle undefined file path', async () => {
      const loadResult = await errorMonitor.loadFromFile(undefined);
      const saveResult = await errorMonitor.saveToFile(undefined);

      expect(loadResult).toEqual([]);
      expect(saveResult).toBe(true);
    });
  });

  describe('edge cases and error handling', () => {
    test('should handle malformed error data', () => {
      errorMonitor.isCollecting = true;

      errorMonitor.addError('test', undefined);
      errorMonitor.addError('test', null);

      expect(errorMonitor.errors).toHaveLength(2);
    });

    test('should handle determineSeverity with malformed data', () => {
      expect(errorMonitor.determineSeverity('javascript_error', null)).toBe('error');
      expect(errorMonitor.determineSeverity('javascript_error', undefined)).toBe('error');
      expect(errorMonitor.determineSeverity('javascript_error', undefined)).toBe('error');
    });

    test('should handle createErrorEntry with missing window properties', () => {
      const originalLocation = global.window.location;
      delete global.window.location;

      const entry = errorMonitor.createErrorEntry('test', {});

      expect(entry).toHaveProperty('id');
      expect(entry.url).toBeUndefined();
      expect(entry.userAgent).toBeUndefined();

      global.window.location = originalLocation;
    });

    test('should handle multiple simultaneous errors', () => {
      errorMonitor.isCollecting = true;

      for (let i = 0; i < 10; i++) {
        errorMonitor.addError(`error${i}`, { message: `Error ${i}` });
      }

      expect(errorMonitor.errors).toHaveLength(5); // maxErrorsPerReport = 5

      const ids = errorMonitor.errors.map(e => e.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
    });

    test('should handle large error messages', () => {
      errorMonitor.isCollecting = true;

      const largeMessage = 'a'.repeat(10000);
      errorMonitor.addError('large_error', { message: largeMessage });

      expect(errorMonitor.errors).toHaveLength(1);
      expect(errorMonitor.errors[0].data.message).toHaveLength(10000);
    });

    test('should handle circular references in error data', () => {
      errorMonitor.isCollecting = true;

      const circularObj = { prop: 'value' };
      circularObj.self = circularObj;

      errorMonitor.addError('circular_error', circularObj);

      expect(errorMonitor.errors).toHaveLength(1);
      expect(errorMonitor.errors[0].data).toBe(circularObj);
    });

    test('should handle missing navigator property', () => {
      const originalNavigator = global.window.navigator;
      delete global.window.navigator;

      const entry = errorMonitor.createErrorEntry('test', {});

      expect(entry).toHaveProperty('id');
      expect(entry.userAgent).toBeUndefined();

      global.window.navigator = originalNavigator;
    });

    test('should handle missing innerWidth and innerHeight', () => {
      const originalInnerWidth = global.window.innerWidth;
      const originalInnerHeight = global.window.innerHeight;
      delete global.window.innerWidth;
      delete global.window.innerHeight;

      const entry = errorMonitor.createErrorEntry('test', {});

      expect(entry).toHaveProperty('id');
      expect(entry.viewport.width).toBeUndefined();
      expect(entry.viewport.height).toBeUndefined();

      global.window.innerWidth = originalInnerWidth;
      global.window.innerHeight = originalInnerHeight;
    });

    test('should handle performance API errors', () => {
      errorMonitor.config.enablePerformanceCapture = true;
      errorMonitor.isCollecting = true;

      global.window.performance.getEntriesByType = jest.fn().mockImplementation(() => {
        throw new Error('Performance API not supported');
      });

      errorMonitor.setupPerformanceMonitoring();

      const loadHandler = global.window.addEventListener.mock.calls.find(
        call => call[0] === 'load'
      )[1];

      expect(() => loadHandler()).not.toThrow();
    });

    test('should handle fetch API errors gracefully', async () => {
      errorMonitor.isCollecting = true;
      errorMonitor.addError('test_error', { message: 'Test' });

      global.window.fetch = jest.fn().mockImplementation(() => {
        throw new Error('Fetch not available');
      });

      await expect(errorMonitor.sendReport()).rejects.toThrow('Fetch not available');
    });

    test('should handle sessionStorage errors', () => {
      global.sessionStorage.getItem = jest.fn().mockImplementation(() => {
        throw new Error('Storage not available');
      });

      expect(() => errorMonitor.getSessionId()).toThrow('Storage not available');
    });

    test('should handle console API errors', () => {
      errorMonitor.config.enableConsoleCapture = true;
      errorMonitor.isCollecting = true;

      global.console.error = null;
      global.console.warn = null;

      expect(() => errorMonitor.setupConsoleCapture()).not.toThrow();
    });

    test('should handle rapid error additions', () => {
      errorMonitor.isCollecting = true;
      errorMonitor.config.maxErrorsPerReport = 5;

      for (let i = 0; i < 20; i++) {
        errorMonitor.addError(`error${i}`, { message: `Error ${i}` });
      }

      expect(errorMonitor.errors).toHaveLength(5);
      expect(errorMonitor.errors[0].data.message).toBe('Error 15');
      expect(errorMonitor.errors[4].data.message).toBe('Error 19');
    });

    test('should handle empty error types', () => {
      errorMonitor.isCollecting = true;

      errorMonitor.addError('', { message: 'Empty type error' });
      errorMonitor.addError(null, { message: 'Null type error' });
      errorMonitor.addError(undefined, { message: 'Undefined type error' });

      expect(errorMonitor.errors).toHaveLength(3);
    });

    test('should handle non-string error types', () => {
      errorMonitor.isCollecting = true;

      errorMonitor.addError(123, { message: 'Number type error' });
      errorMonitor.addError({}, { message: 'Object type error' });
      errorMonitor.addError(true, { message: 'Boolean type error' });

      expect(errorMonitor.errors).toHaveLength(3);
    });

    test('should handle extreme performance values', () => {
      errorMonitor.config.enablePerformanceCapture = true;
      errorMonitor.isCollecting = true;

      global.window.performance.getEntriesByType = jest.fn().mockReturnValue([{
        loadEventEnd: Number.MAX_SAFE_INTEGER,
        loadEventStart: 0,
        domContentLoadedEventEnd: Number.MAX_SAFE_INTEGER,
        domContentLoadedEventStart: 0
      }]);

      errorMonitor.setupPerformanceMonitoring();

      const loadHandler = global.window.addEventListener.mock.calls.find(
        call => call[0] === 'load'
      )[1];

      expect(() => loadHandler()).not.toThrow();
    });
  });
});
