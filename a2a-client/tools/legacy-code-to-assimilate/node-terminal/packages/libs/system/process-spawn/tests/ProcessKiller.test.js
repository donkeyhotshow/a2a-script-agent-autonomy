const { ProcessKiller } = require('../ProcessKiller');
const { KILL_TYPES, RESOURCE_LIMITS } = require('../types/SpawnTypes');
const { spawn } = require('child_process');
const { LoggingUtils } = require('@libs/logging-monitoring/logging');
const FileSystemUtils = require('@libs/system/file-operations');
const path = require('path');
const fs = require('fs'); // Import fs directly

// Mock timers
jest.useFakeTimers();

// Mock dependencies
const mockLoggerInstance = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

const mockFileSystemUtilsInstance = {
  join: jest.fn((...args) => path.join(...args)),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  existsSync: jest.fn(),
  ensureDir: jest.fn().mockResolvedValue(undefined),
  exists: jest.fn().mockResolvedValue(false),
};

jest.mock('@libs/logging-monitoring/logging', () => ({
  LoggingUtils: jest.fn(() => mockLoggerInstance)
}));

jest.mock('@libs/system/file-operations', () => jest.fn(() => mockFileSystemUtilsInstance));

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

describe('ProcessKiller', () => {
  let killer;
  let mockKill;

  beforeEach(() => {
    jest.clearAllMocks();
    killer = new ProcessKiller(undefined, mockLoggerInstance, mockFileSystemUtilsInstance);

    // Mock process.kill (Node.js built-in)
    mockKill = jest.spyOn(process, 'kill').mockReturnValue(true);

    // Mock a specific spawn for taskkill/pstree
    spawn.mockImplementation(() => {
      const mockChild = {
        stdout: { on: jest.fn(), read: jest.fn(() => '1234\n5678') },
        stderr: { on: jest.fn(), read: jest.fn() },
        on: jest.fn(),
        unref: jest.fn(),
        pid: 9999, // Mock PID for spawned process
      };
      // Simulate process exit after a short delay
      setTimeout(() => {
        mockChild.on.mock.calls.forEach(call => {
          if (call[0] === 'close') call[1](0); // Exit code 0 for success
        });
      }, 100);
      return mockChild;
    });
  });

  afterEach(() => {
    mockKill.mockRestore();
  });

  describe('constructor', () => {
    test('should initialize with default options', () => {
      expect(killer.gracefulTimeout).toBe(RESOURCE_LIMITS.GRACEFUL_TIMEOUT_MS);
      expect(killer.forceTimeout).toBe(5000);
      expect(killer.logFile).toBe('C:/apps/logs/process-killer.json');
      expect(killer.killHistory).toEqual([]);
      expect(killer.logger).toBe(mockLoggerInstance);
      expect(killer.fileSystem).toBe(mockFileSystemUtilsInstance);
    });

    test('should initialize with custom options', () => {
      const customOptions = {
        gracefulTimeout: 20000,
        forceTimeout: 10000,
        logFile: './custom-killer.log',
      };
      const customKiller = new ProcessKiller(customOptions, mockLoggerInstance, mockFileSystemUtilsInstance);
      expect(customKiller.gracefulTimeout).toBe(customOptions.gracefulTimeout);
      expect(customKiller.forceTimeout).toBe(customOptions.forceTimeout);
      expect(customKiller.logFile).toBe(customOptions.logFile);
    });
  });

  describe('isProcessAlive', () => {
    test('should return true if process is alive', async () => {
      // Mock process.kill to throw an error for non-existent PID, but not for existent one
      mockKill.mockImplementation((pid, signal) => {
        if (pid === 1234 && signal === 0) return true; // Test if process exists
        throw new Error('ESRCH'); // Simulate process not found for other PIDs
      });

      const isAlive = await killer.isProcessAlive(1234);
      expect(isAlive).toBe(true);
    });

    test('should return false if process is not alive', async () => {
      mockKill.mockImplementation((pid, signal) => {
        throw new Error('ESRCH'); // Simulate process not found
      });

      const isAlive = await killer.isProcessAlive(9999);
      expect(isAlive).toBe(false);
    });

    test('should handle other errors during process check', async () => {
      mockKill.mockImplementation((pid, signal) => {
        throw new Error('EPERM'); // Simulate permission error
      });

      const isAlive = await killer.isProcessAlive(1234);
      expect(isAlive).toBe(false);
    });
  });

  describe('sendSignal', () => {
    test('should send signal successfully', async () => {
      mockKill.mockReturnValue(true);
      const result = await killer.sendSignal(1234, 'SIGTERM');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Сигнал SIGTERM отправлен процессу 1234');
      expect(mockKill).toHaveBeenCalledWith(1234, 'SIGTERM');
    });

    test('should return false if sending signal fails', async () => {
      mockKill.mockImplementation(() => { throw new Error('ESRCH'); });
      const result = await killer.sendSignal(9999, 'SIGTERM');
      expect(result.success).toBe(false);
      expect(result.message).toContain('Ошибка отправки сигнала');
    });
  });

  describe('waitForProcessEnd', () => {
    jest.useFakeTimers();

    test('should return true if process ends within timeout', async () => {
      // Simulate process dying after 50ms
      const processDiePromise = new Promise(resolve => setTimeout(resolve, 50));
      mockKill.mockImplementation(async (pid, signal) => {
        if (signal === 0) {
          await processDiePromise;
          throw new Error('ESRCH'); // Process is dead
        }
        return true;
      });

      const waitPromise = killer.waitForProcessEnd(1234, 100);
      jest.advanceTimersByTime(60);
      const result = await waitPromise;

      expect(result.success).toBe(true);
      expect(result.message).toBe('Процесс 1234 завершился');
      expect(result.duration).toBeGreaterThanOrEqual(50);
      expect(result.duration).toBeLessThan(100);
    });

    test('should return false if process does not end within timeout', async () => {
      // Simulate process never dying
      mockKill.mockImplementation((pid, signal) => {
        if (signal === 0) return true; // Process is always alive
        return true;
      });

      const waitPromise = killer.waitForProcessEnd(1234, 100);
      jest.advanceTimersByTime(110);
      const result = await waitPromise;

      expect(result.success).toBe(false);
      expect(result.message).toBe('Таймаут ожидания завершения процесса 1234');
      expect(result.duration).toBe(100);
    });

    test('should handle immediate process end', async () => {
      // Simulate process already dead
      mockKill.mockImplementation((pid, signal) => {
        if (signal === 0) throw new Error('ESRCH'); // Process is dead
        return true;
      });

      const waitPromise = killer.waitForProcessEnd(1234, 100);
      const result = await waitPromise;

      expect(result.success).toBe(true);
      expect(result.message).toBe('Процесс 1234 завершился');
      expect(result.duration).toBeLessThan(10);
    });

    test('should handle negative timeout', async () => {
      const result = await killer.waitForProcessEnd(1234, -10);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Процесс 1234 завершился'); // It should immediately check and find it dead
    });
  });

  describe('logKillAttempt', () => {
    test('should log kill attempt to file and history', async () => {
      const killInfo = {
        pid: 1234,
        reason: 'test',
        steps: [{ step: 'initial', result: 'success' }],
      };

      mockFileSystemUtilsInstance.writeFile.mockResolvedValue(true);
      mockFileSystemUtilsInstance.exists.mockResolvedValue(true); // Changed from existsSync
      mockFileSystemUtilsInstance.readFile.mockResolvedValue('[]');

      await killer.logKillAttempt(killInfo);

      expect(killer.killHistory).toHaveLength(1);
      expect(killer.killHistory[0]).toEqual(expect.objectContaining(killInfo));
      expect(mockFileSystemUtilsInstance.writeFile).toHaveBeenCalledWith(
        killer.logFile,
        JSON.stringify([killInfo], null, 2)
      );
    });

    test('should handle existing log file content', async () => {
      const existingKillInfo = { pid: 5678, reason: 'old' };
      const newKillInfo = { pid: 1234, reason: 'new' };

      mockFileSystemUtilsInstance.exists.mockResolvedValue(true); // Changed from existsSync
      mockFileSystemUtilsInstance.readFile.mockResolvedValue(JSON.stringify([existingKillInfo]));
      mockFileSystemUtilsInstance.writeFile.mockResolvedValue(true);

      await killer.logKillAttempt(newKillInfo);

      expect(killer.killHistory).toHaveLength(2);
      expect(killer.killHistory[1]).toEqual(expect.objectContaining(newKillInfo));
      expect(mockFileSystemUtilsInstance.writeFile).toHaveBeenCalledWith(
        killer.logFile,
        JSON.stringify([existingKillInfo, newKillInfo], null, 2)
      );
    });

    test('should cap kill history to 100 entries', async () => {
      // Fill history with 100 entries
      for (let i = 0; i < 100; i++) {
        killer.killHistory.push({ pid: i, reason: `test-${i}` });
      }

      const newKillInfo = { pid: 9999, reason: 'new' };

      mockFileSystemUtilsInstance.exists.mockResolvedValue(true); // Changed from existsSync
      mockFileSystemUtilsInstance.readFile.mockResolvedValue(JSON.stringify(killer.killHistory));
      mockFileSystemUtilsInstance.writeFile.mockResolvedValue(true);

      await killer.logKillAttempt(newKillInfo);

      expect(killer.killHistory).toHaveLength(100);
      expect(killer.killHistory[0].pid).toBe(1);
      expect(killer.killHistory[99].pid).toBe(9999);
    });
  });

  describe('killProcessTree (Windows specific)', () => {
    test('should kill process tree using tasklist and taskkill', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' }); // Simulate Windows

      // Mock spawn for tasklist
      spawn.mockImplementationOnce(() => {
        const mockChild = {
          stdout: { on: jest.fn(), read: jest.fn(() => '\n  Image Name    PID   Session Name  Session#  Mem Usage\n============== ===== ============ ========= ==========\n  process.exe   1000  Console          1    12,345 K\n  child1.exe    1001  Console          1    2,345 K\n  child2.exe    1002  Console          1    1,345 K\n\n') },
          stderr: { on: jest.fn() },
          on: jest.fn((event, cb) => { if (event === 'close') cb(0); }),
          unref: jest.fn(),
        };
        return mockChild;
      });

      // Mock spawn for each taskkill (parent + children)
      spawn.mockImplementation(() => {
        const mockChild = {
          stdout: { on: jest.fn(), read: jest.fn() },
          stderr: { on: jest.fn() },
          on: jest.fn((event, cb) => { if (event === 'close') cb(0); }),
          unref: jest.fn(),
        };
        return mockChild;
      });

      const result = await killer.killProcessTree(1000);

      expect(result.success).toBe(true);
      expect(result.killedProcesses).toEqual([1001, 1002, 1000]); // Children + Parent
      expect(spawn).toHaveBeenCalledTimes(4); // tasklist + 3 taskkill calls
    });

    test('should handle non-windows platform', async () => {
      Object.defineProperty(process, 'platform', { value: 'linux' }); // Simulate Linux

      const result = await killer.killProcessTree(1234);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Kill process tree is only supported on Windows');
      expect(spawn).not.toHaveBeenCalled();
    });

    test('should gracefully handle tasklist failure', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });

      spawn.mockImplementationOnce(() => {
        const mockChild = {
          stdout: { on: jest.fn(), read: jest.fn() },
          stderr: { on: jest.fn() },
          on: jest.fn((event, cb) => { if (event === 'close') cb(1); }), // Simulate failure
          unref: jest.fn(),
        };
        return mockChild;
      });

      const result = await killer.killProcessTree(1234);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Ошибка получения списка процессов');
      expect(spawn).toHaveBeenCalledTimes(1); // Only tasklist
    });
  });

  describe('taskKill (Windows specific)', () => {
    test('should execute taskkill successfully', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });

      // Mock spawn for taskkill
      spawn.mockImplementationOnce(() => {
        const mockChild = {
          stdout: { on: jest.fn(), read: jest.fn() },
          stderr: { on: jest.fn() },
          on: jest.fn((event, cb) => { if (event === 'close') cb(0); }),
          unref: jest.fn(),
        };
        return mockChild;
      });

      const result = await killer.taskKill(1234);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Процесс 1234 завершен через taskkill');
      expect(spawn).toHaveBeenCalledWith('taskkill', ['/PID', '1234'], expect.any(Object));
    });

    test('should return false if taskkill fails', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });

      spawn.mockImplementationOnce(() => {
        const mockChild = {
          stdout: { on: jest.fn(), read: jest.fn() },
          stderr: { on: jest.fn() },
          on: jest.fn((event, cb) => { if (event === 'close') cb(1); }), // Simulate failure
          unref: jest.fn(),
        };
        return mockChild;
      });

      const result = await killer.taskKill(1234);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Ошибка taskkill для PID 1234');
    });

    test('should handle non-windows platform', async () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });

      const result = await killer.taskKill(1234);
      expect(result.success).toBe(false);
      expect(result.message).toBe('taskkill is only supported on Windows');
      expect(spawn).not.toHaveBeenCalled();
    });
  });

  describe('taskKillForce (Windows specific)', () => {
    test('should execute taskkill /F successfully', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });

      spawn.mockImplementationOnce(() => {
        const mockChild = {
          stdout: { on: jest.fn(), read: jest.fn() },
          stderr: { on: jest.fn() },
          on: jest.fn((event, cb) => { if (event === 'close') cb(0); }),
          unref: jest.fn(),
        };
        return mockChild;
      });

      const result = await killer.taskKillForce(1234);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Процесс 1234 принудительно завершен через taskkill /F');
      expect(spawn).toHaveBeenCalledWith('taskkill', ['/F', '/PID', '1234'], expect.any(Object));
    });

    test('should return false if taskkill /F fails', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });

      spawn.mockImplementationOnce(() => {
        const mockChild = {
          stdout: { on: jest.fn(), read: jest.fn() },
          stderr: { on: jest.fn() },
          on: jest.fn((event, cb) => { if (event === 'close') cb(1); }), // Simulate failure
          unref: jest.fn(),
        };
        return mockChild;
      });

      const result = await killer.taskKillForce(1234);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Ошибка taskkill /F для PID 1234');
    });

    test('should handle non-windows platform', async () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });

      const result = await killer.taskKillForce(1234);
      expect(result.success).toBe(false);
      expect(result.message).toBe('taskkill /F is only supported on Windows');
      expect(spawn).not.toHaveBeenCalled();
    });
  });

  describe('gracefulKill', () => {
    jest.useFakeTimers();

    test('should gracefully kill process', async () => {
      const pid = 100;
      const killInfo = { pid, steps: [] };

      jest.spyOn(killer, 'sendSignal').mockResolvedValue({ success: true, message: 'SIGTERM sent' });
      jest.spyOn(killer, 'waitForProcessEnd').mockResolvedValue({ success: true, duration: 50, message: 'Process ended' });

      const result = await killer.gracefulKill(pid, killInfo);

      expect(result.success).toBe(true);
      expect(result.reason).toBe('graceful_completed');
      expect(killer.sendSignal).toHaveBeenCalledWith(pid, 'SIGTERM');
      expect(killer.waitForProcessEnd).toHaveBeenCalledWith(pid, killer.gracefulTimeout);
      expect(mockLoggerInstance.log).toHaveBeenCalledWith(expect.stringContaining('Graceful shutdown процесса 100'));
    });

    test('should fail if SIGTERM cannot be sent', async () => {
      const pid = 100;
      const killInfo = { pid, steps: [] };

      jest.spyOn(killer, 'sendSignal').mockResolvedValue({ success: false, message: 'SIGTERM failed' });
      jest.spyOn(killer, 'waitForProcessEnd').mockResolvedValue({ success: true, duration: 50 });

      const result = await killer.gracefulKill(pid, killInfo);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('sigterm_failed');
    });

    test('should fail if process does not end within timeout', async () => {
      const pid = 100;
      const killInfo = { pid, steps: [] };

      jest.spyOn(killer, 'sendSignal').mockResolvedValue({ success: true, message: 'SIGTERM sent' });
      jest.spyOn(killer, 'waitForProcessEnd').mockResolvedValue({ success: false, duration: 100 });

      const result = await killer.gracefulKill(pid, killInfo);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('graceful_timeout');
    });

    test('should handle errors during graceful kill', async () => {
      const pid = 100;
      const killInfo = { pid, steps: [] };

      jest.spyOn(killer, 'sendSignal').mockRejectedValue(new Error('Internal error'));

      const result = await killer.gracefulKill(pid, killInfo);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('graceful_error');
      expect(result.error).toBe('Internal error');
    });
  });

  describe('forceKill', () => {
    jest.useFakeTimers();

    test('should force kill process using tree kill and wait', async () => {
      const pid = 100;
      const killInfo = { pid, steps: [] };

      jest.spyOn(killer, 'killProcessTree').mockResolvedValue({ success: true, killedProcesses: [100, 101], message: 'Tree killed' });
      jest.spyOn(killer, 'waitForProcessEnd').mockResolvedValue({ success: true, duration: 50, message: 'Process ended' });
      jest.spyOn(killer, 'taskKill').mockResolvedValue({ success: false }); // Should not be called if tree kill succeeds

      const result = await killer.forceKill(pid, killInfo);

      expect(result.success).toBe(true);
      expect(result.reason).toBe('force_completed');
      expect(result.killedProcesses).toEqual([100, 101]);
      expect(killer.killProcessTree).toHaveBeenCalledWith(pid);
      expect(killer.waitForProcessEnd).toHaveBeenCalledWith(pid, killer.forceTimeout);
      expect(killer.taskKill).not.toHaveBeenCalled();
      expect(mockLoggerInstance.log).toHaveBeenCalledWith(expect.stringContaining('Принудительное завершение процесса 100'));
    });

    test('should fallback to taskkill if tree kill fails', async () => {
      const pid = 100;
      const killInfo = { pid, steps: [] };

      jest.spyOn(killer, 'killProcessTree').mockResolvedValue({ success: false, message: 'Tree kill failed' });
      jest.spyOn(killer, 'waitForProcessEnd').mockResolvedValue({ success: false }); // Won't be called after tree kill fails
      jest.spyOn(killer, 'taskKill').mockResolvedValue({ success: true, message: 'Taskkill succeeded' });

      const result = await killer.forceKill(pid, killInfo);

      expect(result.success).toBe(true);
      expect(result.reason).toBe('taskkill_completed');
      expect(killer.killProcessTree).toHaveBeenCalledWith(pid);
      expect(killer.taskKill).toHaveBeenCalledWith(pid);
    });

    test('should fail if both tree kill and taskkill fail', async () => {
      const pid = 100;
      const killInfo = { pid, steps: [] };

      jest.spyOn(killer, 'killProcessTree').mockResolvedValue({ success: false });
      jest.spyOn(killer, 'taskKill').mockResolvedValue({ success: false });

      const result = await killer.forceKill(pid, killInfo);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('force_failed');
    });

    test('should handle errors during force kill', async () => {
      const pid = 100;
      const killInfo = { pid, steps: [] };

      jest.spyOn(killer, 'killProcessTree').mockRejectedValue(new Error('Internal error'));

      await expect(killer.forceKill(pid, killInfo)).rejects.toThrow('Internal error');
      expect(killInfo.steps.some(step => step.step === 'force_error')).toBe(true);
    });
  });

  describe('immediateKill', () => {
    jest.useFakeTimers();

    test('should immediately kill process using SIGKILL and wait', async () => {
      const pid = 100;
      const killInfo = { pid, steps: [] };

      jest.spyOn(killer, 'sendSignal').mockResolvedValue({ success: true, message: 'SIGKILL sent' });
      jest.spyOn(killer, 'waitForProcessEnd').mockResolvedValue({ success: true, duration: 50, message: 'Process ended' });
      jest.spyOn(killer, 'taskKillForce').mockResolvedValue({ success: false }); // Should not be called

      const result = await killer.immediateKill(pid, killInfo);

      expect(result.success).toBe(true);
      expect(result.reason).toBe('immediate_completed');
      expect(killer.sendSignal).toHaveBeenCalledWith(pid, 'SIGKILL');
      expect(killer.waitForProcessEnd).toHaveBeenCalledWith(pid, 2000);
      expect(killer.taskKillForce).not.toHaveBeenCalled();
      expect(mockLoggerInstance.log).toHaveBeenCalledWith(expect.stringContaining('Немедленное завершение процесса 100'));
    });

    test('should fallback to taskkill /F if SIGKILL fails', async () => {
      const pid = 100;
      const killInfo = { pid, steps: [] };

      jest.spyOn(killer, 'sendSignal').mockResolvedValue({ success: false, message: 'SIGKILL failed' });
      jest.spyOn(killer, 'waitForProcessEnd').mockResolvedValue({ success: false }); // Won't be called
      jest.spyOn(killer, 'taskKillForce').mockResolvedValue({ success: true, message: 'Taskkill force succeeded' });

      const result = await killer.immediateKill(pid, killInfo);

      expect(result.success).toBe(true);
      expect(result.reason).toBe('taskkill_force_completed');
      expect(killer.sendSignal).toHaveBeenCalledWith(pid, 'SIGKILL');
      expect(killer.taskKillForce).toHaveBeenCalledWith(pid);
    });

    test('should fail if both SIGKILL and taskkill /F fail', async () => {
      const pid = 100;
      const killInfo = { pid, steps: [] };

      jest.spyOn(killer, 'sendSignal').mockResolvedValue({ success: false });
      jest.spyOn(killer, 'taskKillForce').mockResolvedValue({ success: false });

      const result = await killer.immediateKill(pid, killInfo);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('immediate_failed');
    });

    test('should handle errors during immediate kill', async () => {
      const pid = 100;
      const killInfo = { pid, steps: [] };

      jest.spyOn(killer, 'sendSignal').mockRejectedValue(new Error('Internal error'));

      await expect(killer.immediateKill(pid, killInfo)).rejects.toThrow('Internal error');
      expect(killInfo.steps.some(step => step.step === 'error')).toBe(true);
    });
  });

  describe('killProcess', () => {
    jest.useFakeTimers();

    test('should handle graceful kill type', async () => {
      const pid = 100;
      jest.spyOn(killer, 'isProcessAlive').mockResolvedValue(true);
      jest.spyOn(killer, 'gracefulKill').mockResolvedValue({ success: true, reason: 'graceful_completed' });
      jest.spyOn(killer, 'forceKill').mockResolvedValue({ success: false });

      const result = await killer.killProcess(pid, { killType: KILL_TYPES.GRACEFUL });

      expect(result.success).toBe(true);
      expect(result.reason).toBe('graceful_completed');
      expect(killer.isProcessAlive).toHaveBeenCalledWith(pid);
      expect(killer.gracefulKill).toHaveBeenCalledWith(pid, expect.any(Object));
      expect(killer.forceKill).not.toHaveBeenCalled();
      expect(mockLoggerInstance.log).toHaveBeenCalledWith(expect.stringContaining('Начинаем завершение процесса'));
    });

    test('should fallback from graceful to force if graceful fails', async () => {
      const pid = 100;
      jest.spyOn(killer, 'isProcessAlive').mockResolvedValue(true);
      jest.spyOn(killer, 'gracefulKill').mockResolvedValue({ success: false, reason: 'graceful_timeout' });
      jest.spyOn(killer, 'forceKill').mockResolvedValue({ success: true, reason: 'force_completed' });

      const result = await killer.killProcess(pid, { killType: KILL_TYPES.GRACEFUL });

      expect(result.success).toBe(true);
      expect(result.reason).toBe('force_completed');
      expect(killer.gracefulKill).toHaveBeenCalledWith(pid, expect.objectContaining({ killType: KILL_TYPES.GRACEFUL }));
      expect(killer.forceKill).toHaveBeenCalledWith(pid, expect.objectContaining({ killType: KILL_TYPES.FORCE }));
    });

    test('should handle force kill type', async () => {
      const pid = 100;
      jest.spyOn(killer, 'isProcessAlive').mockResolvedValue(true);
      jest.spyOn(killer, 'forceKill').mockResolvedValue({ success: true, reason: 'force_completed' });
      jest.spyOn(killer, 'immediateKill').mockResolvedValue({ success: false });

      const result = await killer.killProcess(pid, { killType: KILL_TYPES.FORCE });

      expect(result.success).toBe(true);
      expect(result.reason).toBe('force_completed');
      expect(killer.isProcessAlive).toHaveBeenCalledWith(pid);
      expect(killer.forceKill).toHaveBeenCalledWith(pid, expect.any(Object));
      expect(killer.immediateKill).not.toHaveBeenCalled();
    });

    test('should handle immediate kill type', async () => {
      const pid = 100;
      jest.spyOn(killer, 'isProcessAlive').mockResolvedValue(true);
      jest.spyOn(killer, 'immediateKill').mockResolvedValue({ success: true, reason: 'immediate_completed' });

      const result = await killer.killProcess(pid, { killType: KILL_TYPES.IMMEDIATE });

      expect(result.success).toBe(true);
      expect(result.reason).toBe('immediate_completed');
      expect(killer.isProcessAlive).toHaveBeenCalledWith(pid);
      expect(killer.immediateKill).toHaveBeenCalledWith(pid, expect.any(Object));
    });

    test('should handle process not found', async () => {
      const pid = 100;
      jest.spyOn(killer, 'isProcessAlive').mockResolvedValue(false);

      const result = await killer.killProcess(pid, { killType: KILL_TYPES.GRACEFUL });

      expect(result.success).toBe(true);
      expect(result.reason).toBe('process_not_found');
      expect(killer.isProcessAlive).toHaveBeenCalledWith(pid);
      expect(mockLoggerInstance.log).toHaveBeenCalledWith(expect.stringContaining('Начинаем завершение процесса'));
    });

    test('should handle errors during killProcess', async () => {
      const pid = 100;
      jest.spyOn(killer, 'isProcessAlive').mockRejectedValue(new Error('Initial check error'));

      await expect(killer.killProcess(pid, { killType: KILL_TYPES.GRACEFUL })).rejects.toThrow('Initial check error');
      // Expect error logging in killInfo
      expect(killer.killHistory[0].steps.some(step => step.step === 'error')).toBe(true);
    });
  });
});
