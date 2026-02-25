const { ProcessManagementUtils } = require('../index.js');
const { spawn, exec, execSync } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

// Mock console (used as logger and errorHandler)
const mockConsole = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  handleError: jest.fn(), // For errorHandler
};

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn(),
  exec: jest.fn(),
  execSync: jest.fn(),
}));

// Mock global timers for async operations
jest.useFakeTimers();

describe('ProcessManagementUtils', () => {
  let manager;
  let originalPlatform;

  beforeAll(() => {
    originalPlatform = process.platform;
    // Mock process.platform for consistent testing across OS
    Object.defineProperty(process, 'platform', {
      value: 'win32',
      writable: true,
    });
  });

  afterAll(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform });
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new ProcessManagementUtils({
      logger: mockConsole,
      errorHandler: mockConsole,
      rootDir: '/app',
    });
    manager.shell = 'cmd.exe'; // Ensure consistent shell for mocking

    // Reset mock implementations for child_process methods
    spawn.mockReset();
    exec.mockReset();
    execSync.mockReset();
  });

  describe('constructor', () => {
    test('should initialize with default options', () => {
      const defaultManager = new ProcessManagementUtils();
      expect(defaultManager.logger).toBe(console);
      expect(defaultManager.errorHandler).toBe(console);
      expect(defaultManager.rootDir).toBe(process.cwd());
      expect(defaultManager.shell).toBe('C:\\Windows\\System32\\cmd.exe');
      expect(defaultManager.activeProcesses).toBeInstanceOf(Map);
      expect(defaultManager.processHistory).toEqual([]);
      expect(defaultManager.maxHistorySize).toBe(1000);
      expect(defaultManager.stats).toEqual({
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        activeProcesses: 0,
      });
    });

    test('should initialize with custom options', () => {
      expect(manager.logger).toBe(mockConsole);
      expect(manager.errorHandler).toBe(mockConsole);
      expect(manager.rootDir).toBe('/app');
    });
  });

  describe('executeSync', () => {
    test('should execute command synchronously and return success', () => {
      execSync.mockReturnValue('sync stdout');

      const result = manager.executeSync('echo hello');

      expect(execSync).toHaveBeenCalledWith('echo hello', expect.objectContaining({
        encoding: 'utf8',
        cwd: process.cwd(),
      }));
      expect(result.success).toBe(true);
      expect(result.output).toBe('sync stdout');
      expect(result.code).toBe(0);
      expect(manager.stats.totalExecutions).toBe(1);
      expect(manager.stats.successfulExecutions).toBe(1);
      expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining('Синхронная команда успешно выполнена'));
    });

    test('should handle synchronous command execution error', () => {
      const error = new Error('sync error');
      error.stderr = 'error output';
      error.stdout = 'partial output';
      error.status = 1;
      execSync.mockImplementation(() => { throw error; });

      const result = manager.executeSync('bad-command');

      expect(result.success).toBe(false);
      expect(result.error).toBe('error output');
      expect(result.output).toBe('partial output');
      expect(result.code).toBe(1);
      expect(manager.stats.totalExecutions).toBe(1);
      expect(manager.stats.failedExecutions).toBe(1);
      expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining('Ошибка выполнения синхронной команды'));
      expect(mockConsole.handleError).toHaveBeenCalledWith(error, 'CommandExecutionError', { command: 'bad-command', type: 'sync' });
    });

    test('should handle timeout', () => {
      const timeoutError = new Error('ETIMEDOUT');
      timeoutError.code = 'ETIMEDOUT';
      execSync.mockImplementation(() => { throw timeoutError; });

      const result = manager.executeSync('slow-command', { timeout: 100 });

      expect(result.success).toBe(false);
      expect(result.error).toBe('ETIMEDOUT');
      expect(result.code).toBe(1); // Default error code if status is not set
      expect(manager.stats.totalExecutions).toBe(1);
      expect(manager.stats.failedExecutions).toBe(1);
    });

    test('should execute with custom cwd and env for synchronous command', () => {
      execSync.mockReturnValue('custom sync output');
      const customOptions = {
        cwd: '/custom/dir',
        env: { CUSTOM_VAR: 'value' },
      };

      manager.executeSync('echo custom', customOptions);

      expect(execSync).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        cwd: '/custom/dir',
        env: expect.objectContaining({ CUSTOM_VAR: 'value' }),
      }));
    });
  });

  describe('executeAsync', () => {
    test('should execute command asynchronously and return success', async () => {
      exec.mockImplementation((command, options, callback) => {
        callback(null, 'async stdout', '');
      });

      const result = await manager.executeAsync('node script.js');

      expect(exec).toHaveBeenCalledWith('node script.js', expect.objectContaining({
        encoding: 'utf8',
        cwd: process.cwd(),
      }), expect.any(Function));
      expect(result.success).toBe(true);
      expect(result.output).toBe('async stdout');
      expect(result.code).toBe(0);
      expect(manager.stats.totalExecutions).toBe(1);
      expect(manager.stats.successfulExecutions).toBe(1);
      expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining('Асинхронная команда успешно выполнена'));
    });

    test('should handle asynchronous command execution error', async () => {
      const error = new Error('async error');
      error.code = 1;
      exec.mockImplementation((command, options, callback) => {
        callback(error, 'partial stdout', 'error output');
      });

      const result = await manager.executeAsync('bad-async-command');

      expect(result.success).toBe(false);
      expect(result.error).toBe('error output');
      expect(result.output).toBe('partial stdout');
      expect(result.code).toBe(1);
      expect(manager.stats.totalExecutions).toBe(1);
      expect(manager.stats.failedExecutions).toBe(1);
      expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining('Ошибка выполнения асинхронной команды'));
      expect(mockConsole.handleError).toHaveBeenCalledWith(error, 'CommandExecutionError', { command: 'bad-async-command', type: 'async' });
    });

    test('should use custom cwd and env for asynchronous command', async () => {
      exec.mockImplementation((command, options, callback) => {
        callback(null, 'custom async output', '');
      });
      const customOptions = {
        cwd: '/custom/async/dir',
        env: { ASYNC_VAR: 'async_value' },
      };

      await manager.executeAsync('node custom-script.js', customOptions);

      expect(exec).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        cwd: '/custom/async/dir',
        env: expect.objectContaining({ ASYNC_VAR: 'async_value' }),
      }), expect.any(Function));
    });

    test('should handle exec error', async () => {
      const mockExec = jest.spyOn(require('child_process'), 'exec');
      const execError = new Error('Exec failed');
      mockExec.mockImplementation(() => {
        throw execError;
      });

      const result = await manager.executeAsync('error-command');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Exec failed');

      mockExec.mockRestore();
    });
  });

  describe('spawnProcess', () => {
    test('should spawn process successfully', () => {
      spawn.mockReturnValue({ pid: 123, kill: jest.fn(), on: jest.fn(), stdout: { on: jest.fn(), setEncoding: jest.fn() }, stderr: { on: jest.fn(), setEncoding: jest.fn() } });

      const processInfo = manager.spawnProcess('node', ['--version']);

      expect(spawn).toHaveBeenCalledWith('node', ['--version'], expect.objectContaining({
        cwd: process.cwd(),
        shell: manager.shell,
      }));
      expect(processInfo.pid).toBe(123);
      expect(manager.activeProcesses.size).toBe(1);
      expect(manager.stats.totalExecutions).toBe(1);
      expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining('Процесс запущен'));
    });

    test('should handle spawn failure', () => {
      spawn.mockImplementation(() => { throw new Error('Spawn failed'); });

      expect(() => manager.spawnProcess('invalid-command', [])).toThrow('Spawn failed');
      expect(manager.activeProcesses.size).toBe(0);
      expect(manager.stats.totalExecutions).toBe(1);
      expect(manager.stats.failedExecutions).toBe(1);
      expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining('Ошибка запуска процесса'));
    });

    test('should spawn with custom options', () => {
      spawn.mockReturnValue({ pid: 456, kill: jest.fn(), on: jest.fn(), stdout: { on: jest.fn(), setEncoding: jest.fn() }, stderr: { on: jest.fn(), setEncoding: jest.fn() } });
      const customOptions = {
        cwd: '/custom/spawn/dir',
        env: { SPAWN_VAR: 'spawn_value' },
        stdio: 'inherit',
      };

      manager.spawnProcess('npm', ['test'], customOptions);

      expect(spawn).toHaveBeenCalledWith('npm', ['test'], expect.objectContaining({
        cwd: '/custom/spawn/dir',
        env: expect.objectContaining({ SPAWN_VAR: 'spawn_value' }),
        stdio: 'inherit',
      }));
    });
  });

  describe('killProcess', () => {
    test('should kill process successfully', () => {
      const mockProcess = { pid: 123, kill: jest.fn().mockReturnValue(true) };
      manager.activeProcesses.set(123, {
        process: mockProcess,
        command: 'test',
        startTime: Date.now()
      });

      const result = manager.killProcess(123);

      expect(result).toBe(true);
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(manager.activeProcesses.size).toBe(0);
      expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining('Процесс успешно завершен'));
    });

    test('should handle kill failure', () => {
      const mockProcess = { pid: 123, kill: jest.fn().mockReturnValue(false) };
      manager.activeProcesses.set(123, {
        process: mockProcess,
        command: 'test',
        startTime: Date.now()
      });

      const result = manager.killProcess(123);

      expect(result).toBe(false);
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining('Не удалось завершить процесс'));
    });

    test('should handle non-existent process', () => {
      const result = manager.killProcess(999);

      expect(result).toBe(false);
      expect(mockConsole.warn).toHaveBeenCalledWith(expect.stringContaining('Процесс с PID 999 не найден'));
    });

    test('should kill process with custom signal', () => {
      const mockProcess = { pid: 123, kill: jest.fn().mockReturnValue(true) };
      manager.activeProcesses.set(123, {
        process: mockProcess,
        command: 'test',
        startTime: Date.now()
      });

      manager.killProcess(123, 'SIGKILL');

      expect(mockProcess.kill).toHaveBeenCalledWith('SIGKILL');
      expect(manager.activeProcesses.size).toBe(0);
    });
  });

  describe('getProcessInfo', () => {
    test('should get process information for an active process', () => {
      const pid = 123;
      const command = 'node test.js';
      const startTime = Date.now() - 5000;
      const mockProcess = { pid };
      manager.activeProcesses.set(pid, { process: mockProcess, command, startTime });

      const info = manager.getProcessInfo(pid);

      expect(info).toBeDefined();
      expect(info.pid).toBe(pid);
      expect(info.command).toBe(command);
      expect(info.uptime).toBeGreaterThanOrEqual(5000);
      expect(typeof info.uptime).toBe('number');
    });

    test('should return null for a non-existent process', () => {
      const info = manager.getProcessInfo(999);
      expect(info).toBeNull();
    });
  });

  describe('isProcessRunning', () => {
    test('should return true if process is active', () => {
      const pid = 123;
      const mockProcess = { pid, killed: false, connected: true };
      manager.activeProcesses.set(pid, { process: mockProcess, command: 'test', startTime: Date.now() });

      const isRunning = manager.isProcessRunning(pid);
      expect(isRunning).toBe(true);
    });

    test('should return false if process is killed', () => {
      const pid = 123;
      const mockProcess = { pid, killed: true, connected: false };
      manager.activeProcesses.set(pid, { process: mockProcess, command: 'test', startTime: Date.now() });

      const isRunning = manager.isProcessRunning(pid);
      expect(isRunning).toBe(false);
    });

    test('should return false for a non-existent process', () => {
      const isRunning = manager.isProcessRunning(999);
      expect(isRunning).toBe(false);
    });
  });

  describe('getActiveProcesses', () => {
    test('should return a list of PIDs for active processes', () => {
      manager.activeProcesses.set(123, { process: { pid: 123 }, command: 'cmd1' });
      manager.activeProcesses.set(456, { process: { pid: 456 }, command: 'cmd2' });

      const active = manager.getActiveProcesses();

      expect(active).toHaveLength(2);
      expect(active).toContain(123);
      expect(active).toContain(456);
    });

    test('should return an empty array when no processes are active', () => {
      const active = manager.getActiveProcesses();
      expect(active).toEqual([]);
    });
  });

  describe('getProcessHistory', () => {
    beforeEach(() => {
      jest.useFakeTimers(); // Ensure timers are faked for consistent history timestamps
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    test('should get process execution history correctly', () => {
      manager.processHistory = [
        { command: 'cmd1', success: true, duration: 100, timestamp: Date.now() - 300 },
        { command: 'cmd2', success: false, duration: 200, timestamp: Date.now() - 200 },
        { command: 'cmd3', success: true, duration: 150, timestamp: Date.now() - 100 }
      ];

      const history = manager.getProcessHistory();

      expect(history).toHaveLength(3);
      expect(history[0].command).toBe('cmd1');
      expect(history[1].command).toBe('cmd2');
      expect(history[2].command).toBe('cmd3');
    });

    test('should limit history size if more than maxHistorySize', () => {
      manager.maxHistorySize = 2;
      manager.processHistory = [
        { command: 'cmd1', timestamp: Date.now() - 300 },
        { command: 'cmd2', timestamp: Date.now() - 200 },
        { command: 'cmd3', timestamp: Date.now() - 100 }
      ];

      const history = manager.getProcessHistory();

      expect(history).toHaveLength(2);
      expect(history[0].command).toBe('cmd2');
      expect(history[1].command).toBe('cmd3');
    });

    test('should return limited history when requested with a limit parameter', () => {
      manager.processHistory = [
        { command: 'cmd1', timestamp: Date.now() - 300 },
        { command: 'cmd2', timestamp: Date.now() - 200 },
        { command: 'cmd3', timestamp: Date.now() - 100 }
      ];

      const history = manager.getProcessHistory(2);

      expect(history).toHaveLength(2);
      expect(history[0].command).toBe('cmd2');
      expect(history[1].command).toBe('cmd3');
    });

    test('should return all history if requested limit is greater than actual history size', () => {
      manager.processHistory = [
        { command: 'cmd1', timestamp: Date.now() - 200 },
        { command: 'cmd2', timestamp: Date.now() - 100 }
      ];

      const history = manager.getProcessHistory(5);

      expect(history).toHaveLength(2);
      expect(history[0].command).toBe('cmd1');
      expect(history[1].command).toBe('cmd2');
    });

    test('should handle empty history', () => {
      manager.processHistory = [];
      const history = manager.getProcessHistory();
      expect(history).toEqual([]);
    });
  });

  describe('getStats', () => {
    test('should get process management statistics correctly', () => {
      manager.stats = {
        totalExecutions: 10,
        successfulExecutions: 7,
        failedExecutions: 3,
        activeProcesses: 2
      };
      manager.activeProcesses.set(1, {});
      manager.activeProcesses.set(2, {});

      const stats = manager.getStats();

      expect(stats.totalExecutions).toBe(10);
      expect(stats.successfulExecutions).toBe(7);
      expect(stats.failedExecutions).toBe(3);
      expect(stats.activeProcesses).toBe(2);
      expect(stats.successRate).toBe('70.00%');
    });

    test('should calculate success rate with no executions', () => {
      const stats = manager.getStats();

      expect(stats.totalExecutions).toBe(0);
      expect(stats.successfulExecutions).toBe(0);
      expect(stats.failedExecutions).toBe(0);
      expect(stats.activeProcesses).toBe(0); // Should be 0 initially
      expect(stats.successRate).toBe('0.00%');
    });

    test('should update activeProcesses count in stats dynamically', () => {
      manager.activeProcesses.set(1, {});
      manager.activeProcesses.set(2, {});
      const stats = manager.getStats();
      expect(stats.activeProcesses).toBe(2);

      manager.activeProcesses.delete(1);
      const updatedStats = manager.getStats();
      expect(updatedStats.activeProcesses).toBe(1);
    });
  });

  describe('cleanup', () => {
    test('should cleanup all active processes successfully', () => {
      const mockProcess1 = { pid: 123, kill: jest.fn().mockReturnValue(true) };
      const mockProcess2 = { pid: 456, kill: jest.fn().mockReturnValue(true) };

      manager.activeProcesses.set(123, { process: mockProcess1, command: 'cmd1', startTime: Date.now() });
      manager.activeProcesses.set(456, { process: mockProcess2, command: 'cmd2', startTime: Date.now() });

      manager.cleanup();

      expect(mockProcess1.kill).toHaveBeenCalledWith('SIGTERM');
      expect(mockProcess2.kill).toHaveBeenCalledWith('SIGTERM');
      expect(manager.activeProcesses.size).toBe(0);
      expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining('Все активные процессы завершены'));
    });

    test('should handle cleanup errors when killing processes', () => {
      const mockProcess = { pid: 123, kill: jest.fn().mockImplementation(() => {
        throw new Error('Kill failed');
      }) };

      manager.activeProcesses.set(123, { process: mockProcess, command: 'cmd1', startTime: Date.now() });

      manager.cleanup();

      expect(mockProcess.kill).toHaveBeenCalled();
      expect(mockConsole.handleError).toHaveBeenCalledWith(expect.any(Error), 'ProcessCleanupError', { pid: 123, command: 'cmd1' });
      expect(manager.activeProcesses.size).toBe(0); // Should still clear the process from activeProcesses
    });

    test('should gracefully handle an empty list of active processes during cleanup', () => {
      expect(manager.activeProcesses.size).toBe(0);
      manager.cleanup();
      expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining('Нет активных процессов для завершения'));
      expect(manager.activeProcesses.size).toBe(0);
    });
  });

  describe('process monitoring', () => {
    test('should monitor process resources and return uptime', () => {
      const pid = 123;
      const command = 'node monitor.js';
      const startTime = Date.now() - 60000; // 1 minute ago
      const mockProcess = { pid };
      manager.activeProcesses.set(pid, { process: mockProcess, command, startTime });

      const info = manager.getProcessInfo(pid);

      expect(info.pid).toBe(pid);
      expect(info.command).toBe(command);
      expect(info.uptime).toBeGreaterThanOrEqual(60000);
      expect(typeof info.uptime).toBe('number');
    });

    test('should track process lifecycle and log events', () => {
      const pid = 123;
      const command = 'node lifecycle.js';
      const mockProcess = {
        pid: pid,
        on: jest.fn(),
        stdout: { on: jest.fn(), setEncoding: jest.fn() },
        stderr: { on: jest.fn(), setEncoding: jest.fn() }
      };

      spawn.mockReturnValue(mockProcess);

      manager.spawnProcess('node', ['lifecycle.js']);

      // Simulate process exit
      const exitCallback = mockProcess.on.mock.calls.find(call => call[0] === 'exit')[1];
      exitCallback(0); // successful exit

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining(`Процесс ${pid} завершен с кодом выхода 0`)
      );
      expect(manager.activeProcesses.has(pid)).toBe(false);
      expect(manager.processHistory).toHaveLength(1);
      expect(manager.processHistory[0].pid).toBe(pid);
      expect(manager.processHistory[0].success).toBe(true);
    });

    test('should log stdout and stderr from spawned processes', () => {
      const pid = 123;
      const mockProcess = {
        pid: pid,
        on: jest.fn(),
        stdout: { on: jest.fn(), setEncoding: jest.fn() },
        stderr: { on: jest.fn(), setEncoding: jest.fn() }
      };

      spawn.mockReturnValue(mockProcess);

      manager.spawnProcess('echo', ['hello']);

      const stdoutCallback = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];
      stdoutCallback('hello from stdout\n');

      const stderrCallback = mockProcess.stderr.on.mock.calls.find(call => call[0] === 'data')[1];
      stderrCallback('error from stderr\n');

      expect(mockConsole.info).toHaveBeenCalledWith(expect.stringContaining(`[PID ${pid}][STDOUT]`));
      expect(mockConsole.error).toHaveBeenCalledWith(expect.stringContaining(`[PID ${pid}][STDERR]`));
    });
  });

  describe('error handling and edge cases', () => {
    test('should handle malformed commands', () => {
      expect(() => manager.executeSync(null)).toThrow('Command must be a non-empty string');
      expect(() => manager.executeSync('')).toThrow('Command must be a non-empty string');
      expect(() => manager.spawnProcess('', [])).toThrow('Command must be a non-empty string');
    });

    test('should handle invalid process IDs', () => {
      expect(manager.killProcess(-1)).toBe(false);
      expect(manager.killProcess(0)).toBe(false);
      expect(manager.killProcess(null)).toBe(false);
      expect(manager.getProcessInfo('invalid')).toBeNull();
    });

    test('should handle concurrent process operations', async () => {
      const execSyncMock = jest.spyOn(require('child_process'), 'execSync');
      execSyncMock.mockImplementation((cmd) => `output for ${cmd}`);

      const promises = [];

      for (let i = 0; i < 5; i++) {
        promises.push(manager.executeSync(`echo "test${i}"`));
      }

      const results = await Promise.all(promises);

      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.output).toBe(`output for echo "test${index}"`);
      });

      expect(manager.stats.totalExecutions).toBe(5);
      expect(manager.stats.successfulExecutions).toBe(5);
      execSyncMock.mockRestore();
    });

    test('should handle process tree operations (basic parent-child tracking)', () => {
      const parentPid = 100;
      const childPid = 101;
      const grandChildPid = 102;

      const parentProcess = { pid: parentPid, kill: jest.fn(), on: jest.fn() };
      const childProcess = { pid: childPid, kill: jest.fn(), on: jest.fn() };
      const grandChildProcess = { pid: grandChildPid, kill: jest.fn(), on: jest.fn() };

      spawn.mockReturnValueOnce(parentProcess)
           .mockReturnValueOnce(childProcess)
           .mockReturnValueOnce(grandChildProcess);

      manager.spawnProcess('parent.js', [], { pid: parentPid }); // Simulate attaching child to parent
      manager.spawnProcess('child.js', [], { parentPid: parentPid, pid: childPid });
      manager.spawnProcess('grandchild.js', [], { parentPid: childPid, pid: grandChildPid });

      // Verify initial state
      expect(manager.activeProcesses.size).toBe(3);
      expect(manager.getProcessInfo(parentPid).children).toEqual([childPid]);
      expect(manager.getProcessInfo(childPid).parent).toBe(parentPid);
      expect(manager.getProcessInfo(childPid).children).toEqual([grandChildPid]);
      expect(manager.getProcessInfo(grandChildPid).parent).toBe(childPid);

      // Kill parent process - should not automatically kill children without explicit logic
      manager.killProcess(parentPid);
      expect(parentProcess.kill).toHaveBeenCalled();
      expect(manager.activeProcesses.has(parentPid)).toBe(false);
      expect(manager.activeProcesses.has(childPid)).toBe(true);
      expect(manager.activeProcesses.has(grandChildPid)).toBe(true);
      expect(manager.getProcessInfo(childPid).parent).toBeNull(); // Parent is gone, child is orphaned
    });

    test('should handle large command outputs without truncation', () => {
      const largeOutput = 'a'.repeat(1024 * 1024); // 1MB output
      execSync.mockReturnValue(largeOutput);

      const result = manager.executeSync('large-output-command');

      expect(result.success).toBe(true);
      expect(result.output.length).toBe(largeOutput.length);
      expect(result.output).toBe(largeOutput);
    });

    test('should handle rapid process start/stop cycles without issues', () => {
      const spawnMock = jest.spyOn(require('child_process'), 'spawn');
      const killMock = jest.spyOn(process, 'kill');
      spawnMock.mockImplementation(() => {
        const mockProcess = { pid: Math.floor(Math.random() * 1000) + 1, kill: jest.fn(), on: jest.fn(), stdout: { on: jest.fn(), setEncoding: jest.fn() }, stderr: { on: jest.fn(), setEncoding: jest.fn() } };
        // Automatically complete the process for rapid cycling
        process.nextTick(() => mockProcess.on.mock.calls.find(call => call[0] === 'exit')[1](0));
        return mockProcess;
      });

      for (let i = 0; i < 10; i++) {
        const processInfo = manager.spawnProcess('test', []);
        jest.runAllTimers(); // Advance timers for exit event to fire
        // The process should automatically be removed from activeProcesses upon exit
      }

      expect(manager.activeProcesses.size).toBe(0);
      expect(manager.stats.totalExecutions).toBe(10);
      expect(manager.stats.successfulExecutions).toBe(10);
      expect(mockConsole.warn).not.toHaveBeenCalled(); // No warnings about failed kills, etc.

      spawnMock.mockRestore();
      killMock.mockRestore();
    });

    test('should handle memory pressure by limiting history size', () => {
      // Reset history and stats for this specific test
      manager.processHistory = [];
      manager.stats = {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        activeProcesses: 0,
      };

      const initialMemory = process.memoryUsage().heapUsed;
      manager.maxHistorySize = 100;

      for (let i = 0; i < 1000; i++) {
        manager.processHistory.push({
          command: `cmd${i}`,
          success: true,
          duration: 100,
          timestamp: Date.now()
        });
        // Simulate an execution to update stats
        manager.stats.totalExecutions++;
        manager.stats.successfulExecutions++;
      }

      manager.getProcessHistory(); // This call should trigger history trimming if implemented

      expect(manager.processHistory.length).toBe(manager.maxHistorySize);
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Expect memory increase to be within a reasonable bound (e.g., less than 5MB for 100 items vs 1000 items)
      // This is a heuristic check, exact numbers can vary
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
    });

    test('should handle encoding issues gracefully', () => {
      const unicodeOutput = '你好世界'; // Chinese for "Hello World"
      execSync.mockReturnValue(Buffer.from(unicodeOutput, 'utf16le')); // Simulate UTF-16LE output

      const result = manager.executeSync('echo unicode');

      expect(result.success).toBe(true);
      expect(result.output).toBe(unicodeOutput);
    });
  });

  describe('cross-platform compatibility', () => {
    test('should handle Windows commands correctly', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      manager.shell = 'cmd.exe';
      execSync.mockReturnValue('Windows dir output');

      const result = manager.executeSync('dir');

      expect(execSync).toHaveBeenCalledWith('dir', expect.objectContaining({
        shell: 'cmd.exe',
      }));
      expect(result.success).toBe(true);
      expect(result.output).toBe('Windows dir output');
    });

    test('should handle Unix commands correctly', () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      manager.shell = '/bin/sh'; // Set explicit shell for Linux
      execSync.mockReturnValue('Unix ls output');

      const result = manager.executeSync('ls -la');

      expect(execSync).toHaveBeenCalledWith('ls -la', expect.objectContaining({
        shell: '/bin/sh',
      }));
      expect(result.success).toBe(true);
      expect(result.output).toBe('Unix ls output');
    });

    test('should detect shell correctly based on platform and environment', () => {
      const originalComSpec = process.env.ComSpec;

      // Test Windows shell detection
      Object.defineProperty(process, 'platform', { value: 'win32' });
      process.env.ComSpec = 'C:\\Windows\\System32\\cmd.exe';
      let windowsManager = new ProcessManagementUtils();
      expect(windowsManager.shell).toBe('C:\\Windows\\System32\\cmd.exe');

      // Test Unix-like shell detection (no ComSpec)
      Object.defineProperty(process, 'platform', { value: 'linux' });
      delete process.env.ComSpec;
      let unixManager = new ProcessManagementUtils();
      expect(unixManager.shell).toMatch(/(bash|zsh|sh)$/); // Expect a common Unix shell

      process.env.ComSpec = originalComSpec;
    });
  });

  describe('integration with process history', () => {
    beforeEach(() => {
      manager.processHistory = []; // Clear history for each test
      manager.stats = {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        activeProcesses: 0,
      };
    });

    test('should maintain comprehensive process history for sync executions', () => {
      execSync.mockReturnValue('output');

      manager.executeSync('cmd1');
      manager.executeSync('cmd2');
      manager.executeSync('cmd3');

      const history = manager.getProcessHistory();

      expect(history).toHaveLength(3);
      history.forEach(entry => {
        expect(entry).toHaveProperty('command');
        expect(entry).toHaveProperty('success');
        expect(entry).toHaveProperty('timestamp');
        expect(entry).toHaveProperty('duration');
        expect(entry.success).toBe(true);
      });
    });

    test('should maintain comprehensive process history for async executions', async () => {
      exec.mockImplementation((command, options, callback) => {
        callback(null, 'async output', '');
      });

      await manager.executeAsync('async-cmd1');
      await manager.executeAsync('async-cmd2');

      const history = manager.getProcessHistory();

      expect(history).toHaveLength(2);
      history.forEach(entry => {
        expect(entry).toHaveProperty('command');
        expect(entry).toHaveProperty('success');
        expect(entry).toHaveProperty('timestamp');
        expect(entry).toHaveProperty('duration');
        expect(entry.success).toBe(true);
      });
    });

    test('should include process metadata in history for spawned processes', () => {
      const pid = 123;
      const command = 'test-cmd';
      const args = ['arg1'];
      const startTime = Date.now();
      const mockSpawnProcess = { pid, on: jest.fn(), stdout: { on: jest.fn() }, stderr: { on: jest.fn() } };
      spawn.mockReturnValue(mockSpawnProcess);

      manager.spawnProcess(command, args);

      expect(manager.activeProcesses.size).toBe(1);
      const info = manager.getProcessInfo(pid);

      expect(info.pid).toBe(pid);
      expect(info.command).toBe(`${command} ${args.join(' ')}`);
      expect(info.startTime).toBe(startTime);
      expect(info.uptime).toBeDefined();

      // Simulate process exit to add to history
      const exitCallback = mockSpawnProcess.on.mock.calls.find(call => call[0] === 'exit')[1];
      exitCallback(0);

      const history = manager.getProcessHistory();
      expect(history).toHaveLength(1);
      expect(history[0].command).toBe(`${command} ${args.join(' ')}`);
      expect(history[0].pid).toBe(pid);
      expect(history[0].success).toBe(true);
      expect(history[0].duration).toBeGreaterThanOrEqual(0);
    });
  });
});
