const { JobManager } = require('../JobManager');
const { PROCESS_STATUSES } = require('../types/SpawnTypes');
const FileSystemUtils = require('@libs/system/file-operations');
const { LoggingUtils } = require('@libs/logging-monitoring/logging');
const path = require('path');
const os = require('os');

// Mock timers
jest.useFakeTimers();

const mockFileSystemUtilsInstance = {
  ensureDir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(JSON.stringify({ jobs: {} })),
  exists: jest.fn().mockResolvedValue(false),
  deleteFile: jest.fn().mockResolvedValue(undefined),
};

const mockLoggerInstance = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

jest.mock('@libs/system/file-operations', () => jest.fn(() => mockFileSystemUtilsInstance));
jest.mock('@libs/logging-monitoring/logging', () => ({
  LoggingUtils: jest.fn(() => mockLoggerInstance)
}));

describe('JobManager', () => {
  let jobManager;
  let mockJobsFile;

  beforeEach(() => {
    jest.clearAllMocks();
    mockJobsFile = path.join(os.tmpdir(), `test-spawn-jobs-${Date.now()}.json`);
    jobManager = new JobManager({ jobsFile: mockJobsFile, cleanupInterval: 100 }, mockLoggerInstance, mockFileSystemUtilsInstance);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    if (await mockFileSystemUtilsInstance.exists(mockJobsFile)) {
      await mockFileSystemUtilsInstance.deleteFile(mockJobsFile);
    }
  });

  describe('constructor', () => {
    test('should initialize with default options', () => {
      const defaultManager = new JobManager(undefined, mockLoggerInstance, mockFileSystemUtilsInstance);
      expect(defaultManager.jobsFile).toBe('C:/apps/data/spawn-jobs.json');
      expect(defaultManager.cleanupInterval).toBe(300000);
      expect(defaultManager.maxJobAge).toBe(86400000);
      expect(defaultManager.jobs).toBeInstanceOf(Map);
      expect(defaultManager.cleanupTimer).toBeNull();
      expect(defaultManager.isInitialized).toBe(false);
      expect(defaultManager.logger).toBe(mockLoggerInstance);
      expect(defaultManager.fileSystem).toBe(mockFileSystemUtilsInstance);
    });

    test('should initialize with custom options', () => {
      expect(jobManager.jobsFile).toBe(mockJobsFile);
      expect(jobManager.cleanupInterval).toBe(100);
    });
  });

  describe('initialize', () => {
    test('should create initial jobs file if it does not exist', async () => {
      mockFileSystemUtilsInstance.exists.mockResolvedValueOnce(false);
      const createInitialJobsFileSpy = jest.spyOn(jobManager, 'createInitialJobsFile').mockResolvedValue(undefined);
      const startCleanupTimerSpy = jest.spyOn(jobManager, 'startCleanupTimer').mockImplementation(() => {});

      await jobManager.initialize();

      expect(mockFileSystemUtilsInstance.ensureDir).toHaveBeenCalledWith(path.dirname(mockJobsFile));
      expect(createInitialJobsFileSpy).toHaveBeenCalledTimes(1);
      expect(startCleanupTimerSpy).toHaveBeenCalledTimes(1);
      expect(jobManager.isInitialized).toBe(true);
      expect(mockLoggerInstance.log).toHaveBeenCalledWith('✅ JobManager инициализирован');
      createInitialJobsFileSpy.mockRestore();
      startCleanupTimerSpy.mockRestore();
    });

    test('should load jobs if jobs file exists', async () => {
      mockFileSystemUtilsInstance.exists.mockResolvedValueOnce(true);
      const loadJobsSpy = jest.spyOn(jobManager, 'loadJobs').mockResolvedValue(undefined);
      const startCleanupTimerSpy = jest.spyOn(jobManager, 'startCleanupTimer').mockImplementation(() => {});

      await jobManager.initialize();

      expect(loadJobsSpy).toHaveBeenCalledTimes(1);
      expect(startCleanupTimerSpy).toHaveBeenCalledTimes(1);
      expect(jobManager.isInitialized).toBe(true);
      loadJobsSpy.mockRestore();
      startCleanupTimerSpy.mockRestore();
    });

    test('should handle initialization errors', async () => {
      mockFileSystemUtilsInstance.ensureDir.mockRejectedValueOnce(new Error('Dir error'));
      await expect(jobManager.initialize()).rejects.toThrow('Dir error');
      expect(mockLoggerInstance.error).toHaveBeenCalledWith('❌ Ошибка инициализации JobManager:', expect.any(Error));
    });
  });

  describe('createInitialJobsFile', () => {
    test('should create a new jobs file with initial data', async () => {
      await jobManager.createInitialJobsFile();

      expect(mockFileSystemUtilsInstance.writeFile).toHaveBeenCalledWith(
        mockJobsFile,
        expect.stringContaining('"version": "1.0"')
      );
      expect(mockLoggerInstance.log).toHaveBeenCalledWith('📄 Создан начальный файл jobs');
    });
  });

  describe('loadJobs', () => {
    test('should load active jobs from file', async () => {
      const mockData = {
        jobs: {
          'job-1': { status: PROCESS_STATUSES.RUNNING, daemonId: 'd1' },
          'job-2': { status: PROCESS_STATUSES.COMPLETED, daemonId: 'd1' },
          'job-3': { status: PROCESS_STATUSES.RUNNING, daemonId: 'd2' },
        },
      };
      mockFileSystemUtilsInstance.readFile.mockResolvedValueOnce(JSON.stringify(mockData));

      await jobManager.loadJobs();

      expect(jobManager.jobs.size).toBe(2);
      expect(jobManager.jobs.has('job-1')).toBe(true);
      expect(jobManager.jobs.has('job-3')).toBe(true);
      expect(mockLoggerInstance.log).toHaveBeenCalledWith('📊 Загружено 2 активных jobs');
    });

    test('should handle load jobs errors', async () => {
      mockFileSystemUtilsInstance.readFile.mockRejectedValueOnce(new Error('Read error'));
      await expect(jobManager.loadJobs()).rejects.toThrow('Read error');
      expect(mockLoggerInstance.error).toHaveBeenCalledWith('Ошибка загрузки jobs:', expect.any(Error));
    });
  });

  describe('generateJobId', () => {
    test('should generate a unique job ID', () => {
      const jobIdInfo1 = jobManager.generateJobId();
      const jobIdInfo2 = jobManager.generateJobId('daemon-1');
      expect(jobIdInfo1.jobId).toMatch(/^job-\d{13}-[a-z0-9]{9}$/);
      expect(jobIdInfo1.jobId).not.toBe(jobIdInfo2.jobId);
      expect(jobIdInfo2.daemonId).toBe('daemon-1');
    });
  });

  describe('registerJob', () => {
    test('should register a new job and save to file', async () => {
      const jobIdInfo = jobManager.generateJobId();
      const jobInfo = { ...jobIdInfo, command: 'test-command' };
      await jobManager.registerJob(jobInfo);

      expect(jobManager.jobs.has(jobIdInfo.jobId)).toBe(true);
      expect(jobManager.jobs.get(jobIdInfo.jobId)).toEqual(expect.objectContaining({
        status: PROCESS_STATUSES.PENDING,
        command: 'test-command',
      }));
      expect(mockFileSystemUtilsInstance.writeFile).toHaveBeenCalledTimes(1);
      expect(mockLoggerInstance.log).toHaveBeenCalledWith(`📝 Зарегистрирован job: ${jobIdInfo.jobId} (Демон: ${jobIdInfo.daemonId})`);
    });

    test('should handle registration errors', async () => {
      const jobIdInfo = jobManager.generateJobId();
      const jobInfo = { ...jobIdInfo, command: 'test-command' };

      // Create a manager with invalid path to force error
      const invalidManager = new JobManager({ jobsFile: '', cleanupInterval: 100 }, mockLoggerInstance, mockFileSystemUtilsInstance);
      await expect(invalidManager.registerJob(jobInfo)).rejects.toThrow();
    });
  });

  describe('findJobById', () => {
    test('should find job in memory', async () => {
      const jobIdInfo = jobManager.generateJobId();
      const jobInfo = { ...jobIdInfo, status: PROCESS_STATUSES.RUNNING };
      jobManager.jobs.set(jobIdInfo.jobId, jobInfo);

      const foundJob = await jobManager.findJobById(jobIdInfo.jobId);
      expect(foundJob).toEqual(jobInfo);
    });

    test('should find job in file if not in memory', async () => {
      const jobIdInfo = jobManager.generateJobId();
      const jobInfo = { ...jobIdInfo, status: PROCESS_STATUSES.COMPLETED };
      mockFileSystemUtilsInstance.writeFile(mockJobsFile, JSON.stringify({ jobs: { [jobIdInfo.jobId]: jobInfo } }));

      const foundJob = await jobManager.findJobById(jobIdInfo.jobId);
      expect(foundJob).toEqual(jobInfo);
    });

    test('should return null if job not found', async () => {
      mockFileSystemUtilsInstance.writeFile(mockJobsFile, JSON.stringify({ jobs: {} }));
      const foundJob = await jobManager.findJobById('non-existent-job');
      expect(foundJob).toBeNull();
    });

    test('should handle find job errors', async () => {
      // Create invalid JSON to cause read error
      mockFileSystemUtilsInstance.writeFile(mockJobsFile, 'invalid json');
      const foundJob = await jobManager.findJobById('any-job');
      expect(foundJob).toBeNull();
    });
  });

  describe('findJobsByDaemon', () => {
    test('should find active and completed jobs by daemon ID', async () => {
      const job1 = { jobId: 'job-1', daemonId: 'd1', status: PROCESS_STATUSES.RUNNING };
      const job2 = { jobId: 'job-2', daemonId: 'd1', status: PROCESS_STATUSES.COMPLETED };
      const job3 = { jobId: 'job-3', daemonId: 'd2', status: PROCESS_STATUSES.RUNNING };

      jobManager.jobs.set(job1.jobId, job1);

      mockFileSystemUtilsInstance.readFile.mockResolvedValueOnce(JSON.stringify({
        jobs: { [job2.jobId]: job2, [job3.jobId]: job3 },
      }));

      const foundJobs = await jobManager.findJobsByDaemon('d1');
      expect(foundJobs).toEqual(expect.arrayContaining([job1, job2]));
      expect(foundJobs.length).toBe(2);
    });

    test('should handle find jobs by daemon errors', async () => {
      mockFileSystemUtilsInstance.readFile.mockRejectedValueOnce(new Error('Read error'));
      const foundJobs = await jobManager.findJobsByDaemon('d1');
      expect(foundJobs).toEqual([]);
      expect(mockLoggerInstance.error).toHaveBeenCalledWith('❌ Ошибка поиска jobs для демона d1:', expect.any(Error));
    });
  });

  describe('updateJobStatus', () => {
    test('should update job status and save to file', async () => {
      const jobIdInfo = jobManager.generateJobId();
      const jobInfo = { ...jobIdInfo, status: PROCESS_STATUSES.PENDING };
      jobManager.jobs.set(jobIdInfo.jobId, jobInfo);

      await jobManager.updateJobStatus(jobIdInfo.jobId, PROCESS_STATUSES.RUNNING, { pid: 123 });

      const updatedJob = jobManager.jobs.get(jobIdInfo.jobId);
      expect(updatedJob.status).toBe(PROCESS_STATUSES.RUNNING);
      expect(updatedJob.pid).toBe(123);
      expect(updatedJob.startedAt).toBeDefined();
      expect(mockFileSystemUtilsInstance.writeFile).toHaveBeenCalledTimes(1);
      expect(mockLoggerInstance.log).toHaveBeenCalledWith(`🔄 Обновлен статус job ${jobIdInfo.jobId}: ${PROCESS_STATUSES.RUNNING}`);
    });

    test('should throw error if job not found', async () => {
      await expect(jobManager.updateJobStatus('non-existent', PROCESS_STATUSES.COMPLETED)).rejects.toThrow('Job non-existent не найден');
      expect(mockLoggerInstance.error).toHaveBeenCalledWith('❌ Ошибка обновления статуса job non-existent:', expect.any(Error));
    });
  });

  describe('removeJob', () => {
    test('should remove a job and save to file', async () => {
      const jobIdInfo = jobManager.generateJobId();
      const jobInfo = { ...jobIdInfo, status: PROCESS_STATUSES.RUNNING };
      jobManager.jobs.set(jobIdInfo.jobId, jobInfo);

      const removed = await jobManager.removeJob(jobIdInfo.jobId);

      expect(removed).toBe(true);
      expect(jobManager.jobs.has(jobIdInfo.jobId)).toBe(false);
      expect(mockFileSystemUtilsInstance.writeFile).toHaveBeenCalledTimes(1);
      expect(mockLoggerInstance.log).toHaveBeenCalledWith(`🗑️ Удален job: ${jobIdInfo.jobId}`);
    });

    test('should return false if job not found', async () => {
      const removed = await jobManager.removeJob('non-existent');
      expect(removed).toBe(false);
      expect(mockFileSystemUtilsInstance.writeFile).not.toHaveBeenCalled();
    });

    test('should handle remove job errors', async () => {
      const jobIdInfo = jobManager.generateJobId();
      const jobInfo = { ...jobIdInfo, status: PROCESS_STATUSES.RUNNING };
      jobManager.jobs.set(jobIdInfo.jobId, jobInfo);
      mockFileSystemUtilsInstance.writeFile.mockRejectedValueOnce(new Error('Write error'));

      await expect(jobManager.removeJob(jobIdInfo.jobId)).rejects.toThrow('Write error');
      expect(mockLoggerInstance.error).toHaveBeenCalledWith(`❌ Ошибка удаления job ${jobIdInfo.jobId}:`, expect.any(Error));
    });
  });

  describe('cleanupCompletedJobs', () => {
    test('should remove old completed, failed, or killed jobs', async () => {
      const oldJobId = jobManager.generateJobId();
      const recentJobId = jobManager.generateJobId();

      jobManager.jobs.set(oldJobId.jobId, {
        ...oldJobId,
        status: PROCESS_STATUSES.COMPLETED,
        created: new Date(Date.now() - jobManager.maxJobAge - 1000).toISOString(),
      });
      jobManager.jobs.set(recentJobId.jobId, {
        ...recentJobId,
        status: PROCESS_STATUSES.COMPLETED,
        created: new Date().toISOString(),
      });

      const cleanedCount = await jobManager.cleanupCompletedJobs();

      expect(cleanedCount).toBe(1);
      expect(jobManager.jobs.has(oldJobId.jobId)).toBe(false);
      expect(jobManager.jobs.has(recentJobId.jobId)).toBe(true);
      expect(mockFileSystemUtilsInstance.writeFile).toHaveBeenCalledTimes(1);
      expect(mockLoggerInstance.log).toHaveBeenCalledWith('🧹 Очищено 1 завершенных jobs');
    });

    test('should not remove active jobs', async () => {
      const activeJobId = jobManager.generateJobId();
      jobManager.jobs.set(activeJobId.jobId, {
        ...activeJobId,
        status: PROCESS_STATUSES.RUNNING,
        created: new Date(Date.now() - jobManager.maxJobAge - 1000).toISOString(),
      });

      const cleanedCount = await jobManager.cleanupCompletedJobs();

      expect(cleanedCount).toBe(0);
      expect(jobManager.jobs.has(activeJobId.jobId)).toBe(true);
      expect(mockFileSystemUtilsInstance.writeFile).not.toHaveBeenCalled();
    });

    test('should handle cleanup errors', async () => {
      mockFileSystemUtilsInstance.writeFile.mockRejectedValueOnce(new Error('Write error'));
      const cleanedCount = await jobManager.cleanupCompletedJobs();
      expect(cleanedCount).toBe(0);
      expect(mockLoggerInstance.error).toHaveBeenCalledWith('❌ Ошибка очистки jobs:', expect.any(Error));
    });
  });

  describe('saveJobs', () => {
    test('should save all current jobs to file', async () => {
      const jobIdInfo = jobManager.generateJobId();
      const jobInfo = { ...jobIdInfo, status: PROCESS_STATUSES.RUNNING };
      jobManager.jobs.set(jobIdInfo.jobId, jobInfo);

      await jobManager.saveJobs();

      expect(mockFileSystemUtilsInstance.writeFile).toHaveBeenCalledTimes(1);
      const savedData = JSON.parse(mockFileSystemUtilsInstance.writeFile.mock.calls[0][1]);
      expect(savedData.jobs[jobIdInfo.jobId]).toEqual(expect.objectContaining({
        status: PROCESS_STATUSES.RUNNING,
      }));
      expect(savedData.stats).toEqual(expect.objectContaining({
        totalJobs: 1,
        activeJobs: 1,
      }));
    });

    test('should handle save jobs errors', async () => {
      mockFileSystemUtilsInstance.writeFile.mockRejectedValueOnce(new Error('Write error'));
      await expect(jobManager.saveJobs()).rejects.toThrow('Write error');
      expect(mockLoggerInstance.error).toHaveBeenCalledWith('❌ Ошибка сохранения jobs:', expect.any(Error));
    });
  });

  describe('getStats', () => {
    test('should return correct job statistics', () => {
      jobManager.jobs.set('job-1', { status: PROCESS_STATUSES.RUNNING });
      jobManager.jobs.set('job-2', { status: PROCESS_STATUSES.COMPLETED });
      jobManager.jobs.set('job-3', { status: PROCESS_STATUSES.FAILED });
      jobManager.jobs.set('job-4', { status: PROCESS_STATUSES.KILLED });

      const stats = jobManager.getStats();
      expect(stats).toEqual({
        totalJobs: 4,
        activeJobs: 1,
        completedJobs: 1,
        failedJobs: 1,
        killedJobs: 1,
      });
    });

    test('should return zero stats for no jobs', () => {
      const stats = jobManager.getStats();
      expect(stats).toEqual({
        totalJobs: 0,
        activeJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        killedJobs: 0,
      });
    });
  });

  describe('cleanup timer', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    test('startCleanupTimer should set an interval', () => {
      jobManager.startCleanupTimer();
      expect(setInterval).toHaveBeenCalledTimes(1);
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), jobManager.cleanupInterval);
    });

    test('stopCleanupTimer should clear the interval', () => {
      jobManager.startCleanupTimer();
      jobManager.stopCleanupTimer();
      expect(clearInterval).toHaveBeenCalledTimes(1);
      expect(clearInterval).toHaveBeenCalledWith(jobManager.cleanupTimer);
    });

    test('cleanupCompletedJobs should be called on interval', () => {
      const cleanupSpy = jest.spyOn(jobManager, 'cleanupCompletedJobs').mockResolvedValue(0);
      jobManager.startCleanupTimer();
      jest.advanceTimersByTime(jobManager.cleanupInterval);
      expect(cleanupSpy).toHaveBeenCalledTimes(1);
      cleanupSpy.mockRestore();
    });

    test('should log error if cleanupCompletedJobs fails', () => {
      jest.spyOn(jobManager, 'cleanupCompletedJobs').mockRejectedValueOnce(new Error('Cleanup error'));
      jobManager.startCleanupTimer();
      jest.advanceTimersByTime(jobManager.cleanupInterval);
      expect(mockLoggerInstance.error).toHaveBeenCalledWith('Ошибка автоматической очистки jobs:', expect.any(Error));
    });
  });

  describe('stop', () => {
    test('should stop cleanup timer and save jobs', async () => {
      const stopCleanupTimerSpy = jest.spyOn(jobManager, 'stopCleanupTimer').mockImplementation(() => {});
      const saveJobsSpy = jest.spyOn(jobManager, 'saveJobs').mockResolvedValue(undefined);

      await jobManager.stop();

      expect(stopCleanupTimerSpy).toHaveBeenCalledTimes(1);
      expect(saveJobsSpy).toHaveBeenCalledTimes(1);
      expect(mockLoggerInstance.log).toHaveBeenCalledWith('🛑 JobManager остановлен');
      stopCleanupTimerSpy.mockRestore();
      saveJobsSpy.mockRestore();
    });
  });
});
