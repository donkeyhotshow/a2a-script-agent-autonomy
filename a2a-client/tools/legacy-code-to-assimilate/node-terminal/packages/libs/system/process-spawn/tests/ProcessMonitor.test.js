const { ProcessMonitor } = require('../ProcessMonitor');
const { RESOURCE_LIMITS } = require('../types/SpawnTypes');
const { spawn } = require('child_process');
const { LoggingUtils } = require('@libs/logging-monitoring/logging');
const FileSystemUtils = require('@libs/system/file-operations');
const path = require('path'); // Import path directly
const EventEmitter3 = require('eventemitter3');
const { ProcessKiller } = require('../ProcessKiller');
const { ErrorHandlingUtils } = require('@libs/error-management/error-handler');

// Mock dependencies
const mockLoggerInstance = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

const mockFileSystemUtilsInstance = {
  ensureDir: jest.fn().mockResolvedValue(undefined),
  join: jest.fn((...args) => path.join(...args)),
  readFile: jest.fn(),
  writeFile: jest.fn(),
};

jest.mock('@libs/logging-monitoring/logging', () => ({
  LoggingUtils: jest.fn(() => mockLoggerInstance)
}));

jest.mock('@libs/system/file-operations', () => jest.fn(() => mockFileSystemUtilsInstance));

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

jest.mock('@libs/error-management/error-handler', () => ({
  ErrorHandlingUtils: jest.fn(() => ({
    handleError: jest.fn(),
    createErrorReport: jest.fn(),
  }))
}));

jest.mock('../ProcessKiller', () => ({
  ProcessKiller: jest.fn().mockImplementation((options, logger, fileSystem) => ({
    killProcess: jest.fn(),
    getKillHistory: jest.fn(() => []),
    logger: logger,
    fileSystem: fileSystem
  })),
}));

describe('ProcessMonitor', () => {
  let monitor;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    monitor = new ProcessMonitor(undefined, mockLoggerInstance, mockFileSystemUtilsInstance);
    // Re-initialize ProcessKiller with mocked dependencies for monitor
    monitor.processKiller = new ProcessKiller(undefined, mockLoggerInstance, mockFileSystemUtilsInstance);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    monitor.stop();
  });

  describe('constructor', () => {
    test('should initialize with default options', () => {
      expect(monitor.monitoringInterval).toBe(5000);
      expect(monitor.monitoredProcesses).toBeInstanceOf(Map);
      expect(monitor.monitoringTimer).toBeNull();
      expect(monitor.isRunning).toBe(false);
      expect(monitor.logFile).toBe('C:/apps/logs/process-monitor.json');
      expect(monitor.notifications).toEqual([]);
      expect(monitor.logger).toBe(mockLoggerInstance);
      expect(monitor.fileSystem).toBe(mockFileSystemUtilsInstance);
    });

    test('should initialize with custom options', () => {
      const customOptions = {
        monitoringInterval: 1000,
        logFile: './custom-monitor.log',
      };
      const customMonitor = new ProcessMonitor(customOptions, mockLoggerInstance, mockFileSystemUtilsInstance);
      expect(customMonitor.monitoringInterval).toBe(customOptions.monitoringInterval);
      expect(customMonitor.logFile).toBe(customOptions.logFile);
    });
  });

  describe('start', () => {
    test('should start monitoring and set interval', async () => {
      await monitor.start();
      expect(monitor.isRunning).toBe(true);
      expect(mockFileSystemUtilsInstance.ensureDir).toHaveBeenCalledWith(path.dirname(monitor.logFile));
      expect(monitor.monitoringTimer).toBeDefined();
      expect(mockLoggerInstance.log).toHaveBeenCalledWith('✅ ProcessMonitor запущен');
    });

    test('should not start if already running', async () => {
      monitor.isRunning = true;
      await monitor.start();
      expect(mockFileSystemUtilsInstance.ensureDir).not.toHaveBeenCalled();
      expect(mockLoggerInstance.log).not.toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    test('should stop monitoring and clear interval', async () => {
      await monitor.start();
      monitor.stop();
      expect(monitor.isRunning).toBe(false);
      expect(clearInterval).toHaveBeenCalledWith(monitor.monitoringTimer);
      expect(monitor.monitoringTimer).toBeNull();
      // expect(mockLoggerInstance.log).toHaveBeenCalledWith('🛑 ProcessMonitor остановлен');
    });

    test('should not stop if not running', async () => {
      monitor.isRunning = false;
      monitor.stop();
      expect(clearInterval).not.toHaveBeenCalled();
    });
  });

  describe('addProcess', () => {
    test('should add a process for monitoring with default limits', () => {
      const pid = 123;
      const processInfo = { daemonId: 'd1', jobId: 'j1' };
      monitor.addProcess(pid, processInfo);

      const monitored = monitor.monitoredProcesses.get(pid);
      expect(monitored).toBeDefined();
      expect(monitored.pid).toBe(pid);
      expect(monitored.daemonId).toBe('d1');
      expect(monitored.jobId).toBe('j1');
      expect(monitored.limits.cpuPercent).toBe(RESOURCE_LIMITS.CPU_PERCENT);
      expect(monitored.limits.memoryMB).toBe(RESOURCE_LIMITS.MEMORY_MB);
      expect(monitored.limits.timeoutMs).toBe(RESOURCE_LIMITS.TIMEOUT_MS);
      expect(monitored.autoKill).toBe(true);
      expect(monitored.resourceHistory).toEqual([]);
    });

    test('should add a process with custom limits and autoKill false', () => {
      const pid = 123;
      const processInfo = {
        daemonId: 'd1',
        jobId: 'j1',
        limits: {
          cpuPercent: 50,
          memoryMB: 512,
          timeoutMs: 60000,
        },
        options: { autoKill: false },
      };
      monitor.addProcess(pid, processInfo);

      const monitored = monitor.monitoredProcesses.get(pid);
      expect(monitored.limits.cpuPercent).toBe(50);
      expect(monitored.limits.memoryMB).toBe(512);
      expect(monitored.limits.timeoutMs).toBe(60000);
      expect(monitored.autoKill).toBe(false);
    });

    test('should overwrite existing process info', () => {
      const pid = 123;
      monitor.addProcess(pid, { daemonId: 'd1' });
      monitor.addProcess(pid, { daemonId: 'd2' }); // Overwrite

      const monitored = monitor.monitoredProcesses.get(pid);
      expect(monitored.daemonId).toBe('d2');
    });
  });

  describe('removeProcess', () => {
    test('should remove an existing process', () => {
      const pid = 123;
      monitor.addProcess(pid, { daemonId: 'd1' });
      const removed = monitor.removeProcess(pid);
      expect(removed).toBe(true);
      expect(monitor.monitoredProcesses.has(pid)).toBe(false);
    });

    test('should return false for non-existent process', () => {
      const removed = monitor.removeProcess(999);
      expect(removed).toBe(false);
    });
  });

  describe('monitorAllProcesses', () => {
    test('should call monitorProcess for all monitored processes', async () => {
      const pid1 = 123;
      const pid2 = 456;
      monitor.addProcess(pid1, { daemonId: 'd1', jobId: 'j1' });
      monitor.addProcess(pid2, { daemonId: 'd2', jobId: 'j2' });

      const spyMonitorProcess = jest.spyOn(monitor, 'monitorProcess').mockResolvedValue();

      await monitor.monitorAllProcesses();

      expect(spyMonitorProcess).toHaveBeenCalledTimes(2);
      expect(spyMonitorProcess).toHaveBeenCalledWith(pid1, expect.any(Object));
      expect(spyMonitorProcess).toHaveBeenCalledWith(pid2, expect.any(Object));
    });

    test('should handle errors during individual process monitoring', async () => {
      const pid = 123;
      monitor.addProcess(pid, { daemonId: 'd1', jobId: 'j1' });

      jest.spyOn(monitor, 'monitorProcess').mockRejectedValue(new Error('Monitoring error'));

      await monitor.monitorAllProcesses();

      expect(mockLoggerInstance.error).toHaveBeenCalledWith('Ошибка мониторинга процессов:', expect.any(Error));
    });
  });

  describe('monitorProcess', () => {
    test('should remove process if not alive', async () => {
      const pid = 123;
      const processInfo = { daemonId: 'd1', jobId: 'j1' };
      monitor.addProcess(pid, processInfo);

      jest.spyOn(monitor, 'isProcessAlive').mockResolvedValue(false);
      const spyRemoveProcess = jest.spyOn(monitor, 'removeProcess');

      await monitor.monitorProcess(pid, processInfo);

      expect(monitor.isProcessAlive).toHaveBeenCalledWith(pid);
      expect(spyRemoveProcess).toHaveBeenCalledWith(pid);
      expect(mockLoggerInstance.log).toHaveBeenCalledWith(expect.stringContaining('Процесс 123 не отвечает'));
    });

    test('should get resources and check limits if process is alive', async () => {
      const pid = 123;
      const processInfo = { daemonId: 'd1', jobId: 'j1', limits: { cpuPercent: 10, memoryMB: 10 } };
      monitor.addProcess(pid, processInfo);

      jest.spyOn(monitor, 'isProcessAlive').mockResolvedValue(true);
      jest.spyOn(monitor, 'getProcessResources').mockResolvedValue({ cpuPercent: 5, memoryMB: 5 });
      jest.spyOn(monitor, 'checkResourceLimits').mockReturnValue([]);
      jest.spyOn(monitor, 'handleLimitViolations').mockResolvedValue();
      jest.spyOn(monitor, 'handleTimeout').mockResolvedValue();

      await monitor.monitorProcess(pid, processInfo);

      expect(monitor.isProcessAlive).toHaveBeenCalledWith(pid);
      expect(monitor.getProcessResources).toHaveBeenCalledWith(pid);
      expect(monitor.checkResourceLimits).toHaveBeenCalledWith({ cpuPercent: 5, memoryMB: 5 }, processInfo.limits);
      expect(monitor.handleLimitViolations).not.toHaveBeenCalled();
      expect(processInfo.resourceHistory).toHaveLength(1);
    });

    test('should handle limit violations', async () => {
      const pid = 123;
      const processInfo = { daemonId: 'd1', jobId: 'j1', limits: { cpuPercent: 10, memoryMB: 10 } };
      monitor.addProcess(pid, processInfo);

      jest.spyOn(monitor, 'isProcessAlive').mockResolvedValue(true);
      jest.spyOn(monitor, 'getProcessResources').mockResolvedValue({ cpuPercent: 20, memoryMB: 20 });
      jest.spyOn(monitor, 'checkResourceLimits').mockReturnValue([{ type: 'cpu', message: 'CPU exceeded' }]);
      jest.spyOn(monitor, 'handleLimitViolations').mockResolvedValue();

      await monitor.monitorProcess(pid, processInfo);

      expect(monitor.handleLimitViolations).toHaveBeenCalledWith(
        pid,
        processInfo,
        [{ type: 'cpu', message: 'CPU exceeded' }],
        { cpuPercent: 20, memoryMB: 20 }
      );
    });

    test('should handle timeout', async () => {
      const pid = 123;
      const processInfo = { daemonId: 'd1', jobId: 'j1', startTime: Date.now() - 61000, limits: { timeoutMs: 60000 } };
      monitor.addProcess(pid, processInfo);

      jest.spyOn(monitor, 'isProcessAlive').mockResolvedValue(true);
      jest.spyOn(monitor, 'getProcessResources').mockResolvedValue({ cpuPercent: 5, memoryMB: 5 });
      jest.spyOn(monitor, 'checkResourceLimits').mockReturnValue([]);
      jest.spyOn(monitor, 'handleTimeout').mockResolvedValue();

      await monitor.monitorProcess(pid, processInfo);

      expect(monitor.handleTimeout).toHaveBeenCalledWith(
        pid,
        processInfo,
        expect.any(Number)
      );
    });
  });

  describe('isProcessAlive', () => {
    test('should return true if Get-Process returns 0 exit code', async () => {
      spawn.mockImplementationOnce(() => {
        const mockChild = {
          on: jest.fn((event, cb) => { if (event === 'close') cb(0); }),
          stdio: { pipe: jest.fn() },
          shell: true,
        };
        return mockChild;
      });

      const isAlive = await monitor.isProcessAlive(123);
      expect(isAlive).toBe(true);
      expect(spawn).toHaveBeenCalledWith('powershell', ['-Command', expect.stringContaining('Get-Process -Id 123')], expect.any(Object));
    });

    test('should return false if Get-Process returns non-0 exit code', async () => {
      spawn.mockImplementationOnce(() => {
        const mockChild = {
          on: jest.fn((event, cb) => { if (event === 'close') cb(1); }),
          stdio: { pipe: jest.fn() },
          shell: true,
        };
        return mockChild;
      });

      const isAlive = await monitor.isProcessAlive(123);
      expect(isAlive).toBe(false);
    });

    test('should return false if spawn throws an error', async () => {
      spawn.mockImplementationOnce(() => { throw new Error('Spawn failed'); });

      const isAlive = await monitor.isProcessAlive(123);
      expect(isAlive).toBe(false);
    });
  });

  describe('getProcessResources', () => {
    test('should return resource info for a process', async () => {
      const mockStdout = JSON.stringify({
        CPU: 10.5,
        WorkingSet: 104857600, // 100MB
        ProcessName: 'test-process',
      });

      spawn.mockImplementationOnce(() => {
        const mockChild = {
          stdout: { on: jest.fn((event, cb) => { if (event === 'data') cb(mockStdout); }) },
          stderr: { on: jest.fn() },
          on: jest.fn((event, cb) => { if (event === 'close') cb(0); }),
          stdio: 'pipe',
          shell: true,
        };
        return mockChild;
      });

      const resourceInfo = await monitor.getProcessResources(123);
      expect(resourceInfo.cpuPercent).toBe(10.5);
      expect(resourceInfo.memoryMB).toBe(100);
      expect(resourceInfo.processName).toBe('test-process');
    });

    test('should handle non-0 exit code', async () => {
      spawn.mockImplementationOnce(() => {
        const mockChild = {
          stdout: { on: jest.fn() },
          stderr: { on: jest.fn((event, cb) => { if (event === 'data') cb('Error output'); }) },
          on: jest.fn((event, cb) => { if (event === 'close') cb(1); }),
          stdio: 'pipe',
          shell: true,
        };
        return mockChild;
      });

      await expect(monitor.getProcessResources(123)).rejects.toThrow(expect.stringContaining('Команда завершилась с кодом 1'));
      expect(mockLoggerInstance.error).toHaveBeenCalled();
    });

    test('should handle JSON parsing errors', async () => {
      spawn.mockImplementationOnce(() => {
        const mockChild = {
          stdout: { on: jest.fn((event, cb) => { if (event === 'data') cb('invalid json'); }) },
          stderr: { on: jest.fn() },
          on: jest.fn((event, cb) => { if (event === 'close') cb(0); }),
          stdio: 'pipe',
          shell: true,
        };
        return mockChild;
      });

      await expect(monitor.getProcessResources(123)).rejects.toThrow(expect.stringContaining('Ошибка парсинга информации о процессе'));
      expect(mockLoggerInstance.error).toHaveBeenCalled();
    });

    test('should return default resource info on spawn error', async () => {
      spawn.mockImplementationOnce(() => { throw new Error('Spawn failed'); });

      const resourceInfo = await monitor.getProcessResources(123);
      expect(resourceInfo).toEqual({ cpuPercent: 0, memoryMB: 0, processName: 'unknown' });
      expect(mockLoggerInstance.error).toHaveBeenCalled();
    });
  });

  describe('checkResourceLimits', () => {
    test('should return empty array if no violations', () => {
      const resourceInfo = { cpuPercent: 50, memoryMB: 500 };
      const limits = { cpuPercent: 100, memoryMB: 1024 };
      const violations = monitor.checkResourceLimits(resourceInfo, limits);
      expect(violations).toEqual([]);
    });

    test('should return cpu violation', () => {
      const resourceInfo = { cpuPercent: 120, memoryMB: 500 };
      const limits = { cpuPercent: 100, memoryMB: 1024 };
      const violations = monitor.checkResourceLimits(resourceInfo, limits);
      expect(violations).toHaveLength(1);
      expect(violations[0].type).toBe('cpu');
      expect(violations[0].current).toBe(120);
      expect(violations[0].limit).toBe(100);
      expect(violations[0].message).toContain('CPU превышен');
    });

    test('should return memory violation', () => {
      const resourceInfo = { cpuPercent: 50, memoryMB: 1500 };
      const limits = { cpuPercent: 100, memoryMB: 1024 };
      const violations = monitor.checkResourceLimits(resourceInfo, limits);
      expect(violations).toHaveLength(1);
      expect(violations[0].type).toBe('memory');
      expect(violations[0].current).toBe(1500);
      expect(violations[0].limit).toBe(1024);
      expect(violations[0].message).toContain('Память превышена');
    });

    test('should return both cpu and memory violations', () => {
      const resourceInfo = { cpuPercent: 120, memoryMB: 1500 };
      const limits = { cpuPercent: 100, memoryMB: 1024 };
      const violations = monitor.checkResourceLimits(resourceInfo, limits);
      expect(violations).toHaveLength(2);
    });
  });

  describe('handleLimitViolations', () => {
    test('should log violation, send notification, and emit event if autoKill is true', async () => {
      const pid = 123;
      const processInfo = { daemonId: 'd1', jobId: 'j1', autoKill: true };
      const violations = [{ type: 'cpu', message: 'CPU exceeded' }];
      const resourceInfo = { cpuPercent: 120, memoryMB: 500 };

      const spyLogViolation = jest.spyOn(monitor, 'logViolation').mockResolvedValue();
      const spySendNotification = jest.spyOn(monitor, 'sendNotification').mockResolvedValue();
      const spyEmit = jest.spyOn(monitor, 'emit');

      await monitor.handleLimitViolations(pid, processInfo, violations, resourceInfo);

      expect(spyLogViolation).toHaveBeenCalledWith(expect.objectContaining({ pid, violations }));
      expect(spySendNotification).toHaveBeenCalledWith(expect.objectContaining({ pid, violations }));
      expect(spyEmit).toHaveBeenCalledWith('processLimitExceeded', { pid, processInfo, violations });
      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(expect.stringContaining('Автоматическое завершение процесса 123'));
    });

    test('should not emit event if autoKill is false', async () => {
      const pid = 123;
      const processInfo = { daemonId: 'd1', jobId: 'j1', autoKill: false };
      const violations = [{ type: 'cpu', message: 'CPU exceeded' }];
      const resourceInfo = { cpuPercent: 120, memoryMB: 500 };

      jest.spyOn(monitor, 'logViolation').mockResolvedValue();
      jest.spyOn(monitor, 'sendNotification').mockResolvedValue();
      const spyEmit = jest.spyOn(monitor, 'emit');

      await monitor.handleLimitViolations(pid, processInfo, violations, resourceInfo);

      expect(spyEmit).not.toHaveBeenCalled();
    });
  });

  describe('handleTimeout', () => {
    test('should log timeout, send notification, and emit event if autoKill is true', async () => {
      const pid = 123;
      const processInfo = { daemonId: 'd1', jobId: 'j1', autoKill: true, limits: { timeoutMs: 60000 } };
      const runtime = 70000;

      const spyLogViolation = jest.spyOn(monitor, 'logViolation').mockResolvedValue();
      const spySendNotification = jest.spyOn(monitor, 'sendNotification').mockResolvedValue();
      const spyEmit = jest.spyOn(monitor, 'emit');

      await monitor.handleTimeout(pid, processInfo, runtime);

      expect(spyLogViolation).toHaveBeenCalledWith(expect.objectContaining({ pid, runtime }));
      expect(spySendNotification).toHaveBeenCalledWith(expect.objectContaining({ pid, runtime }));
      expect(spyEmit).toHaveBeenCalledWith('processTimeout', { pid, processInfo, runtime });
      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(expect.stringContaining('Автоматическое завершение процесса 123'));
    });

    test('should not emit event if autoKill is false', async () => {
      const pid = 123;
      const processInfo = { daemonId: 'd1', jobId: 'j1', autoKill: false, limits: { timeoutMs: 60000 } };
      const runtime = 70000;

      jest.spyOn(monitor, 'logViolation').mockResolvedValue();
      jest.spyOn(monitor, 'sendNotification').mockResolvedValue();
      const spyEmit = jest.spyOn(monitor, 'emit');

      await monitor.handleTimeout(pid, processInfo, runtime);

      expect(spyEmit).not.toHaveBeenCalled();
    });
  });

  describe('logViolation', () => {
    test('should log violation to file and history', async () => {
      const violationLog = { pid: 123, type: 'cpu', message: 'CPU exceeded' };

      mockFileSystemUtilsInstance.writeFile.mockResolvedValue(true);

      await monitor.logViolation(violationLog);

      expect(mockFileSystemUtilsInstance.writeFile).toHaveBeenCalledWith(
        monitor.logFile,
        JSON.stringify([violationLog], null, 2)
      );
    });

    test('should cap log history to 1000 entries', async () => {
      // Fill logs with 1000 entries
      monitor.logs = Array.from({ length: 1000 }, (_, i) => ({ id: i }));

      const newLog = { pid: 9999, type: 'mem', message: 'Memory exceeded' };

      await monitor.logViolation(newLog);

      expect(monitor.logs).toHaveLength(1000);
      expect(monitor.logs[0].id).toBe(1); // Oldest should be removed
      // expect(monitor.logs[999].pid).toBe(9999);
    });
  });

  describe('sendNotification', () => {
    test('should add notification to history and log', async () => {
      const violationLog = { pid: 123, type: 'cpu', message: 'CPU exceeded' };

      await monitor.sendNotification(violationLog);

      expect(monitor.notifications).toHaveLength(1);
      expect(monitor.notifications[0]).toEqual(expect.objectContaining({ type: 'resource_violation', severity: 'warning', pid: 123 }));
      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(expect.stringContaining('Уведомление: CPU exceeded'));
    });

    test('should cap notifications history to 100 entries', async () => {
      // Fill notifications with 100 entries
      for (let i = 0; i < 100; i++) {
        monitor.notifications.push({ id: i, message: `notif-${i}` });
      }

      const newNotification = { pid: 9999, type: 'mem', message: 'Memory exceeded' };

      await monitor.sendNotification(newNotification);

      expect(monitor.notifications).toHaveLength(100);
      expect(monitor.notifications[0].id).toBe(1); // Oldest should be removed
      expect(monitor.notifications[99].pid).toBe(9999);
    });
  });

  describe('getStats', () => {
    test('should return monitoring statistics', async () => {
      monitor.addProcess(1, { daemonId: 'd1', jobId: 'j1', startTime: Date.now() - 10000 });
      monitor.addProcess(2, { daemonId: 'd2', jobId: 'j2', startTime: Date.now() - 20000 });
      monitor.logs.push({ type: 'cpu', pid: 1 });
      monitor.notifications.push({ type: 'timeout', pid: 2 });

      const stats = monitor.getStats();

      expect(stats.totalProcesses).toBe(2);
      expect(stats.activeProcesses).toBe(2);
      expect(stats.totalViolations).toBe(1);
      expect(stats.totalNotifications).toBe(1);
      expect(stats.isRunning).toBe(true);
      expect(stats.monitoringInterval).toBe(5000);
    });
  });

  describe('getProcessInfo', () => {
    test('should return info for a specific process', () => {
      const pid = 123;
      const processInfo = { daemonId: 'd1', jobId: 'j1' };
      monitor.addProcess(pid, processInfo);

      const info = monitor.getProcessInfo(pid);
      expect(info).toEqual(expect.objectContaining({ pid, daemonId: 'd1' }));
    });

    test('should return undefined for a non-existent process', () => {
      const info = monitor.getProcessInfo(999);
      expect(info).toBeUndefined();
    });
  });

  describe('getNotifications', () => {
    test('should return all notifications', () => {
      monitor.notifications.push({ message: 'Test notification 1' });
      monitor.notifications.push({ message: 'Test notification 2' });

      const notifications = monitor.getNotifications();
      expect(notifications).toHaveLength(2);
      expect(notifications[0].message).toBe('Test notification 1');
    });

    test('should return a copy of notifications array', () => {
      monitor.notifications.push({ message: 'Test notification' });
      const notifications = monitor.getNotifications();
      notifications.push({ message: 'New notification' }); // Modify the copy
      expect(monitor.notifications).toHaveLength(1);
      expect(notifications).toHaveLength(2);
    });
  });

  describe('clearNotifications', () => {
    test('should clear all notifications', () => {
      monitor.notifications.push({ message: 'Test notification' });
      monitor.clearNotifications();
      expect(monitor.notifications).toHaveLength(0);
    });
  });

  describe('Integration Scenarios', () => {
    let mockChildProcess;
    let killProcessSpy;

    beforeEach(() => {
      mockChildProcess = {
        on: jest.fn((event, cb) => { if (event === 'close') cb(0); }),
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        pid: 1000,
      };
      spawn.mockReturnValue(mockChildProcess);
      killProcessSpy = jest.spyOn(monitor.processKiller, 'killProcess'); // Spy on instance
    });

    test('should start, add process, monitor, detect violation, and auto-kill', async () => {
      await monitor.start();
      monitor.addProcess(mockChildProcess.pid, { daemonId: 'int-d1', jobId: 'int-j1', limits: { cpuPercent: 5, memoryMB: 5 } });

      jest.spyOn(monitor, 'getProcessResources').mockResolvedValue({
        cpuPercent: 50, // Violation
        memoryMB: 10, // No violation
        processName: 'test-process-int',
      });

      jest.runOnlyPendingTimers(); // Trigger monitorAllProcesses

      await Promise.resolve(); // Wait for promises to settle

      expect(monitor.monitoredProcesses.get(mockChildProcess.pid).resourceHistory).toHaveLength(1);
      expect(killProcessSpy).toHaveBeenCalledWith(mockChildProcess.pid, expect.any(Object));
      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(expect.stringContaining('Автоматическое завершение процесса'));
      expect(monitor.notifications).toHaveLength(1);
      expect(monitor.notifications[0].type).toBe('resource_violation');
    }, 10000); // Increase timeout for integration test

    test('should handle process timeout', async () => {
      const startTime = Date.now() - 61000; // Process started 61 seconds ago
      jest.spyOn(global.Date, 'now').mockReturnValue(startTime + 70000); // Simulate current time 70 seconds after start

      await monitor.start();
      monitor.addProcess(mockChildProcess.pid, {
        daemonId: 'int-d2',
        jobId: 'int-j2',
        startTime: startTime,
        limits: { timeoutMs: 60000 },
      });

      jest.spyOn(monitor, 'getProcessResources').mockResolvedValue({
        cpuPercent: 1,
        memoryMB: 1,
        processName: 'test-process-timeout',
      });

      jest.runOnlyPendingTimers(); // Trigger monitorAllProcesses

      await Promise.resolve(); // Wait for promises to settle

      expect(killProcessSpy).toHaveBeenCalledWith(mockChildProcess.pid, expect.any(Object));
      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(expect.stringContaining('Автоматическое завершение процесса по таймауту'));
      expect(monitor.notifications).toHaveLength(1);
      expect(monitor.notifications[0].type).toBe('timeout');

      global.Date.now.mockRestore();
    }, 10000);

    test('should not auto-kill if autoKill is false', async () => {
      await monitor.start();
      monitor.addProcess(mockChildProcess.pid, {
        daemonId: 'int-d3',
        jobId: 'int-j3',
        limits: { cpuPercent: 5, memoryMB: 5 },
        options: { autoKill: false },
      });

      jest.spyOn(monitor, 'getProcessResources').mockResolvedValue({
        cpuPercent: 50, // Violation
        memoryMB: 10, // No violation
        processName: 'test-process-no-kill',
      });

      jest.runOnlyPendingTimers(); // Trigger monitorAllProcesses

      await Promise.resolve(); // Wait for promises to settle

      expect(killProcessSpy).not.toHaveBeenCalled();
      expect(monitor.notifications).toHaveLength(1);
      expect(monitor.notifications[0].type).toBe('resource_violation');
      expect(mockLoggerInstance.warn).not.toHaveBeenCalledWith(expect.stringContaining('Автоматическое завершение процесса'));
    }, 10000);
  });
});
