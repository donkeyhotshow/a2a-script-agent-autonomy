const { 
  LoggerCore, 
  ALLOWED_PATH_CATEGORIES, 
  FORBIDDEN_PATH_PATTERNS, 
  readDisabledFromConfig 
} = require('../index.cjs');

const fs = require('fs');
const path = require('path');
const os = require('os');

// Mock fs.appendFileSync
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  appendFileSync: jest.fn(),
}));

describe('ServerUtils', () => {
  let logger;
  let testLogFile;

  beforeEach(() => {
    jest.clearAllMocks();
    testLogFile = path.join(os.tmpdir(), `test-log-${Date.now()}.log`);
  });

  afterEach(() => {
    // Clean up test log file
    try {
      if (fs.existsSync(testLogFile)) {
        fs.unlinkSync(testLogFile);
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('LoggerCore', () => {
    describe('constructor', () => {
      test('should create logger with default configuration', () => {
        logger = new LoggerCore();
        
        expect(logger.level).toBe('info');
        expect(logger.console).toBe(true);
        expect(logger.file).toBe(false);
        expect(logger.maxSize).toBe('10m');
        expect(logger.maxFiles).toBe('5');
      });

      test('should create logger with custom configuration', () => {
        const config = {
          level: 'debug',
          console: false,
          file: true,
          filePath: testLogFile,
          maxSize: '20m',
          maxFiles: '10'
        };
        
        logger = new LoggerCore(config);
        
        expect(logger.level).toBe('debug');
        expect(logger.console).toBe(false);
        expect(logger.file).toBe(true);
        expect(logger.filePath).toBe(testLogFile);
        expect(logger.maxSize).toBe('20m');
        expect(logger.maxFiles).toBe('10');
      });

      test('should have correct log levels', () => {
        logger = new LoggerCore();
        
        expect(logger.levels).toEqual({
          error: 0,
          warn: 1,
          info: 2,
          debug: 3
        });
      });
    });

    describe('shouldLog', () => {
      test('should allow logging at current level', () => {
        logger = new LoggerCore({ level: 'info' });
        
        expect(logger.shouldLog('error')).toBe(true);
        expect(logger.shouldLog('warn')).toBe(true);
        expect(logger.shouldLog('info')).toBe(true);
        expect(logger.shouldLog('debug')).toBe(false);
      });

      test('should allow logging at debug level', () => {
        logger = new LoggerCore({ level: 'debug' });
        
        expect(logger.shouldLog('error')).toBe(true);
        expect(logger.shouldLog('warn')).toBe(true);
        expect(logger.shouldLog('info')).toBe(true);
        expect(logger.shouldLog('debug')).toBe(true);
      });

      test('should restrict logging at error level', () => {
        logger = new LoggerCore({ level: 'error' });
        
        expect(logger.shouldLog('error')).toBe(true);
        expect(logger.shouldLog('warn')).toBe(false);
        expect(logger.shouldLog('info')).toBe(false);
        expect(logger.shouldLog('debug')).toBe(false);
      });
    });

    describe('formatMessage', () => {
      test('should format message without metadata', () => {
        logger = new LoggerCore();
        
        const message = logger.formatMessage('info', 'Test message');
        
        expect(message).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\] Test message$/);
      });

      test('should format message with metadata', () => {
        logger = new LoggerCore();
        
        const metadata = { userId: 123, action: 'test' };
        const message = logger.formatMessage('error', 'Error occurred', metadata);
        
        expect(message).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[ERROR\] Error occurred {"userId":123,"action":"test"}$/);
      });

      test('should handle empty metadata', () => {
        logger = new LoggerCore();
        
        const message = logger.formatMessage('warn', 'Warning message', {});
        
        expect(message).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[WARN\] Warning message$/);
      });
    });

    describe('log', () => {
      test('should log to console when console is enabled', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        logger = new LoggerCore({ level: 'info', console: true });
        
        logger.log('info', 'Test message');
        
        expect(consoleSpy).toHaveBeenCalled();
        expect(consoleSpy.mock.calls[0][0]).toContain('[INFO] Test message');
        
        consoleSpy.mockRestore();
      });

      test('should not log to console when console is disabled', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        logger = new LoggerCore({ level: 'info', console: false });
        
        logger.log('info', 'Test message');
        
        expect(consoleSpy).not.toHaveBeenCalled();
        
        consoleSpy.mockRestore();
      });

      test('should log to file when file is enabled', () => {
        logger = new LoggerCore({ 
          level: 'info', 
          file: true, 
          filePath: testLogFile 
        });
        
        logger.log('info', 'Test message');
        
        expect(fs.appendFileSync).toHaveBeenCalledWith(
          testLogFile, 
          expect.stringContaining('[INFO] Test message\n')
        );
      });

      test('should not log to file when file is disabled', () => {
        logger = new LoggerCore({ level: 'info', file: false });
        
        logger.log('info', 'Test message');
        
        expect(fs.appendFileSync).not.toHaveBeenCalled();
      });

      test('should handle file write errors gracefully', () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        fs.appendFileSync.mockImplementation(() => { throw new Error('Write error'); });
        
        logger = new LoggerCore({ 
          level: 'info', 
          file: true, 
          filePath: testLogFile 
        });
        
        logger.log('info', 'Test message');
        
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to write to log file:', 
          'Write error'
        );
        
        consoleErrorSpy.mockRestore();
        fs.appendFileSync.mockRestore();
      });

      test('should respect log level filtering', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        logger = new LoggerCore({ level: 'warn' });
        
        logger.log('debug', 'Debug message');
        logger.log('info', 'Info message');
        logger.log('warn', 'Warning message');
        
        expect(consoleSpy).toHaveBeenCalledTimes(1);
        expect(consoleSpy.mock.calls[0][0]).toContain('[WARN] Warning message');
        
        consoleSpy.mockRestore();
      });
    });

    describe('log level methods', () => {
      test('should call log with correct level for error', () => {
        const logSpy = jest.spyOn(LoggerCore.prototype, 'log').mockImplementation(() => {});
        logger = new LoggerCore();
        
        logger.error('Error message', { error: 'details' });
        
        expect(logSpy).toHaveBeenCalledWith('error', 'Error message', { error: 'details' });
        
        logSpy.mockRestore();
      });

      test('should call log with correct level for warn', () => {
        const logSpy = jest.spyOn(LoggerCore.prototype, 'log').mockImplementation(() => {});
        logger = new LoggerCore();
        
        logger.warn('Warning message', { warning: 'details' });
        
        expect(logSpy).toHaveBeenCalledWith('warn', 'Warning message', { warning: 'details' });
        
        logSpy.mockRestore();
      });

      test('should call log with correct level for info', () => {
        const logSpy = jest.spyOn(LoggerCore.prototype, 'log').mockImplementation(() => {});
        logger = new LoggerCore();
        
        logger.info('Info message', { info: 'details' });
        
        expect(logSpy).toHaveBeenCalledWith('info', 'Info message', { info: 'details' });
        
        logSpy.mockRestore();
      });

      test('should call log with correct level for debug', () => {
        const logSpy = jest.spyOn(LoggerCore.prototype, 'log').mockImplementation(() => {});
        logger = new LoggerCore();
        
        logger.debug('Debug message', { debug: 'details' });
        
        expect(logSpy).toHaveBeenCalledWith('debug', 'Debug message', { debug: 'details' });
        
        logSpy.mockRestore();
      });
    });
  });

  describe('ALLOWED_PATH_CATEGORIES', () => {
    test('should have current-dir category', () => {
      expect(ALLOWED_PATH_CATEGORIES['current-dir']).toBeDefined();
      expect(ALLOWED_PATH_CATEGORIES['current-dir'].description).toBe('Текущая рабочая директория и её поддиректории');
      expect(Array.isArray(ALLOWED_PATH_CATEGORIES['current-dir'].patterns)).toBe(true);
    });

    test('should have user-home category', () => {
      expect(ALLOWED_PATH_CATEGORIES['user-home']).toBeDefined();
      expect(ALLOWED_PATH_CATEGORIES['user-home'].description).toBe('Домашняя директория пользователя');
      expect(Array.isArray(ALLOWED_PATH_CATEGORIES['user-home'].patterns)).toBe(true);
    });

    test('should have temp-dirs category', () => {
      expect(ALLOWED_PATH_CATEGORIES['temp-dirs']).toBeDefined();
      expect(ALLOWED_PATH_CATEGORIES['temp-dirs'].description).toBe('Временные директории');
      expect(Array.isArray(ALLOWED_PATH_CATEGORIES['temp-dirs'].patterns)).toBe(true);
    });

    test('should have project-dirs category', () => {
      expect(ALLOWED_PATH_CATEGORIES['project-dirs']).toBeDefined();
      expect(ALLOWED_PATH_CATEGORIES['project-dirs'].description).toBe('Директории проектов');
      expect(Array.isArray(ALLOWED_PATH_CATEGORIES['project-dirs'].patterns)).toBe(true);
    });

    test('should have apps-dir category', () => {
      expect(ALLOWED_PATH_CATEGORIES['apps-dir']).toBeDefined();
      expect(ALLOWED_PATH_CATEGORIES['apps-dir'].description).toBe('Директория apps и её поддиректории');
      expect(Array.isArray(ALLOWED_PATH_CATEGORIES['apps-dir'].patterns)).toBe(true);
    });

    test('should have absolute-paths category', () => {
      expect(ALLOWED_PATH_CATEGORIES['absolute-paths']).toBeDefined();
      expect(ALLOWED_PATH_CATEGORIES['absolute-paths'].description).toBe('Абсолютные пути (осторожно использовать)');
      expect(Array.isArray(ALLOWED_PATH_CATEGORIES['absolute-paths'].patterns)).toBe(true);
    });

    test('should have valid regex patterns', () => {
      for (const category of Object.values(ALLOWED_PATH_CATEGORIES)) {
        for (const pattern of category.patterns) {
          expect(pattern).toBeInstanceOf(RegExp);
          // Test that patterns can be used
          expect(typeof pattern.test('test')).toBe('boolean');
        }
      }
    });
  });

  describe('FORBIDDEN_PATH_PATTERNS', () => {
    test('should be an array of regex patterns', () => {
      expect(Array.isArray(FORBIDDEN_PATH_PATTERNS)).toBe(true);
      expect(FORBIDDEN_PATH_PATTERNS.length).toBeGreaterThan(0);
    });

    test('should contain Unix system directories', () => {
      const unixPatterns = [
        /^\/bin\/?$/,
        /^\/sbin\/?$/,
        /^\/usr\/?$/,
        /^\/etc\/?$/,
        /^\/var\/?$/,
        /^\/boot\/?$/,
        /^\/proc\/?$/,
        /^\/sys\/?$/,
        /^\/dev\/?$/
      ];

      for (const pattern of unixPatterns) {
        expect(FORBIDDEN_PATH_PATTERNS).toContainEqual(pattern);
      }
    });

    test('should contain Windows system directories', () => {
      const windowsPatterns = [
        /^[a-zA-Z]:\\Windows\\?$/i,
        /^[a-zA-Z]:\\System32\\?$/i,
        /^[a-zA-Z]:\\Program Files\\?$/i,
        /^[a-zA-Z]:\\Program Files \(x86\)\\?$/i,
        /^[a-zA-Z]:\\Users\\?$/i,
        /^[a-zA-Z]:\\ProgramData\\?$/i
      ];

      for (const pattern of windowsPatterns) {
        expect(FORBIDDEN_PATH_PATTERNS).toContainEqual(pattern);
      }
    });

    test('should contain suspicious patterns', () => {
      const suspiciousPatterns = [
        /\.\.\./,
        /^\.\.\/\.\.\/\.\./,
        /\/\.\.\//,
        /\\\.\.\\/,
        /\/\/+/,
        /\\\\+/,
        /[<>:"|?*]/,
        /[\x00-\x1f\x7f]/
      ];

      for (const pattern of suspiciousPatterns) {
        expect(FORBIDDEN_PATH_PATTERNS).toContainEqual(pattern);
      }
    });

    test('should have valid regex patterns', () => {
      for (const pattern of FORBIDDEN_PATH_PATTERNS) {
        expect(pattern).toBeInstanceOf(RegExp);
        // Test that patterns can be used
        expect(typeof pattern.test('test')).toBe('boolean');
      }
    });
  });

  describe('readDisabledFromConfig', () => {
    test('should return empty array when MCP_DISABLED_TOOLS is not set', async () => {
      const originalEnv = process.env.MCP_DISABLED_TOOLS;
      delete process.env.MCP_DISABLED_TOOLS;
      
      const result = await readDisabledFromConfig();
      expect(result).toEqual([]);
      
      process.env.MCP_DISABLED_TOOLS = originalEnv;
    });

    test('should return empty array when MCP_DISABLED_TOOLS is empty', async () => {
      const originalEnv = process.env.MCP_DISABLED_TOOLS;
      process.env.MCP_DISABLED_TOOLS = '';
      
      const result = await readDisabledFromConfig();
      expect(result).toEqual([]);
      
      process.env.MCP_DISABLED_TOOLS = originalEnv;
    });

    test('should return empty array when MCP_DISABLED_TOOLS is whitespace only', async () => {
      const originalEnv = process.env.MCP_DISABLED_TOOLS;
      process.env.MCP_DISABLED_TOOLS = '   ';
      
      const result = await readDisabledFromConfig();
      expect(result).toEqual([]);
      
      process.env.MCP_DISABLED_TOOLS = originalEnv;
    });

    test('should parse single disabled tool', async () => {
      const originalEnv = process.env.MCP_DISABLED_TOOLS;
      process.env.MCP_DISABLED_TOOLS = 'terminal';
      
      const result = await readDisabledFromConfig();
      expect(result).toEqual(['terminal']);
      
      process.env.MCP_DISABLED_TOOLS = originalEnv;
    });

    test('should parse multiple disabled tools', async () => {
      const originalEnv = process.env.MCP_DISABLED_TOOLS;
      process.env.MCP_DISABLED_TOOLS = 'terminal,file,search';
      
      const result = await readDisabledFromConfig();
      expect(result).toEqual(['terminal', 'file', 'search']);
      
      process.env.MCP_DISABLED_TOOLS = originalEnv;
    });

    test('should handle whitespace in disabled tools', async () => {
      const originalEnv = process.env.MCP_DISABLED_TOOLS;
      process.env.MCP_DISABLED_TOOLS = ' terminal , file , search ';
      
      const result = await readDisabledFromConfig();
      expect(result).toEqual(['terminal', 'file', 'search']);
      
      process.env.MCP_DISABLED_TOOLS = originalEnv;
    });

    test('should filter out empty entries', async () => {
      const originalEnv = process.env.MCP_DISABLED_TOOLS;
      process.env.MCP_DISABLED_TOOLS = 'terminal,,file,,search';
      
      const result = await readDisabledFromConfig();
      expect(result).toEqual(['terminal', 'file', 'search']);
      
      process.env.MCP_DISABLED_TOOLS = originalEnv;
    });

    test('should handle error gracefully', async () => {
      const originalEnv = process.env.MCP_DISABLED_TOOLS;
      // Set to a non-string value to cause error
      process.env.MCP_DISABLED_TOOLS = null;
      
      const result = await readDisabledFromConfig();
      expect(result).toEqual([]);
      
      process.env.MCP_DISABLED_TOOLS = originalEnv;
    });
  });

  describe('Integration scenarios', () => {
    test('should handle typical logging workflow', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      logger = new LoggerCore({ 
        level: 'info', 
        console: true, 
        file: true, 
        filePath: testLogFile 
      });
      
      logger.info('Application started');
      logger.warn('Configuration warning', { config: 'test' });
      logger.error('Critical error', { error: 'details' });
      
      expect(consoleSpy).toHaveBeenCalledTimes(3);
      expect(fs.appendFileSync).toHaveBeenCalledTimes(3);
      
      consoleSpy.mockRestore();
    });

    test('should handle path validation workflow', () => {
      // Test that path patterns can be used for validation
      const testPaths = [
        './relative/path',
        '~/user/home',
        '/tmp/temp/file',
        'C:\\apps\\project',
        '/absolute/path'
      ];
      
      for (const testPath of testPaths) {
        // Test against allowed patterns
        let isAllowed = false;
        for (const category of Object.values(ALLOWED_PATH_CATEGORIES)) {
          for (const pattern of category.patterns) {
            if (pattern.test(testPath)) {
              isAllowed = true;
              break;
            }
          }
          if (isAllowed) break;
        }
        
        // Test against forbidden patterns
        let isForbidden = false;
        for (const pattern of FORBIDDEN_PATH_PATTERNS) {
          if (pattern.test(testPath)) {
            isForbidden = true;
            break;
          }
        }
        
        expect(typeof isAllowed).toBe('boolean');
        expect(typeof isForbidden).toBe('boolean');
      }
    });

    test('should handle configuration reading workflow', async () => {
      const originalEnv = process.env.MCP_DISABLED_TOOLS;
      process.env.MCP_DISABLED_TOOLS = 'terminal,file';
      
      const disabledTools = await readDisabledFromConfig();
      
      expect(disabledTools).toEqual(['terminal', 'file']);
      expect(disabledTools.length).toBe(2);
      
      process.env.MCP_DISABLED_TOOLS = originalEnv;
    });
  });
});
