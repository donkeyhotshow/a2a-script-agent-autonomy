const { runCommand, ProcessManager, CatEmulator, BackgroundExecutor, CommandExecutor, InputProcessor, isPowerShellCommand } = require('../index.cjs');
const path = require('path');
const os = require('os');

describe('CommandRunner', () => {
  let commandExecutor;
  let realLogger;
  let realErrorHandler;

  beforeAll(() => {
    realLogger = console;
    realErrorHandler = {
      handle: (error, context) => console.error(`[${context}] Error:`, error.message)
    };
    commandExecutor = new CommandExecutor(realLogger, realErrorHandler);
  });

  describe('runCommand', () => {
    test('should execute command successfully', async () => {
      const result = await runCommand('echo hello');

      expect(result.success).toBe(true);
      expect(result.stdout).toBeDefined();
      expect(result.return_code).toBe(0);
    });
  });

  describe('ProcessManager', () => {
    describe('isPowerShellCommand', () => {
      test('should identify PowerShell commands correctly', () => {
        expect(ProcessManager.isPowerShellCommand('powershell -Command "Get-Process"')).toBe(true);
        expect(ProcessManager.isPowerShellCommand('pwsh -Command "Get-Process"')).toBe(true);
        expect(ProcessManager.isPowerShellCommand('cmd /c dir')).toBe(false);
        expect(ProcessManager.isPowerShellCommand('ls')).toBe(false);
        expect(ProcessManager.isPowerShellCommand(null)).toBe(false);
        expect(ProcessManager.isPowerShellCommand('')).toBe(false);
      });
    });
  });

  describe('CatEmulator', () => {
    describe('stripQuotes', () => {
      test('should strip single quotes', () => {
        expect(CatEmulator.stripQuotes("'hello world'")).toBe('hello world');
      });

      test('should strip double quotes', () => {
        expect(CatEmulator.stripQuotes('"hello world"')).toBe('hello world');
      });

      test('should not strip quotes if not matching', () => {
        expect(CatEmulator.stripQuotes("'hello world")).toBe("'hello world");
        expect(CatEmulator.stripQuotes('hello world"')).toBe('hello world"');
      });

      test('should return original string if no quotes', () => {
        expect(CatEmulator.stripQuotes('hello world')).toBe('hello world');
        expect(CatEmulator.stripQuotes('')).toBe('');
      });
    });
  });

  describe('BackgroundExecutor', () => {
    test('should be instantiable', () => {
      const executor = new BackgroundExecutor();
      expect(executor).toBeInstanceOf(BackgroundExecutor);
    });
  });

  describe('CommandExecutor', () => {
    describe('constructor', () => {
      test('should initialize with logger and error handler', () => {
        expect(commandExecutor.logger).toBe(realLogger);
        expect(commandExecutor.errorHandler).toBe(realErrorHandler);
      });

      test('should work without logger and error handler', () => {
        const executor = new CommandExecutor();
        expect(executor.logger).toBeUndefined();
        expect(executor.errorHandler).toBeUndefined();
      });
    });

    describe('runCommand', () => {
      test('should execute command successfully', async () => {
        const result = await commandExecutor.runCommand('echo hello');

        expect(result.success).toBe(true);
        expect(result.stdout).toBeDefined();
        expect(result.stderr).toBeDefined();
        expect(result.return_code).toBe(0);
        expect(result.command).toBe('echo hello');
        expect(result.background).toBe(false);
        expect(result.duration).toBeDefined();
      });

      test('should handle command failure', async () => {
        const result = await commandExecutor.runCommand('node -e "process.exit(1)"');

        expect(result.success).toBe(false);
        expect(result.return_code).toBe(1);
        expect(result.command).toBe('node -e "process.exit(1)"');
        expect(result.background).toBe(false);
      });

      test('should handle background execution', async () => {
        const result = await commandExecutor.runCommand('echo background-test', 120, true);

        expect(result.success).toBe(true);
        expect(result.background).toBe(true);
        expect(result.pid).toBeDefined();
        expect(result.stdout).toBeDefined();
        expect(result.return_code).toBeDefined();
      });

      test('should handle execution errors', async () => {
        const result = await commandExecutor.runCommand('nonexistent-command-12345');

        expect(result.success).toBe(false);
        expect(result.return_code).toBe(-1);
        expect(result.error).toBeDefined();
      });

      test('should use custom working directory', async () => {
        const customCwd = process.cwd(); // Use current directory for testing
        const result = await commandExecutor.runCommand('echo hello', 120, false, customCwd);

        expect(result.success).toBe(true);
        expect(result.command).toBe('echo hello');
      });

      test('should use custom timeout', async () => {
        const result = await commandExecutor.runCommand('echo hello', 60);

        expect(result.success).toBe(true);
        expect(result.command).toBe('echo hello');
        expect(result.duration).toBeDefined();
      });

      test('should handle large output', async () => {
        // Test with a command that produces output
        const result = await commandExecutor.runCommand('node -e "console.log(\'x\'.repeat(300))"');

        expect(result.success).toBe(true);
        expect(result.stdout.length).toBeGreaterThan(200);
      });
    });

    describe('static runCommand', () => {
      test('should execute command using static method', async () => {
        const result = await CommandExecutor.runCommand('echo static');

        expect(result.success).toBe(true);
        expect(result.stdout).toBeDefined();
        expect(result.command).toBe('echo static');
      });
    });
  });

  describe('InputProcessor', () => {
    test('should be defined', () => {
      expect(InputProcessor).toBeDefined();
    });
  });

  describe('isPowerShellCommand', () => {
    test('should identify PowerShell commands correctly', () => {
      expect(isPowerShellCommand('powershell -Command "Get-Process"')).toBe(true);
      expect(isPowerShellCommand('pwsh -Command "Get-Process"')).toBe(true);
      expect(isPowerShellCommand('cmd /c dir')).toBe(false);
      expect(isPowerShellCommand('ls')).toBe(false);
    });
  });
});
