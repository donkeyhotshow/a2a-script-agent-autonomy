const { ProcessSpawner } = require('../ProcessSpawner');
const { SpawnConfig } = require('../SpawnConfig');
const { JobManager } = require('../JobManager');
const { ProcessMonitor } = require('../ProcessMonitor');
const { ProcessKiller } = require('../ProcessKiller');
const { SPAWN_TYPES, PROCESS_STATUSES, RESOURCE_LIMITS } = require('../types/SpawnTypes');
const { spawn, exec, execFile } = require('child_process');
const path = require('path');
const { LoggingUtils } = require('@libs/logging-monitoring/logging');
const FileSystemUtils = require('@libs/system/file-operations');

// Mock dependencies
const mockLoggerInstance = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const mockFileSystemUtilsInstance = {
  ensureDir: jest.fn().mockResolvedValue(undefined),
  join: jest.fn((...args) => path.join(...args)),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(JSON.stringify({ jobs: {} })),
  exists: jest.fn().mockResolvedValue(false),
};

jest.mock('@libs/logging-monitoring/logging', () => ({
  LoggingUtils: jest.fn(() => mockLoggerInstance)
}));

jest.mock('@libs/system/file-operations', () => jest.fn(() => mockFileSystemUtilsInstance));

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn(),
  exec: jest.fn(),
  execFile: jest.fn(),
}));

// Mock internal dependencies
jest.mock('../SpawnConfig', () => ({
  SpawnConfig: jest.fn().mockImplementation(() => ({
    validate: jest.fn(config => ({
      ...config,
      limits: config.limits || { cpuPercent: 100, memoryMB: 1024, timeoutMs: 120000 },
      options: config.options || { monitorResources: false, logOutput: false },
    })),
  })),
}));

jest.mock('../JobManager', () => {
  return {
    JobManager: jest.fn().mockImplementation((options, logger, fileSystem) => ({
      initialize: jest.fn(),
      generateJobId: jest.fn((daemonId) => ({ jobId: `mock-job-${daemonId}`, daemonId })),
      registerJob: jest.fn(job => ({ ...job, status: 'pending' })),
      updateJobStatus: jest.fn(),
      findJobById: jest.fn(),
      getStats: jest.fn(() => ({ totalJobs: 0, activeJobs: 0 })),
      stop: jest.fn(),
      logger: logger,
      fileSystem: fileSystem
    })),
  };
});

jest.mock('../ProcessMonitor', () => ({
  ProcessMonitor: jest.fn().mockImplementation((options, logger, fileSystem) => ({
    start: jest.fn(),
    stop: jest.fn(),
    addProcess: jest.fn(),
    removeProcess: jest.fn(),
    getStats: jest.fn(() => ({ runningProcesses: 0, totalViolations: 0 })),
    logger: logger,
    fileSystem: fileSystem
  })),
}));

jest.mock('../ProcessKiller', () => ({
  ProcessKiller: jest.fn().mockImplementation((options, logger, fileSystem) => ({
    killProcess: jest.fn(),
    getKillHistory: jest.fn(() => []),
    logger: logger,
    fileSystem: fileSystem
  })),
}));

describe('ProcessSpawner', () => {
  let spawner;

  beforeEach(() => {
    jest.clearAllMocks();
    spawner = new ProcessSpawner(undefined, mockLoggerInstance, mockFileSystemUtilsInstance);
    // Re-initialize with mocked versions for nested components
    spawner.jobManager = new JobManager(undefined, mockLoggerInstance, mockFileSystemUtilsInstance);
    spawner.processMonitor = new ProcessMonitor(undefined, mockLoggerInstance, mockFileSystemUtilsInstance);
    spawner.processKiller = new ProcessKiller(undefined, mockLoggerInstance, mockFileSystemUtilsInstance);
    spawner.spawnConfig = new SpawnConfig();
    spawner.isInitialized = false; // Reset for each test
  });

  describe('constructor', () => {
    test('should initialize with default components and empty running processes', () => {
      expect(JobManager).toHaveBeenCalledTimes(1);
      expect(ProcessMonitor).toHaveBeenCalledTimes(1);
      expect(ProcessKiller).toHaveBeenCalledTimes(1);
      expect(SpawnConfig).toHaveBeenCalledTimes(1);
      expect(spawner.runningProcesses).toBeInstanceOf(Map);
      expect(spawner.runningProcesses.size).toBe(0);
      expect(spawner.isInitialized).toBe(false);
      expect(spawner.logFile).toBe('C:/apps/logs/process-spawner.json');
      expect(spawner.logger).toBe(mockLoggerInstance);
      expect(spawner.fileSystem).toBe(mockFileSystemUtilsInstance);
    });

    test('should allow custom logFile path', () => {
      const customSpawner = new ProcessSpawner({ logFile: './custom-log.json' }, mockLoggerInstance, mockFileSystemUtilsInstance);
      expect(customSpawner.logFile).toBe('./custom-log.json');
    });
  });

  describe('initialize', () => {
    test('should initialize all components and set isInitialized to true', async () => {
      await spawner.initialize();

      expect(spawner.jobManager.initialize).toHaveBeenCalledTimes(1);
      expect(spawner.processMonitor.start).toHaveBeenCalledTimes(1);
      expect(mockFileSystemUtilsInstance.ensureDir).toHaveBeenCalledWith(path.dirname(spawner.logFile));
      expect(spawner.isInitialized).toBe(true);
      expect(mockLoggerInstance.log).toHaveBeenCalledWith('✅ ProcessSpawner инициализирован');
    });

    test('should log error and rethrow if initialization fails', async () => {
      const initError = new Error('JobManager init failed');
      spawner.jobManager.initialize.mockRejectedValue(initError);

      await expect(spawner.initialize()).rejects.toThrow(initError);
      expect(mockLoggerInstance.error).toHaveBeenCalledWith('❌ Ошибка инициализации ProcessSpawner:', initError);
      expect(spawner.isInitialized).toBe(false);
    });
  });

  describe('spawn', () => {
    let mockChildProcess;

    beforeEach(() => {
      mockChildProcess = {
        pid: 1000,
        on: jest.fn(),
        stdout: { on: jest.fn(), pipe: jest.fn() },
        stderr: { on: jest.fn(), pipe: jest.fn() },
      };
      spawn.mockReturnValue(mockChildProcess);
      exec.mockImplementation((command, options, callback) => {
        const child = { pid: 1001, on: jest.fn() };
        callback(null, 'stdout-exec', 'stderr-exec');
        return child;
      });
      execFile.mockImplementation((command, args, options, callback) => {
        const child = { pid: 1002, on: jest.fn() };
        callback(null, 'stdout-execFile', 'stderr-execFile');
        return child;
      });
      spawner.isInitialized = true; // Assume initialized for spawn tests
      spawner.jobManager.generateJobId.mockReturnValue({ jobId: 'test-job-id', daemonId: 'test-daemon' });
      spawner.spawnConfig.validate.mockImplementation(config => ({
        ...config,
        limits: config.limits || { cpuPercent: 100, memoryMB: 1024, timeoutMs: 120000 },
        options: config.options || { monitorResources: false, logOutput: false },
      }));
    });

    test('should throw error if spawner is not initialized', async () => {
      spawner.isInitialized = false;
      await expect(spawner.spawn({ command: 'ls' })).rejects.toThrow('ProcessSpawner не инициализирован');
    });

    test('should successfully spawn a process with SPAWN_TYPES.SPAWN', async () => {
      const config = { command: 'node', args: ['script.js'], type: SPAWN_TYPES.SPAWN, daemonId: 'test-daemon' };
      const result = await spawner.spawn(config);

      expect(spawner.spawnConfig.validate).toHaveBeenCalledWith(config);
      expect(spawner.jobManager.generateJobId).toHaveBeenCalledWith('test-daemon');
      expect(spawner.jobManager.registerJob).toHaveBeenCalledWith(expect.objectContaining({
        jobId: 'test-job-id',
        config: expect.any(Object),
      }));
      expect(mockLoggerInstance.log).toHaveBeenCalledWith(expect.stringContaining('Запуск процесса'));
      expect(spawn).toHaveBeenCalledWith('node', ['script.js'], expect.any(Object));
      expect(result).toEqual(expect.objectContaining({
        jobId: 'test-job-id',
        pid: mockChildProcess.pid,
        status: PROCESS_STATUSES.RUNNING,
      }));
      expect(spawner.runningProcesses.has('test-job-id')).toBe(true);
      expect(spawner.jobManager.updateJobStatus).toHaveBeenCalledWith(
        'test-job-id', PROCESS_STATUSES.RUNNING, expect.any(Object)
      );
      expect(spawner.processMonitor.addProcess).not.toHaveBeenCalled();
    });

    test('should successfully spawn a process with SPAWN_TYPES.EXEC', async () => {
      const config = { command: 'echo hello', type: SPAWN_TYPES.EXEC, daemonId: 'test-daemon' };
      const result = await spawner.spawn(config);

      expect(exec).toHaveBeenCalledWith('echo hello', expect.any(Object), expect.any(Function));
      expect(result).toEqual(expect.objectContaining({
        jobId: 'test-job-id',
        pid: 1001,
        status: PROCESS_STATUSES.RUNNING,
      }));
    });

    test('should successfully spawn a process with SPAWN_TYPES.EXEC_FILE', async () => {
      const config = { command: 'script.bat', args: ['arg1'], type: SPAWN_TYPES.EXEC_FILE, daemonId: 'test-daemon' };
      const result = await spawner.spawn(config);

      expect(execFile).toHaveBeenCalledWith('script.bat', ['arg1'], expect.any(Object), expect.any(Function));
      expect(result).toEqual(expect.objectContaining({
        jobId: 'test-job-id',
        pid: 1002,
        status: PROCESS_STATUSES.RUNNING,
      }));
    });

    test('should add process to monitor if monitorResources is true', async () => {
      const config = {
        command: 'node', args: ['script.js'], type: SPAWN_TYPES.SPAWN, daemonId: 'test-daemon',
        options: { monitorResources: true }
      };
      spawner.spawnConfig.validate.mockReturnValue(config);
      const result = await spawner.spawn(config);

      expect(spawner.processMonitor.addProcess).toHaveBeenCalledWith(mockChildProcess.pid, expect.any(Object));
    });

    test('should log output if logOutput is true', async () => {
      const config = {
        command: 'node', args: ['script.js'], type: SPAWN_TYPES.SPAWN, daemonId: 'test-daemon',
        options: { logOutput: true }
      };
      spawner.spawnConfig.validate.mockReturnValue(config);
      await spawner.spawn(config);

      expect(mockChildProcess.stdout.on).toHaveBeenCalledWith('data', expect.any(Function));
      expect(mockChildProcess.stderr.on).toHaveBeenCalledWith('data', expect.any(Function));
      jest.spyOn(spawner, 'logOutput');
      mockChildProcess.stdout.on.mock.calls[0][1](Buffer.from('test output'));
      expect(spawner.logOutput).toHaveBeenCalledWith('test-job-id', 'stdout', 'test output');
    });

    test('should handle unknown spawn type', async () => {
      const config = { command: 'invalid', type: 'UNKNOWN', daemonId: 'test-daemon' };
      spawner.spawnConfig.validate.mockReturnValue(config);

      await expect(spawner.spawn(config)).rejects.toThrow('Неизвестный тип запуска: UNKNOWN');
    });

    test('should handle errors during process spawning', async () => {
      const spawnError = new Error('Failed to spawn');
      spawn.mockImplementationOnce(() => { throw spawnError; });
      const config = { command: 'ls', type: SPAWN_TYPES.SPAWN, daemonId: 'test-daemon' };

      await expect(spawner.spawn(config)).rejects.toThrow(spawnError);
      expect(mockLoggerInstance.error).toHaveBeenCalledWith(expect.stringContaining('Ошибка запуска процесса'), expect.any(Error));
    });

    test('should pass correct env variables', async () => {
      const config = {
        command: 'node', args: ['script.js'], type: SPAWN_TYPES.SPAWN, daemonId: 'test-daemon',
        env: { CUSTOM_VAR: 'custom_value' }
      };
      spawner.spawnConfig.validate.mockReturnValue(config);
      await spawner.spawn(config);
      expect(spawn).toHaveBeenCalledWith(expect.any(String), expect.any(Array), expect.objectContaining({
        env: expect.objectContaining({ CUSTOM_VAR: 'custom_value' })
      }));
    });

    test('should pass correct cwd', async () => {
      const config = {
        command: 'node', args: ['script.js'], type: SPAWN_TYPES.SPAWN, daemonId: 'test-daemon',
        cwd: '/tmp'
      };
      spawner.spawnConfig.validate.mockReturnValue(config);
      await spawner.spawn(config);
      expect(spawn).toHaveBeenCalledWith(expect.any(String), expect.any(Array), expect.objectContaining({
        cwd: '/tmp'
      }));
    });
  });

  describe('Process Event Handlers', () => {
    let mockProcess;
    let jobId;
    let config;

    beforeEach(() => {
      jobId = 'test-event-job';
      config = {
        command: 'test',
        daemonId: 'test-daemon',
        options: { logOutput: false },
      };
      mockProcess = {
        pid: 2000,
        stdout: { on: jest.fn(), pipe: jest.fn() },
        stderr: { on: jest.fn(), pipe: jest.fn() },
        on: jest.fn(),
      };

      spawner.runningProcesses.set(jobId, {
        process: mockProcess,
        jobId,
        daemonId: config.daemonId,
        config,
        startTime: new Date(),
        pid: mockProcess.pid,
      });

      jest.spyOn(spawner, 'logOutput').mockResolvedValue();
      jest.spyOn(spawner, 'logProcessEvent').mockResolvedValue();
      jest.spyOn(spawner.jobManager, 'updateJobStatus').mockResolvedValue();
      jest.spyOn(spawner.processMonitor, 'removeProcess').mockResolvedValue();
    });

    describe('setupProcessHandlers', () => {
      test('should set up data listeners for stdout and stderr if logOutput is true', () => {
        config.options.logOutput = true;
        spawner.setupProcessHandlers(mockProcess, jobId, config);

        expect(mockProcess.stdout.on).toHaveBeenCalledWith('data', expect.any(Function));
        expect(mockProcess.stderr.on).toHaveBeenCalledWith('data', expect.any(Function));
        expect(mockProcess.on).toHaveBeenCalledWith('close', expect.any(Function));
        expect(mockProcess.on).toHaveBeenCalledWith('error', expect.any(Function));
        expect(mockProcess.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
        expect(mockProcess.on).toHaveBeenCalledWith('exit', expect.any(Function));
      });

      test('should not set up data listeners if logOutput is false', () => {
        spawner.setupProcessHandlers(mockProcess, jobId, config);

        expect(mockProcess.stdout.on).not.toHaveBeenCalledWith('data', expect.any(Function));
        expect(mockProcess.stderr.on).not.toHaveBeenCalledWith('data', expect.any(Function));
      });

      test('stdout data handler should call logOutput', () => {
        config.options.logOutput = true;
        spawner.setupProcessHandlers(mockProcess, jobId, config);
        const dataHandler = mockProcess.stdout.on.mock.calls[0][1];
        const testData = 'stdout data';
        dataHandler(Buffer.from(testData));

        expect(spawner.logOutput).toHaveBeenCalledWith(jobId, 'stdout', testData);
      });

      test('stderr data handler should call logOutput', () => {
        config.options.logOutput = true;
        spawner.setupProcessHandlers(mockProcess, jobId, config);
        const dataHandler = mockProcess.stderr.on.mock.calls[0][1];
        const testData = 'stderr data';
        dataHandler(Buffer.from(testData));

        expect(spawner.logOutput).toHaveBeenCalledWith(jobId, 'stderr', testData);
      });
    });

    describe('handleProcessClose', () => {
      test('should update status to COMPLETED and log event on successful close', async () => {
        const closeHandler = jest.fn();
        mockProcess.on.mockImplementation((event, cb) => { if (event === 'close') closeHandler = cb; });
        spawner.setupProcessHandlers(mockProcess, jobId, config);

        await closeHandler(0);

        expect(spawner.jobManager.updateJobStatus).toHaveBeenCalledWith(
          jobId, PROCESS_STATUSES.COMPLETED, expect.any(Object)
        );
        expect(spawner.processMonitor.removeProcess).toHaveBeenCalledWith(mockProcess.pid);
        expect(spawner.runningProcesses.has(jobId)).toBe(false);
        expect(spawner.logProcessEvent).toHaveBeenCalledWith(jobId, 'close', expect.any(Object));
        expect(mockLoggerInstance.log).toHaveBeenCalledWith(expect.stringContaining('Процесс test-event-job завершен с кодом 0'));
      });

      test('should update status to FAILED and log event on failed close', async () => {
        const closeHandler = jest.fn();
        mockProcess.on.mockImplementation((event, cb) => { if (event === 'close') closeHandler = cb; });
        spawner.setupProcessHandlers(mockProcess, jobId, config);

        await closeHandler(1);

        expect(spawner.jobManager.updateJobStatus).toHaveBeenCalledWith(
          jobId, PROCESS_STATUSES.FAILED, expect.any(Object)
        );
        expect(spawner.processMonitor.removeProcess).toHaveBeenCalledWith(mockProcess.pid);
        expect(spawner.runningProcesses.has(jobId)).toBe(false);
        expect(spawner.logProcessEvent).toHaveBeenCalledWith(jobId, 'close', expect.any(Object));
        expect(mockLoggerInstance.log).toHaveBeenCalledWith(expect.stringContaining('Процесс test-event-job завершен с кодом 1'));
      });

      test('should do nothing if processInfo not found', async () => {
        spawner.runningProcesses.delete(jobId); // Remove process from map
        await spawner.handleProcessClose(jobId, 0, {});

        expect(spawner.jobManager.updateJobStatus).not.toHaveBeenCalled();
        expect(spawner.processMonitor.removeProcess).not.toHaveBeenCalled();
        expect(spawner.logProcessEvent).not.toHaveBeenCalled();
      });

      test('should log error if handleProcessClose fails', async () => {
        spawner.jobManager.updateJobStatus.mockRejectedValue(new Error('Update failed'));
        await spawner.handleProcessClose(jobId, 0, {});

        expect(mockLoggerInstance.error).toHaveBeenCalledWith(expect.stringContaining('Ошибка обработки завершения процесса'), expect.any(Error));
      });
    });

    describe('handleProcessError', () => {
      test('should update status to FAILED and log error', async () => {
        const error = new Error('Process error');
        await spawner.handleProcessError(jobId, error);

        expect(spawner.jobManager.updateJobStatus).toHaveBeenCalledWith(
          jobId, PROCESS_STATUSES.FAILED, expect.objectContaining({ error: error.message })
        );
        expect(spawner.processMonitor.removeProcess).toHaveBeenCalledWith(mockProcess.pid);
        expect(spawner.runningProcesses.has(jobId)).toBe(false);
        expect(spawner.logProcessEvent).toHaveBeenCalledWith(jobId, 'error', expect.objectContaining({ error: error.message }));
        expect(mockLoggerInstance.error).toHaveBeenCalledWith(expect.stringContaining(`Ошибка процесса ${jobId}`), error);
      });

      test('should log logging error gracefully', async () => {
        const error = new Error('Process error');
        spawner.logProcessEvent.mockRejectedValue(new Error('Log failed'));
        await spawner.handleProcessError(jobId, error);

        expect(mockLoggerInstance.error).toHaveBeenCalledWith(expect.stringContaining('Ошибка процесса'), error); // Original error logged
        expect(mockLoggerInstance.error).toHaveBeenCalledWith(expect.stringContaining('Ошибка логирования ошибки процесса'), expect.any(Error)); // Logging error logged
      });
    });

    describe('handleProcessDisconnect', () => {
      test('should log disconnect event', async () => {
        await spawner.handleProcessDisconnect(jobId);

        expect(spawner.logProcessEvent).toHaveBeenCalledWith(jobId, 'disconnect', {});
        expect(mockLoggerInstance.log).toHaveBeenCalledWith(expect.stringContaining(`Процесс ${jobId} отключен`));
      });
    });

    describe('handleProcessExit', () => {
      test('should log exit event', async () => {
        const code = 0;
        const signal = null;
        await spawner.handleProcessExit(jobId, code, signal);

        expect(spawner.logProcessEvent).toHaveBeenCalledWith(jobId, 'exit', { code, signal });
        expect(mockLoggerInstance.log).toHaveBeenCalledWith(expect.stringContaining(`Процесс ${jobId} вышел`));
      });
    });
  });

  describe('stopProcess', () => {
    let jobId;
    let processInfo;

    beforeEach(() => {
      jobId = 'test-stop-job';
      processInfo = {
        process: { pid: 3000, killed: false },
        jobId,
        daemonId: 'test-daemon',
        config: { command: 'test', options: {} },
        startTime: new Date(),
        pid: 3000,
      };
      spawner.runningProcesses.set(jobId, processInfo);
      spawner.processKiller.killProcess.mockResolvedValue({ success: true, reason: 'killed' });
      jest.spyOn(spawner.jobManager, 'updateJobStatus').mockResolvedValue();
      jest.spyOn(spawner.processMonitor, 'removeProcess').mockResolvedValue();
    });

    test('should stop a running process gracefully', async () => {
      const result = await spawner.stopProcess(jobId);

      expect(spawner.processKiller.killProcess).toHaveBeenCalledWith(
        processInfo.pid, expect.objectContaining({ killType: 'graceful', jobId })
      );
      expect(spawner.jobManager.updateJobStatus).toHaveBeenCalledWith(
        jobId, PROCESS_STATUSES.KILLED, expect.any(Object)
      );
      expect(spawner.processMonitor.removeProcess).toHaveBeenCalledWith(processInfo.pid);
      expect(spawner.runningProcesses.has(jobId)).toBe(false);
      expect(mockLoggerInstance.log).toHaveBeenCalledWith(expect.stringContaining(`Процесс ${jobId} остановлен`));
      expect(result.success).toBe(true);
    });

    test('should stop a running process with specified killType', async () => {
      const result = await spawner.stopProcess(jobId, 'force');

      expect(spawner.processKiller.killProcess).toHaveBeenCalledWith(
        processInfo.pid, expect.objectContaining({ killType: 'force' })
      );
    });

    test('should throw error if process not found', async () => {
      await expect(spawner.stopProcess('non-existent-job')).rejects.toThrow('Процесс non-existent-job не найден');
    });

    test('should throw error if killProcess fails', async () => {
      spawner.processKiller.killProcess.mockResolvedValue({ success: false, reason: 'failed to kill' });

      await expect(spawner.stopProcess(jobId)).rejects.toThrow('Не удалось остановить процесс: failed to kill');
      expect(mockLoggerInstance.error).toHaveBeenCalledWith(expect.stringContaining(`Ошибка остановки процесса ${jobId}`), expect.any(Error));
    });

    test('should log error if stopProcess fails', async () => {
      spawner.processKiller.killProcess.mockRejectedValue(new Error('Kill error'));

      await expect(spawner.stopProcess(jobId)).rejects.toThrow('Kill error');
      expect(mockLoggerInstance.error).toHaveBeenCalledWith(expect.stringContaining(`Ошибка остановки процесса ${jobId}`), expect.any(Error));
    });
  });

  describe('getProcessStatus', () => {
    let jobId;
    let processInfo;

    beforeEach(() => {
      jobId = 'test-status-job';
      processInfo = {
        process: { pid: 4000, killed: false },
        jobId,
        daemonId: 'test-daemon',
        config: { command: 'test', options: {} },
        startTime: new Date(),
        pid: 4000,
      };
      spawner.runningProcesses.set(jobId, processInfo);
      spawner.jobManager.findJobById.mockResolvedValue({ ...processInfo, status: PROCESS_STATUSES.RUNNING });
    });

    test('should return process status for a running process', async () => {
      const status = await spawner.getProcessStatus(jobId);

      expect(status).toEqual(expect.objectContaining({
        jobId,
        status: PROCESS_STATUSES.RUNNING,
        pid: 4000,
        isRunning: true,
      }));
    });

    test('should return not_found status if job not found', async () => {
      spawner.jobManager.findJobById.mockResolvedValue(null);
      const status = await spawner.getProcessStatus('non-existent');

      expect(status).toEqual({ status: 'not_found' });
    });

    test('should return isRunning false if process is killed', async () => {
      processInfo.process.killed = true;
      const status = await spawner.getProcessStatus(jobId);

      expect(status.isRunning).toBe(false);
    });

    test('should return error status if getProcessStatus fails', async () => {
      spawner.jobManager.findJobById.mockRejectedValue(new Error('DB error'));
      const status = await spawner.getProcessStatus(jobId);

      expect(status).toEqual({ status: 'error', error: 'DB error' });
    });
  });

  describe('getAllProcesses', () => {
    test('should return statuses for all running processes', async () => {
      const jobId1 = 'job1';
      const jobId2 = 'job2';
      const processInfo1 = { process: { pid: 5000, killed: false }, jobId: jobId1, daemonId: 'd1', config: {}, startTime: new Date(), pid: 5000 };
      const processInfo2 = { process: { pid: 5001, killed: false }, jobId: jobId2, daemonId: 'd2', config: {}, startTime: new Date(), pid: 5001 };

      spawner.runningProcesses.set(jobId1, processInfo1);
      spawner.runningProcesses.set(jobId2, processInfo2);

      jest.spyOn(spawner, 'getProcessStatus')
        .mockResolvedValueOnce({ jobId: jobId1, status: PROCESS_STATUSES.RUNNING, pid: 5000, isRunning: true })
        .mockResolvedValueOnce({ jobId: jobId2, status: PROCESS_STATUSES.RUNNING, pid: 5001, isRunning: true });

      const allProcesses = await spawner.getAllProcesses();

      expect(allProcesses).toHaveLength(2);
      expect(allProcesses[0].jobId).toBe(jobId1);
      expect(allProcesses[1].jobId).toBe(jobId2);
      expect(spawner.getProcessStatus).toHaveBeenCalledTimes(2);
    });

    test('should return empty array if no processes are running', async () => {
      const allProcesses = await spawner.getAllProcesses();
      expect(allProcesses).toEqual([]);
    });
  });

  describe('logOutput', () => {
    beforeEach(() => {
      spawner.logFile = './test-log.json';
      mockFileSystemUtilsInstance.exists.mockResolvedValue(false);
      mockFileSystemUtilsInstance.writeFile.mockResolvedValue();
      mockFileSystemUtilsInstance.readFile.mockResolvedValue('[]');
    });

    test('should log output to file and manage log size', async () => {
      const jobId = 'log-job';
      const output = 'test output line';

      await spawner.logOutput(jobId, 'stdout', output);

      expect(mockFileSystemUtilsInstance.exists).toHaveBeenCalledWith(spawner.logFile);
      expect(mockFileSystemUtilsInstance.writeFile).toHaveBeenCalledWith(
        spawner.logFile,
        JSON.stringify([
          expect.objectContaining({ jobId, type: 'stdout', output: 'test output line' })
        ], null, 2)
      );
    });

    test('should append to existing log file', async () => {
      const jobId = 'log-job';
      const existingLogEntry = { timestamp: new Date().toISOString(), jobId: 'old-job', type: 'stdout', output: 'old output' };
      mockFileSystemUtilsInstance.exists.mockResolvedValue(true);
      mockFileSystemUtilsInstance.readFile.mockResolvedValue(JSON.stringify([existingLogEntry]));

      await spawner.logOutput(jobId, 'stdout', 'new output');

      expect(mockFileSystemUtilsInstance.writeFile).toHaveBeenCalledWith(
        spawner.logFile,
        JSON.stringify([
          existingLogEntry,
          expect.objectContaining({ jobId, type: 'stdout', output: 'new output' })
        ], null, 2)
      );
    });

    test('should cap log to 10000 entries', async () => {
      mockFileSystemUtilsInstance.exists.mockResolvedValue(true);
      const largeLog = Array.from({ length: 10000 }, (_, i) => ({ id: i }));
      mockFileSystemUtilsInstance.readFile.mockResolvedValue(JSON.stringify(largeLog));

      await spawner.logOutput('cap-job', 'stdout', 'new entry');

      const writtenContent = mockFileSystemUtilsInstance.writeFile.mock.calls[0][1];
      const parsedContent = JSON.parse(writtenContent);
      expect(parsedContent).toHaveLength(10000);
      expect(parsedContent[0].id).toBe(1); // Oldest should be removed
      expect(parsedContent[9999].output).toBe('new entry');
    });

    test('should handle logging error gracefully', async () => {
      mockFileSystemUtilsInstance.writeFile.mockRejectedValue(new Error('Write error'));

      await spawner.logOutput('error-job', 'stdout', 'error output');

      expect(mockLoggerInstance.error).toHaveBeenCalledWith(expect.stringContaining('Ошибка логирования вывода:'), expect.any(Error));
    });
  });

  describe('logProcessEvent', () => {
    beforeEach(() => {
      spawner.logFile = './test-event-log.json';
      mockFileSystemUtilsInstance.exists.mockResolvedValue(false);
      mockFileSystemUtilsInstance.writeFile.mockResolvedValue();
      mockFileSystemUtilsInstance.readFile.mockResolvedValue('[]');
    });

    test('should log process event to file and manage log size', async () => {
      const jobId = 'event-job';
      const event = 'test-event';
      const data = { key: 'value' };

      await spawner.logProcessEvent(jobId, event, data);

      expect(mockFileSystemUtilsInstance.exists).toHaveBeenCalledWith(spawner.logFile);
      expect(mockFileSystemUtilsInstance.writeFile).toHaveBeenCalledWith(
        spawner.logFile,
        JSON.stringify([
          expect.objectContaining({ jobId, event, data })
        ], null, 2)
      );
    });

    test('should append to existing event log file', async () => {
      const jobId = 'event-job';
      const existingEvent = { timestamp: new Date().toISOString(), jobId: 'old-event-job', event: 'old-event', data: {} };
      mockFileSystemUtilsInstance.exists.mockResolvedValue(true);
      mockFileSystemUtilsInstance.readFile.mockResolvedValue(JSON.stringify([existingEvent]));

      await spawner.logProcessEvent(jobId, 'new-event', { newKey: 'newValue' });

      expect(mockFileSystemUtilsInstance.writeFile).toHaveBeenCalledWith(
        spawner.logFile,
        JSON.stringify([
          existingEvent,
          expect.objectContaining({ jobId, event: 'new-event', data: { newKey: 'newValue' } })
        ], null, 2)
      );
    });

    test('should cap event log to 10000 entries', async () => {
      mockFileSystemUtilsInstance.exists.mockResolvedValue(true);
      const largeLog = Array.from({ length: 10000 }, (_, i) => ({ id: i }));
      mockFileSystemUtilsInstance.readFile.mockResolvedValue(JSON.stringify(largeLog));

      await spawner.logProcessEvent('cap-event-job', 'new-event', {});

      const writtenContent = mockFileSystemUtilsInstance.writeFile.mock.calls[0][1];
      const parsedContent = JSON.parse(writtenContent);
      expect(parsedContent).toHaveLength(10000);
      expect(parsedContent[0].id).toBe(1); // Oldest should be removed
      expect(parsedContent[9999].event).toBe('new-event');
    });

    test('should handle logging error gracefully', async () => {
      mockFileSystemUtilsInstance.writeFile.mockRejectedValue(new Error('Write error'));

      await spawner.logProcessEvent('error-event-job', 'error-event', {});

      expect(mockLoggerInstance.error).toHaveBeenCalledWith(expect.stringContaining('Ошибка логирования события процесса:'), expect.any(Error));
    });
  });

  describe('getStats', () => {
    test('should return correct statistics', () => {
      spawner.runningProcesses.set('job1', {});
      spawner.runningProcesses.set('job2', {});
      spawner.jobManager.getStats.mockReturnValue({ totalJobs: 5, activeJobs: 2 });
      spawner.processMonitor.getStats.mockReturnValue({ runningProcesses: 1, totalViolations: 3 });
      spawner.processKiller.getKillHistory.mockReturnValue([{}, {}]); // 2 entries

      const stats = spawner.getStats();

      expect(stats.runningProcesses).toBe(2);
      expect(stats.jobManager.totalJobs).toBe(5);
      expect(stats.jobManager.activeJobs).toBe(2);
      expect(stats.processMonitor.runningProcesses).toBe(1);
      expect(stats.processMonitor.totalViolations).toBe(3);
      expect(stats.processKiller).toBe(2);
    });
  });

  describe('stop', () => {
    test('should stop all running processes and components', async () => {
      const jobId1 = 'stop-job1';
      const jobId2 = 'stop-job2';
      spawner.runningProcesses.set(jobId1, { process: { pid: 6000 }, jobId: jobId1, daemonId: 'd1', config: {}, startTime: new Date(), pid: 6000 });
      spawner.runningProcesses.set(jobId2, { process: { pid: 6001 }, jobId: jobId2, daemonId: 'd2', config: {}, startTime: new Date(), pid: 6001 });

      jest.spyOn(spawner, 'stopProcess').mockResolvedValue({ success: true });

      await spawner.stop();

      expect(spawner.stopProcess).toHaveBeenCalledTimes(2);
      expect(spawner.stopProcess).toHaveBeenCalledWith(jobId1, 'graceful');
      expect(spawner.stopProcess).toHaveBeenCalledWith(jobId2, 'graceful');
      expect(spawner.processMonitor.stop).toHaveBeenCalledTimes(1);
      expect(spawner.jobManager.stop).toHaveBeenCalledTimes(1);
      expect(mockLoggerInstance.log).toHaveBeenCalledWith('🛑 Остановка ProcessSpawner...');
      expect(mockLoggerInstance.log).toHaveBeenCalledWith('✅ ProcessSpawner остановлен');
      expect(spawner.runningProcesses.size).toBe(0);
    });

    test('should handle errors during individual process stop gracefully', async () => {
      const jobId1 = 'stop-job1-error';
      const jobId2 = 'stop-job2';
      spawner.runningProcesses.set(jobId1, { process: { pid: 6002 }, jobId: jobId1, daemonId: 'd1', config: {}, startTime: new Date(), pid: 6002 });
      spawner.runningProcesses.set(jobId2, { process: { pid: 6003 }, jobId: jobId2, daemonId: 'd2', config: {}, startTime: new Date(), pid: 6003 });

      jest.spyOn(spawner, 'stopProcess')
        .mockRejectedValueOnce(new Error('Failed to stop job1'))
        .mockResolvedValueOnce({ success: true });

      await spawner.stop();

      expect(spawner.stopProcess).toHaveBeenCalledTimes(2);
      expect(mockLoggerInstance.error).toHaveBeenCalledWith(expect.stringContaining('Ошибка остановки процесса stop-job1-error:'), expect.any(Error));
      expect(spawner.processMonitor.stop).toHaveBeenCalledTimes(1);
      expect(spawner.jobManager.stop).toHaveBeenCalledTimes(1);
      expect(spawner.runningProcesses.size).toBe(0);
    });

    test('should rethrow error if a core component stop fails', async () => {
      spawner.processMonitor.stop.mockRejectedValue(new Error('Monitor stop error'));

      await expect(spawner.stop()).rejects.toThrow('Monitor stop error');
      expect(mockLoggerInstance.error).toHaveBeenCalledWith(expect.stringContaining('❌ Ошибка остановки ProcessSpawner:'), expect.any(Error));
    });
  });
});
