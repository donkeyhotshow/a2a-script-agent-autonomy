/**
 * JobManager - Управление Job ID и процессами
 * Функции:
 * - Генерация уникальных Job ID
 * - Поиск процессов по Job ID
 * - Автоматическая очистка завершенных процессов
 */

const FileSystemUtils = require('@libs/system/file-operations');
const { LoggingUtils } = require('@libs/logging-monitoring/logging');
const { JOB_ID_PREFIX, PROCESS_STATUSES } = require('./types/SpawnTypes');
const path = require('path');

class JobManager {
  constructor(options = {}, logger, fileSystem) {
    this.jobsFile = options.jobsFile || 'C:/apps/data/spawn-jobs.json';
    this.cleanupInterval = options.cleanupInterval || 300000; // 5 минут
    this.maxJobAge = options.maxJobAge || 86400000; // 24 часа
    this.jobs = new Map(); // jobId -> jobInfo
    this.cleanupTimer = null;
    this.isInitialized = false;
    this.logger = logger || new LoggingUtils();
    this.fileSystem = fileSystem || FileSystemUtils(this.logger);
  }

  /**
   * Инициализация менеджера
   */
  async initialize() {
    try {
      await this.fileSystem.ensureDir(path.dirname(this.jobsFile));
      
      if (await this.fileSystem.exists(this.jobsFile)) {
        await this.loadJobs();
      } else {
        await this.createInitialJobsFile();
      }

      // Запускаем автоматическую очистку
      this.startCleanupTimer();
      
      this.isInitialized = true;
      this.logger.log('✅ JobManager инициализирован');
      
      return true;
    } catch (error) {
      this.logger.error('❌ Ошибка инициализации JobManager:', error);
      throw error;
    }
  }

  /**
   * Создание начального файла jobs
   */
  async createInitialJobsFile() {
    const initialData = {
      version: "1.0",
      created: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      jobs: {},
      stats: {
        totalJobs: 0,
        activeJobs: 0,
        completedJobs: 0,
        failedJobs: 0
      }
    };

    await this.fileSystem.writeFile(this.jobsFile, JSON.stringify(initialData, null, 2));
    this.logger.log('📄 Создан начальный файл jobs');
  }

  /**
   * Загрузка jobs из файла
   */
  async loadJobs() {
    try {
      const data = JSON.parse(await this.fileSystem.readFile(this.jobsFile, 'utf8'));
      
      // Загружаем только активные jobs
      for (const [jobId, jobInfo] of Object.entries(data.jobs)) {
        if (jobInfo.status === PROCESS_STATUSES.RUNNING) {
          this.jobs.set(jobId, jobInfo);
        }
      }

      this.logger.log(`📊 Загружено ${this.jobs.size} активных jobs`);
      return data;
    } catch (error) {
      this.logger.error('Ошибка загрузки jobs:', error);
      throw error;
    }
  }

  /**
   * Генерация уникального Job ID
   */
  generateJobId(daemonId = 'unknown') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const jobId = `${JOB_ID_PREFIX}-${timestamp}-${random}`;
    
    return {
      jobId,
      timestamp,
      random,
      daemonId
    };
  }

  /**
   * Регистрация нового job
   */
  async registerJob(jobInfo) {
    try {
      const { jobId, daemonId } = jobInfo;
      
      const job = {
        ...jobInfo,
        status: PROCESS_STATUSES.PENDING,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      };

      this.jobs.set(jobId, job);
      await this.saveJobs();
      
      this.logger.log(`📝 Зарегистрирован job: ${jobId} (Демон: ${daemonId})`);
      
      return job;
    } catch (error) {
      this.logger.error(`❌ Ошибка регистрации job ${jobInfo.jobId}:`, error);
      throw error;
    }
  }

  /**
   * Поиск job по ID
   */
  async findJobById(jobId) {
    try {
      // Сначала ищем в памяти
      if (this.jobs.has(jobId)) {
        return this.jobs.get(jobId);
      }

      // Если не найден, проверяем файл
      const data = JSON.parse(await this.fileSystem.readFile(this.jobsFile, 'utf8'));
      return data.jobs[jobId] || null;
    } catch (error) {
      this.logger.error(`❌ Ошибка поиска job ${jobId}:`, error);
      return null;
    }
  }

  /**
   * Поиск jobs по демону
   */
  async findJobsByDaemon(daemonId) {
    try {
      const jobs = [];
      
      // Поиск в памяти
      for (const [jobId, jobInfo] of this.jobs) {
        if (jobInfo.daemonId === daemonId) {
          jobs.push({ jobId, ...jobInfo });
        }
      }

      // Поиск в файле для завершенных jobs
      const data = JSON.parse(await this.fileSystem.readFile(this.jobsFile, 'utf8'));
      for (const [jobId, jobInfo] of Object.entries(data.jobs)) {
        if (jobInfo.daemonId === daemonId && !this.jobs.has(jobId)) {
          jobs.push({ jobId, ...jobInfo });
        }
      }

      return jobs;
    } catch (error) {
      this.logger.error(`❌ Ошибка поиска jobs для демона ${daemonId}:`, error);
      return [];
    }
  }

  /**
   * Обновление статуса job
   */
  async updateJobStatus(jobId, status, additionalData = {}) {
    try {
      const job = this.jobs.get(jobId);
      
      if (!job) {
        throw new Error(`Job ${jobId} не найден`);
      }

      const updatedJob = {
        ...job,
        status,
        updated: new Date().toISOString(),
        ...additionalData
      };

      // Специальная обработка для разных статусов
      switch (status) {
        case PROCESS_STATUSES.RUNNING:
          updatedJob.startedAt = new Date().toISOString();
          break;
        case PROCESS_STATUSES.COMPLETED:
          updatedJob.completedAt = new Date().toISOString();
          break;
        case PROCESS_STATUSES.FAILED:
          updatedJob.failedAt = new Date().toISOString();
          break;
        case PROCESS_STATUSES.KILLED:
          updatedJob.killedAt = new Date().toISOString();
          break;
      }

      this.jobs.set(jobId, updatedJob);
      await this.saveJobs();
      
      this.logger.log(`🔄 Обновлен статус job ${jobId}: ${status}`);
      
      return updatedJob;
    } catch (error) {
      this.logger.error(`❌ Ошибка обновления статуса job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Удаление job
   */
  async removeJob(jobId) {
    try {
      const removed = this.jobs.delete(jobId);
      
      if (removed) {
        await this.saveJobs();
        this.logger.log(`🗑️ Удален job: ${jobId}`);
      }
      
      return removed;
    } catch (error) {
      this.logger.error(`❌ Ошибка удаления job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Автоматическая очистка завершенных jobs
   */
  async cleanupCompletedJobs() {
    try {
      const now = Date.now();
      let cleanedCount = 0;
      
      for (const [jobId, jobInfo] of this.jobs) {
        const jobAge = now - new Date(jobInfo.created).getTime();
        
        // Удаляем завершенные jobs старше maxJobAge
        if (jobAge > this.maxJobAge && 
            [PROCESS_STATUSES.COMPLETED, PROCESS_STATUSES.FAILED, PROCESS_STATUSES.KILLED].includes(jobInfo.status)) {
          this.jobs.delete(jobId);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        await this.saveJobs();
        this.logger.log(`🧹 Очищено ${cleanedCount} завершенных jobs`);
      }

      return cleanedCount;
    } catch (error) {
      this.logger.error('❌ Ошибка очистки jobs:', error);
      throw error;
    }
  }

  /**
   * Сохранение jobs в файл
   */
  async saveJobs() {
    try {
      const jobsData = {};
      
      for (const [jobId, jobInfo] of this.jobs) {
        jobsData[jobId] = jobInfo;
      }

      const data = {
        version: "1.0",
        lastUpdate: new Date().toISOString(),
        jobs: jobsData,
        stats: this.getStats()
      };

      await this.fileSystem.writeFile(this.jobsFile, JSON.stringify(data, null, 2));
    } catch (error) {
      this.logger.error('❌ Ошибка сохранения jobs:', error);
      throw error;
    }
  }

  /**
   * Получение статистики
   */
  getStats() {
    const jobs = Array.from(this.jobs.values());
    
    return {
      totalJobs: jobs.length,
      activeJobs: jobs.filter(j => j.status === PROCESS_STATUSES.RUNNING).length,
      completedJobs: jobs.filter(j => j.status === PROCESS_STATUSES.COMPLETED).length,
      failedJobs: jobs.filter(j => j.status === PROCESS_STATUSES.FAILED).length,
      killedJobs: jobs.filter(j => j.status === PROCESS_STATUSES.KILLED).length
    };
  }

  /**
   * Запуск таймера очистки
   */
  startCleanupTimer() {
    this.cleanupTimer = setInterval(() => {
      this.cleanupCompletedJobs().catch(error => {
        this.logger.error('Ошибка автоматической очистки jobs:', error);
      });
    }, this.cleanupInterval);
  }

  /**
   * Остановка таймера очистки
   */
  stopCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Остановка менеджера
   */
  async stop() {
    this.stopCleanupTimer();
    await this.saveJobs();
    this.logger.log('🛑 JobManager остановлен');
  }
}

module.exports = { JobManager };

