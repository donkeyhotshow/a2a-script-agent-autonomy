const { runCommand, ProcessManager, CatEmulator, BackgroundExecutor, CommandExecutor } = require('../index.cjs');

// Моки для execa
jest.mock('execa', () => {
  return jest.fn().mockImplementation((command, options) => {
    // Мокаем успешное выполнение команды
    if (command === 'echo "success"') {
      return Promise.resolve({
        exitCode: 0,
        stdout: 'success',
        stderr: '',
        command: command,
        escapedCommand: command,
        cwd: options.cwd || process.cwd(),
        failed: false,
        timedOut: false,
        isCanceled: false,
        killed: false
      });
    }

    // Мокаем неуспешное выполнение команды
    if (command === 'invalid-command') {
      return Promise.resolve({
        exitCode: 1,
        stdout: '',
        stderr: 'Command not found',
        command: command,
        escapedCommand: command,
        cwd: options.cwd || process.cwd(),
        failed: true,
        timedOut: false,
        isCanceled: false,
        killed: false
      });
    }

    // Мокаем команду с таймаутом
    if (command === 'slow-command') {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(new Error('Command timed out'));
        }, 100);
      });
    }

    // По умолчанию успешное выполнение
    return Promise.resolve({
      exitCode: 0,
      stdout: 'default output',
      stderr: '',
      command: command,
      escapedCommand: command,
      cwd: options.cwd || process.cwd(),
      failed: false,
      timedOut: false,
      isCanceled: false,
      killed: false
    });
  });
});

describe('CommandExecutor', () => {
  let commandExecutor;
  let mockLogger;
  let mockErrorHandler;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    };

    mockErrorHandler = {
      handle: jest.fn(),
      handleError: jest.fn()
    };

    commandExecutor = new CommandExecutor(mockLogger, mockErrorHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with provided logger and error handler', () => {
      expect(commandExecutor.logger).toBe(mockLogger);
      expect(commandExecutor.errorHandler).toBe(mockErrorHandler);
    });

    it('should work with null error handler', () => {
      const executor = new CommandExecutor(mockLogger, null);
      expect(executor.logger).toBe(mockLogger);
      expect(executor.errorHandler).toBeNull();
    });
  });

  describe('runCommand', () => {
    it('should execute successful command', async () => {
      const command = 'echo "success"';
      const timeout = 30;
      const isBackground = false;
      const cwd = '/tmp';

      const result = await commandExecutor.runCommand(command, timeout, isBackground, cwd);

      expect(result.success).toBe(true);
      expect(result.stdout).toBe('success');
      expect(result.stderr).toBe('');
      expect(result.return_code).toBe(0);
      expect(result.command).toBe(command);
      expect(result.background).toBe(false);
      expect(typeof result.duration).toBe('string');
      expect(mockLogger.info).toHaveBeenCalledWith(`[CommandExecutor] Выполнение команды: ${command}`);
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('should handle command failure', async () => {
      const command = 'invalid-command';
      const timeout = 30;
      const isBackground = false;
      const cwd = '/tmp';

      const result = await commandExecutor.runCommand(command, timeout, isBackground, cwd);

      expect(result.success).toBe(false);
      expect(result.stdout).toBe('');
      expect(result.stderr).toBe('Command not found');
      expect(result.return_code).toBe(1);
      expect(result.command).toBe(command);
      expect(result.background).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle timeout error', async () => {
      const command = 'slow-command';
      const timeout = 0.1; // Очень маленький таймаут
      const isBackground = false;
      const cwd = '/tmp';

      const result = await commandExecutor.runCommand(command, timeout, isBackground, cwd);

      expect(result.success).toBe(false);
      expect(result.return_code).toBe(-1);
      expect(result.command).toBe(command);
      expect(result.background).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle background execution', async () => {
      const command = 'echo "background"';
      const timeout = 30;
      const isBackground = true;
      const cwd = '/tmp';

      const result = await commandExecutor.runCommand(command, timeout, isBackground, cwd);

      expect(result.success).toBe(true);
      expect(result.stdout).toBe('');
      expect(result.stderr).toBe('');
      expect(result.return_code).toBe(0);
      expect(result.command).toBe(command);
      expect(result.background).toBe(true);
      expect(result.pid).toBeDefined();
    });

    it('should use default timeout when not specified', async () => {
      const command = 'echo "test"';
      const isBackground = false;
      const cwd = null;

      const result = await commandExecutor.runCommand(command);

      expect(result.success).toBe(true);
      expect(result.command).toBe(command);
    });

    it('should use default cwd when not specified', async () => {
      const command = 'echo "test"';
      const timeout = 30;
      const isBackground = false;

      const result = await commandExecutor.runCommand(command, timeout, isBackground);

      expect(result.success).toBe(true);
      expect(result.command).toBe(command);
    });

    it('should call error handler when available and error occurs', async () => {
      const command = 'invalid-command';
      const timeout = 30;
      const isBackground = false;
      const cwd = '/tmp';

      await commandExecutor.runCommand(command, timeout, isBackground, cwd);

      expect(mockErrorHandler.handle).toHaveBeenCalled();
    });

    it('should not call error handler when not available', async () => {
      const executorWithoutErrorHandler = new CommandExecutor(mockLogger, null);
      const command = 'invalid-command';
      const timeout = 30;
      const isBackground = false;
      const cwd = '/tmp';

      // Не должно выбросить исключение
      const result = await executorWithoutErrorHandler.runCommand(command, timeout, isBackground, cwd);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('static runCommand', () => {
    it('should provide static method for compatibility', async () => {
      const command = 'echo "static test"';
      const timeout = 30;
      const isBackground = false;
      const cwd = null;

      const result = await CommandExecutor.runCommand(command, timeout, isBackground, cwd);

      expect(result.success).toBe(true);
      expect(result.command).toBe(command);
      expect(result.background).toBe(false);
    });
  });
});

describe('ProcessManager', () => {
  describe('isPowerShellCommand', () => {
    it('should identify PowerShell commands', () => {
      expect(ProcessManager.isPowerShellCommand('powershell -Command "Get-Date"')).toBe(true);
      expect(ProcessManager.isPowerShellCommand('pwsh -Command "Get-Date"')).toBe(true);
      expect(ProcessManager.isPowerShellCommand('powershell.exe script.ps1')).toBe(true);
    });

    it('should not identify non-PowerShell commands', () => {
      expect(ProcessManager.isPowerShellCommand('echo "hello"')).toBe(false);
      expect(ProcessManager.isPowerShellCommand('ls -la')).toBe(false);
      expect(ProcessManager.isPowerShellCommand('node app.js')).toBe(false);
    });

    it('should handle null and undefined', () => {
      expect(ProcessManager.isPowerShellCommand(null)).toBe(false);
      expect(ProcessManager.isPowerShellCommand(undefined)).toBe(false);
    });
  });
});

describe('CatEmulator', () => {
  describe('stripQuotes', () => {
    it('should strip single quotes', () => {
      expect(CatEmulator.stripQuotes("'hello world'")).toBe('hello world');
      expect(CatEmulator.stripQuotes("'test'")).toBe('test');
    });

    it('should strip double quotes', () => {
      expect(CatEmulator.stripQuotes('"hello world"')).toBe('hello world');
      expect(CatEmulator.stripQuotes('"test"')).toBe('test');
    });

    it('should not strip unquoted strings', () => {
      expect(CatEmulator.stripQuotes('hello world')).toBe('hello world');
      expect(CatEmulator.stripQuotes('test')).toBe('test');
    });

    it('should not strip mismatched quotes', () => {
      expect(CatEmulator.stripQuotes("'hello world\"")).toBe("'hello world\"");
      expect(CatEmulator.stripQuotes('"hello world\'')).toBe('"hello world\'');
    });

    it('should handle empty strings', () => {
      expect(CatEmulator.stripQuotes('')).toBe('');
      expect(CatEmulator.stripQuotes('""')).toBe('');
      expect(CatEmulator.stripQuotes("''")).toBe('');
    });
  });
});

describe('runCommand function', () => {
  it('should create CommandExecutor instance and run command', async () => {
    const command = 'echo "function test"';
    const options = {
      timeout: 30,
      isBackground: false,
      cwd: '/tmp',
      logger: console,
      errorHandler: null
    };

    const result = await runCommand(command, options);

    expect(result.success).toBe(true);
    expect(result.command).toBe(command);
    expect(result.background).toBe(false);
  });

  it('should use default options', async () => {
    const command = 'echo "default test"';

    const result = await runCommand(command);

    expect(result.success).toBe(true);
    expect(result.command).toBe(command);
  });
});
