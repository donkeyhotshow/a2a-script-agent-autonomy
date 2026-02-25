const { EnhancedDaemon } = require('../index.js');
const EventEmitter = require('eventemitter3');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

// Mock internal dependencies
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const mockErrorHandler = {
  handleError: jest.fn(),
  safeExecute: jest.fn((fn, context) => fn()),
};

const mockProcessManager = {
  start: jest.fn(),
  kill: jest.fn(),
};

const mockMonitoringUtils = {
  detectRunningPids: jest.fn(),
  getMetrics: jest.fn(() => ({ cpu: 0, memory: 0 })),
};

// Mock fs and path
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    rm: jest.fn(),
  },
  existsSync: jest.fn(),
}));

jest.mock('path', () => ({
  resolve: jest.fn((...args) => args.join('/')),
  dirname: jest.fn((p) => p.split('/').slice(0, -1).join('/')),
}));

// Mock global timers
jest.useFakeTimers();

describe('EnhancedDaemon', () => {
  let daemon;
  let mockChildProcess;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mocks for each test
    mockProcessManager.start.mockReset().mockResolvedValue({
      child: {
        pid: 12345,
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
        killed: false,
      },
      pid: 12345,
    });
    mockProcessManager.kill.mockReset().mockResolvedValue(true);
    mockMonitoringUtils.detectRunningPids.mockReset().mockResolvedValue([]);
    fsSync.existsSync.mockReset().mockReturnValue(true);

    daemon = new EnhancedDaemon({
      logger: mockLogger,
      errorHandler: mockErrorHandler,
      processManager: mockProcessManager,
      monitoringUtils: mockMonitoringUtils,
      daemonScript: 'daemon-script.js',
      workingDir: '/app',
      enableMonitoring: true,
      enableAutoRestart: true,
      enableScheduler: true,
    });

    mockChildProcess = daemon.childProcess; // Should be null initially, updated on start
  });

  afterEach(() => {
    // Ensure timers are cleared after each test
    if (daemon.monitoringTimer) clearInterval(daemon.monitoringTimer);
    if (daemon.schedulerTimer) clearInterval(daemon.schedulerTimer);
    jest.runOnlyPendingTimers();
  });

  describe('constructor', () => {
    test('should initialize with default options and provided dependencies', () => {
      expect(daemon.logger).toBe(mockLogger);
      expect(daemon.errorHandler).toBe(mockErrorHandler);
      expect(daemon.processManager).toBe(mockProcessManager);
      expect(daemon.monitoringUtils).toBe(mockMonitoringUtils);
      expect(daemon.config.daemonScript).toBe('daemon-script.js');
      expect(daemon.config.workingDir).toBe('/app');
      expect(daemon.isRunning).toBe(false);
      expect(daemon.childProcess).toBeNull();
      expect(daemon.restartCount).toBe(0);
      expect(mockLogger.info).toHaveBeenCalledWith('[EnhancedDaemon] Инициализирован', expect.any(Object));
    });

    test('should use default logger and error handler if not provided', () => {
      const newDaemon = new EnhancedDaemon({ daemonScript: 'script.js' });
      expect(newDaemon.logger).toBeInstanceOf(EventEmitter);
      expect(newDaemon.errorHandler).toBeInstanceOf(Object); // ErrorHandlingUtils
      expect(newDaemon.logger.info).toHaveBeenCalledWith('[EnhancedDaemon] Инициализирован', expect.any(Object));
    });

    test('should correctly merge monitoringConfig', () => {
      const newDaemon = new EnhancedDaemon({
        daemonScript: 'script.js',
        monitoringConfig: { enabled: false, custom: 123 },
      });
      expect(newDaemon.config.monitoringConfig.enabled).toBe(false);
      expect(newDaemon.config.monitoringConfig.custom).toBe(123);
      expect(newDaemon.config.monitoringConfig.timeout).toBe(5000);
    });
  });

  describe('start', () => {
    test('should start child process, monitoring, and scheduler', async () => {
      jest.spyOn(daemon, 'startChildProcess').mockResolvedValue();
      jest.spyOn(daemon, 'startMonitoring');
      jest.spyOn(daemon, 'startScheduler');

      await daemon.start();

      expect(daemon.startChildProcess).toHaveBeenCalledTimes(1);
      expect(daemon.startMonitoring).toHaveBeenCalledTimes(1);
      expect(daemon.startScheduler).toHaveBeenCalledTimes(1);
      expect(daemon.isRunning).toBe(true);
      expect(daemon.emit).toHaveBeenCalledWith('started');
      expect(mockLogger.info).toHaveBeenCalledWith('[EnhancedDaemon] Успешно запущен.');
    });

    test('should not start if already running', async () => {
      daemon.isRunning = true;
      jest.spyOn(daemon, 'startChildProcess');

      await daemon.start();

      expect(daemon.startChildProcess).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith('[EnhancedDaemon] Демон уже запущен.');
    });

    test('should handle errors during start', async () => {
      const startError = new Error('Failed to start child process');
      jest.spyOn(daemon, 'startChildProcess').mockRejectedValue(startError);

      await expect(daemon.start()).rejects.toThrow(startError);
      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(startError, { context: 'EnhancedDaemon.start' });
      expect(daemon.isRunning).toBe(false);
    });

    test('should not start child process if daemonScript is null', async () => {
      daemon.config.daemonScript = null;
      jest.spyOn(daemon, 'startChildProcess');
      await daemon.start();
      expect(daemon.startChildProcess).not.toHaveBeenCalled();
    });

    test('should not start monitoring if enableMonitoring is false', async () => {
      daemon.config.enableMonitoring = false;
      jest.spyOn(daemon, 'startMonitoring');
      await daemon.start();
      expect(daemon.startMonitoring).not.toHaveBeenCalled();
    });

    test('should not start scheduler if enableScheduler is false', async () => {
      daemon.config.enableScheduler = false;
      jest.spyOn(daemon, 'startScheduler');
      await daemon.start();
      expect(daemon.startScheduler).not.toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    beforeEach(() => {
      daemon.isRunning = true;
      daemon.childProcess = { pid: 12345, killed: false };
      jest.spyOn(daemon, 'stopChildProcess').mockResolvedValue();
      jest.spyOn(daemon, 'stopMonitoring');
      jest.spyOn(daemon, 'stopScheduler');
    });

    test('should stop child process, monitoring, and scheduler', async () => {
      await daemon.stop();

      expect(daemon.stopChildProcess).toHaveBeenCalledTimes(1);
      expect(daemon.stopMonitoring).toHaveBeenCalledTimes(1);
      expect(daemon.stopScheduler).toHaveBeenCalledTimes(1);
      expect(daemon.isRunning).toBe(false);
      expect(daemon.emit).toHaveBeenCalledWith('stopped');
      expect(mockLogger.info).toHaveBeenCalledWith('[EnhancedDaemon] Успешно остановлен.');
    });

    test('should not stop if not running', async () => {
      daemon.isRunning = false;
      jest.spyOn(daemon, 'stopChildProcess');

      await daemon.stop();

      expect(daemon.stopChildProcess).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith('[EnhancedDaemon] Демон не запущен.');
    });

    test('should handle errors during stop', async () => {
      const stopError = new Error('Failed to stop child process');
      jest.spyOn(daemon, 'stopChildProcess').mockRejectedValue(stopError);

      await expect(daemon.stop()).rejects.toThrow(stopError);
      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(stopError, { context: 'EnhancedDaemon.stop' });
      expect(daemon.isRunning).toBe(true); // Should remain true if error occurs before final state change
    });

    test('should not attempt to stop child process if not running', async () => {
      daemon.childProcess = null;
      await daemon.stop();
      expect(daemon.stopChildProcess).not.toHaveBeenCalled();
    });
  });

  describe('startChildProcess', () => {
    const scriptPath = '/app/daemon-script.js';

    beforeEach(() => {
      fsSync.existsSync.mockReturnValue(true);
      path.resolve.mockReturnValue(scriptPath);
      mockProcessManager.start.mockResolvedValue({
        child: {
          pid: 54321,
          stdout: { on: jest.fn() },
          stderr: { on: jest.fn() },
          on: jest.fn(),
          killed: false,
        },
        pid: 54321,
      });
      daemon.config.daemonScript = 'daemon-script.js';
      daemon.config.workingDir = '/app';
      daemon.config.enableAutoRestart = true;
      daemon.config.maxRestarts = 5;
      daemon.config.restartDelay = 100;
    });

    test('should throw error if daemonScript is not configured', async () => {
      daemon.config.daemonScript = null;
      await expect(daemon.startChildProcess()).rejects.toThrow('Не указан скрипт демона для запуска.');
    });

    test('should throw error if daemonScript file does not exist', async () => {
      fsSync.existsSync.mockReturnValue(false);
      await expect(daemon.startChildProcess()).rejects.toThrow(`Скрипт демона не найден: ${scriptPath}`);
    });

    test('should start a child process and set up event handlers', async () => {
      await daemon.startChildProcess();

      expect(path.resolve).toHaveBeenCalledWith(daemon.config.workingDir, daemon.config.daemonScript);
      expect(fsSync.existsSync).toHaveBeenCalledWith(scriptPath);
      expect(mockProcessManager.start).toHaveBeenCalledWith(expect.objectContaining({
        command: `node ${scriptPath}`,
        cwd: daemon.config.workingDir,
        stdio: 'pipe',
        env: expect.objectContaining({ NODE_ENV: 'production' }),
      }));
      expect(daemon.childProcess).toBeDefined();
      expect(daemon.childProcess.stdout.on).toHaveBeenCalledWith('data', expect.any(Function));
      expect(daemon.childProcess.stderr.on).toHaveBeenCalledWith('data', expect.any(Function));
      expect(daemon.childProcess.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(daemon.childProcess.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(daemon.emit).toHaveBeenCalledWith('processStarted', { child: daemon.childProcess, pid: 54321 });
      expect(mockLogger.info).toHaveBeenCalledWith('[EnhancedDaemon] Запуск дочернего процесса', expect.any(Object));
    });

    test('should log stdout and stderr data', async () => {
      await daemon.startChildProcess();

      const stdoutHandler = daemon.childProcess.stdout.on.mock.calls[0][1];
      const stderrHandler = daemon.childProcess.stderr.on.mock.calls[0][1];
      stdoutHandler(Buffer.from('stdout message'));
      stderrHandler(Buffer.from('stderr message'));

      expect(mockLogger.info).toHaveBeenCalledWith('Демон stdout:', 'stdout message');
      expect(mockLogger.error).toHaveBeenCalledWith('Демон stderr:', 'stderr message');
    });

    test('should restart child process on close if autoRestart is enabled and maxRestarts not exceeded', async () => {
      await daemon.startChildProcess();
      const closeHandler = daemon.childProcess.on.mock.calls[0][1];
      jest.spyOn(daemon, 'startChildProcess'); // Spy again to catch restart call
      jest.spyOn(global, 'setTimeout');

      daemon.restartCount = 0;
      await closeHandler(0); // Simulate process close

      expect(mockLogger.info).toHaveBeenCalledWith('Дочерний процесс демона завершен', { code: 0, pid: 54321 });
      expect(daemon.restartCount).toBe(1);
      expect(mockLogger.info).toHaveBeenCalledWith('[EnhancedDaemon] Перезапуск демона', { restartCount: 1 });
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), daemon.config.restartDelay);

      // Manually trigger the setTimeout callback for the restart
      jest.runOnlyPendingTimers();
      expect(daemon.startChildProcess).toHaveBeenCalledTimes(2); // Initial start + 1 restart
    });

    test('should stop daemon if maxRestarts is exceeded', async () => {
      await daemon.startChildProcess();
      const closeHandler = daemon.childProcess.on.mock.calls[0][1];
      jest.spyOn(daemon, 'stop').mockResolvedValue();

      daemon.restartCount = daemon.config.maxRestarts; // Max restarts reached
      await closeHandler(1); // Simulate process close with error code

      expect(mockLogger.error).toHaveBeenCalledWith('[EnhancedDaemon] Превышено максимальное количество перезапусков', { maxRestarts: daemon.config.maxRestarts });
      expect(daemon.emit).toHaveBeenCalledWith('maxRestartsExceeded');
      expect(daemon.stop).toHaveBeenCalledTimes(1);
    });

    test('should emit processError on child process error event', async () => {
      await daemon.startChildProcess();
      const errorHandler = daemon.childProcess.on.mock.calls[1][1];
      const processError = new Error('Child process crashed');

      errorHandler(processError); // Simulate error event

      expect(mockLogger.error).toHaveBeenCalledWith('[EnhancedDaemon] Ошибка дочернего процесса демона:', processError);
      expect(daemon.emit).toHaveBeenCalledWith('processError', processError);
    });

    test('should handle errors during startChildProcess', async () => {
      const startError = new Error('Process manager start failed');
      mockProcessManager.start.mockRejectedValue(startError);

      await expect(daemon.startChildProcess()).rejects.toThrow(startError);
      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(startError, { context: 'EnhancedDaemon.startChildProcess' });
    });
  });

  describe('stopChildProcess', () => {
    beforeEach(() => {
      daemon.childProcess = {
        pid: 12345,
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
        killed: false,
      };
    });

    test('should kill child process and emit processStopped event', async () => {
      await daemon.stopChildProcess();

      expect(mockProcessManager.kill).toHaveBeenCalledWith(daemon.childProcess.pid);
      expect(daemon.childProcess).toBeNull();
      expect(daemon.emit).toHaveBeenCalledWith('processStopped');
      expect(mockLogger.info).toHaveBeenCalledWith('[EnhancedDaemon] Остановка дочернего процесса', { pid: 12345 });
    });

    test('should not attempt to kill if no child process is running', async () => {
      daemon.childProcess = null;
      await daemon.stopChildProcess();

      expect(mockProcessManager.kill).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalledWith(expect.stringContaining('Остановка дочернего процесса'));
    });

    test('should handle errors during kill process', async () => {
      const killError = new Error('Failed to kill process');
      mockProcessManager.kill.mockRejectedValue(killError);

      await expect(daemon.stopChildProcess()).rejects.toThrow(killError);
      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(killError, { context: 'EnhancedDaemon.stopChildProcess' });
    });
  });

  describe('Monitoring', () => {
    beforeEach(() => {
      daemon.childProcess = { pid: 12345, killed: false };
      daemon.config.enableMonitoring = true;
      daemon.config.monitoringConfig.checkInterval = 1000;
    });

    test('startMonitoring should set up monitoring interval', () => {
      daemon.startMonitoring();
      expect(mockLogger.info).toHaveBeenCalledWith('[EnhancedDaemon] Запуск мониторинга.');
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 1000);
      expect(daemon.monitoringTimer).toBeDefined();
    });

    test('startMonitoring should clear existing timer before setting new one', () => {
      daemon.monitoringTimer = 'mockTimer'; // Simulate existing timer
      daemon.startMonitoring();
      expect(clearInterval).toHaveBeenCalledWith('mockTimer');
    });

    test('stopMonitoring should clear monitoring interval', () => {
      daemon.startMonitoring(); // Start to set a timer
      daemon.stopMonitoring();
      expect(clearInterval).toHaveBeenCalledWith(daemon.monitoringTimer);
      expect(daemon.monitoringTimer).toBeNull();
      expect(mockLogger.info).toHaveBeenCalledWith('[EnhancedDaemon] Мониторинг остановлен.');
    });

    test('stopMonitoring should do nothing if no timer is set', () => {
      daemon.monitoringTimer = null;
      daemon.stopMonitoring();
      expect(clearInterval).not.toHaveBeenCalled();
    });

    describe('checkHealth', () => {
      test('should emit healthCheckPassed if process is running', async () => {
        mockMonitoringUtils.detectRunningPids.mockResolvedValue([12345, 67890]);

        await daemon.checkHealth();

        expect(mockMonitoringUtils.detectRunningPids).toHaveBeenCalledWith(daemon.config.daemonScript, {});
        expect(daemon.emit).toHaveBeenCalledWith('healthCheckPassed', { pid: 12345 });
      });

      test('should emit healthCheckFailed if process is not running', async () => {
        mockMonitoringUtils.detectRunningPids.mockResolvedValue([67890]); // PID 12345 not found

        await daemon.checkHealth();

        expect(mockMonitoringUtils.detectRunningPids).toHaveBeenCalledWith(daemon.config.daemonScript, {});
        expect(mockLogger.warn).toHaveBeenCalledWith('[EnhancedDaemon] Дочерний процесс демона не работает.', { pid: 12345 });
        expect(daemon.emit).toHaveBeenCalledWith('healthCheckFailed', 'process_not_running', { pid: 12345 });
      });

      test('should emit healthCheckFailed if childProcess is null', async () => {
        daemon.childProcess = null;

        await daemon.checkHealth();

        expect(mockLogger.warn).toHaveBeenCalledWith('[EnhancedDaemon] Дочерний процесс демона не найден для проверки здоровья.');
        expect(daemon.emit).toHaveBeenCalledWith('healthCheckFailed', 'process_not_found');
        expect(mockMonitoringUtils.detectRunningPids).not.toHaveBeenCalled();
      });

      test('should handle errors during health check', async () => {
        const healthError = new Error('Monitoring failed');
        mockMonitoringUtils.detectRunningPids.mockRejectedValue(healthError);

        await daemon.checkHealth(); // It should handle, not rethrow

        expect(mockErrorHandler.handleError).not.toHaveBeenCalled(); // Handled internally by caller or log
        expect(mockLogger.error).toHaveBeenCalledWith('Error during health check:', healthError); // Logged internally
      });
    });
  });

  describe('Scheduler', () => {
    beforeEach(() => {
      daemon.config.enableScheduler = true;
      daemon.config.schedulerInterval = 5000;
    });

    test('startScheduler should set up scheduler interval', () => {
      daemon.startScheduler();
      expect(mockLogger.info).toHaveBeenCalledWith('[EnhancedDaemon] Запуск планировщика.');
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 5000);
      expect(daemon.schedulerTimer).toBeDefined();
    });

    test('startScheduler should clear existing timer before setting new one', () => {
      daemon.schedulerTimer = 'mockTimer';
      daemon.startScheduler();
      expect(clearInterval).toHaveBeenCalledWith('mockTimer');
    });

    test('stopScheduler should clear scheduler interval', () => {
      daemon.startScheduler();
      daemon.stopScheduler();
      expect(clearInterval).toHaveBeenCalledWith(daemon.schedulerTimer);
      expect(daemon.schedulerTimer).toBeNull();
      expect(mockLogger.info).toHaveBeenCalledWith('[EnhancedDaemon] Планировщик остановлен.');
    });

    test('stopScheduler should do nothing if no timer is set', () => {
      daemon.schedulerTimer = null;
      daemon.stopScheduler();
      expect(clearInterval).not.toHaveBeenCalled();
    });

    test('runScheduledTasks should emit scheduledTasksRun event', () => {
      daemon.runScheduledTasks();
      expect(daemon.emit).toHaveBeenCalledWith('scheduledTasksRun');
    });

    test('scheduler should run tasks at interval', () => {
      jest.spyOn(daemon, 'runScheduledTasks');
      daemon.startScheduler();
      jest.advanceTimersByTime(5000);
      expect(daemon.runScheduledTasks).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(5000);
      expect(daemon.runScheduledTasks).toHaveBeenCalledTimes(2);
    });
  });

  describe('Status and Stats', () => {
    test('getStatus should return current daemon status', () => {
      daemon.isRunning = true;
      daemon.restartCount = 2;
      daemon.childProcess = { pid: 98765, killed: false };

      const status = daemon.getStatus();

      expect(status.isRunning).toBe(true);
      expect(status.processRunning).toBe(true);
      expect(status.restartCount).toBe(2);
      expect(status.config.workingDir).toBe('/app');
      expect(status.childPid).toBe(98765);
    });

    test('getStatus should return processRunning false if childProcess is killed', () => {
      daemon.isRunning = true;
      daemon.childProcess = { pid: 98765, killed: true };

      const status = daemon.getStatus();
      expect(status.processRunning).toBe(false);
    });

    test('getStatus should return null childPid if no childProcess', () => {
      daemon.childProcess = null;
      const status = daemon.getStatus();
      expect(status.childPid).toBeNull();
    });

    test('getStats should return current daemon statistics', () => {
      daemon.isRunning = true;
      daemon.startTime = Date.now() - 60000; // 1 minute ago
      daemon.restartCount = 3;
      daemon.childProcess = { pid: 11111, killed: false };

      const stats = daemon.getStats();

      expect(stats.uptime).toBeCloseTo(60000, -2); // Allow small diff
      expect(stats.restartCount).toBe(3);
      expect(stats.process.pid).toBe(11111);
      expect(stats.healthMetrics).toEqual({ cpu: 0, memory: 0 }); // From mockMonitoringUtils
    });

    test('getStats should return uptime 0 if not running', () => {
      daemon.isRunning = false;
      const stats = daemon.getStats();
      expect(stats.uptime).toBe(0);
    });

    test('getStats should return null process if no childProcess', () => {
      daemon.childProcess = null;
      const stats = daemon.getStats();
      expect(stats.process).toBeNull();
    });

    test('getStats should return empty healthMetrics if monitoring is disabled', () => {
      daemon.config.enableMonitoring = false;
      const stats = daemon.getStats();
      expect(stats.healthMetrics).toEqual({});
    });
  });
});


