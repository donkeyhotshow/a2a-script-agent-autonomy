/**
 * ProcessSpawner - Универсальный spawn процессов
 * Функции:
 * - Универсальный spawn/exec/execFile без PowerShell
 * - Интеграция с JobManager для Job ID
 * - Интеграция с ProcessMonitor для мониторинга ресурсов
 * - Интеграция с ProcessKiller для завершения
 * - JSON логирование вывода
 */

const { spawn, exec, execFile } = require('child_process');
const { LoggingUtils } = require('@libs/logging-monitoring/logging');
const FileSystemUtils = require('@libs/system/file-operations');
const { SpawnConfig } = require('./SpawnConfig');
const { JobManager } = require('./JobManager');
const { ProcessMonitor } = require('./ProcessMonitor');
const { ProcessKiller } = require('./ProcessKiller');
const { SPAWN_TYPES, PROCESS_STATUSES } = require('./types/SpawnTypes');
const path = require('path');

class ProcessSpawner {
  constructor(options = {}, logger, fileSystem) {
    this.logger = logger || new LoggingUtils();
    this.fileSystem = fileSystem || FileSystemUtils(this.logger);
    
    this.jobManager = new JobManager(options.jobManager, this.logger, this.fileSystem);
    this.processMonitor = new ProcessMonitor(options.processMonitor, this.logger, this.fileSystem);
    this.processKiller = new ProcessKiller(options.processKiller, this.logger, this.fileSystem);
    this.spawnConfig = new SpawnConfig();
    
    this.runningProcesses = new Map(); // jobId -> processInfo
    this.isInitialized = false;
    this.logFile = options.logFile || 'C:/apps/logs/process-spawner.json';
  }

  /**
   * Инициализация spawner
   */
  async initialize() {
    try {
      // Инициализируем компоненты
      await this.jobManager.initialize();
      await this.processMonitor.start();
      
      // Создаем директорию для логов
      await this.fileSystem.ensureDir(path.dirname(this.logFile));
      
      this.isInitialized = true;
      this.logger.log('✅ ProcessSpawner инициализирован');
      
      return true;
    } catch (error) {
      this.logger.error('❌ Ошибка инициализации ProcessSpawner:', error);
      throw error;
    }
  }

  /**
   * Универсальный spawn процесса
   */
  async spawn(config) {
    if (!this.isInitialized) {
      throw new Error('ProcessSpawner не инициализирован');
    }

    try {
      // Валидируем конфигурацию
      const validatedConfig = this.spawnConfig.validate(config);
      
      // Генерируем Job ID
      const jobInfo = this.jobManager.generateJobId(validatedConfig.daemonId);
      
      // Регистрируем job
      const registeredJob = await this.jobManager.registerJob({
        ...jobInfo,
        config: validatedConfig
      });

      this.logger.log(`🚀 Запуск процесса: ${jobInfo.jobId} (${validatedConfig.command})`);

      // Запускаем процесс в зависимости от типа
      let process;
      let processInfo;

      switch (validatedConfig.type) {
        case SPAWN_TYPES.SPAWN:
          processInfo = await this.spawnProcess(validatedConfig, jobInfo);
          break;
        case SPAWN_TYPES.EXEC:
          processInfo = await this.execProcess(validatedConfig, jobInfo);
          break;
        case SPAWN_TYPES.EXEC_FILE:
          processInfo = await this.execFileProcess(validatedConfig, jobInfo);
          break;
        default:
          throw new Error(`Неизвестный тип запуска: ${validatedConfig.type}`);
      }

      // Сохраняем информацию о процессе
      this.runningProcesses.set(jobInfo.jobId, {
        process: processInfo.process,
        jobId: jobInfo.jobId,
        daemonId: validatedConfig.daemonId,
        config: validatedConfig,
        startTime: new Date(),
        pid: processInfo.pid
      });

      // Обновляем статус job
      await this.jobManager.updateJobStatus(jobInfo.jobId, PROCESS_STATUSES.RUNNING, {
        pid: processInfo.pid,
        startTime: new Date().toISOString()
      });

      // Добавляем в мониторинг если включено
      if (validatedConfig.options.monitorResources) {
        this.processMonitor.addProcess(processInfo.pid, {
          daemonId: validatedConfig.daemonId,
          jobId: jobInfo.jobId,
          limits: validatedConfig.limits,
          options: validatedConfig.options
        });
      }

      // Настраиваем обработчики событий
      this.setupProcessHandlers(processInfo.process, jobInfo.jobId, validatedConfig);

      this.logger.log(`✅ Процесс запущен: ${jobInfo.jobId} (PID: ${processInfo.pid})`);

      return {
        jobId: jobInfo.jobId,
        pid: processInfo.pid,
        status: PROCESS_STATUSES.RUNNING,
        config: validatedConfig
      };

    } catch (error) {
      this.logger.error(`❌ Ошибка запуска процесса:`, error);
      throw error;
    }
  }

  /**
   * Запуск через spawn
   */
  async spawnProcess(config, jobInfo) {
    const process = spawn(config.command, config.args, {
      cwd: config.cwd,
      env: { ...process.env, ...config.env },
      stdio: config.options.logOutput ? ['pipe', 'pipe', 'pipe'] : 'ignore',
      shell: true
    });

    return {
      process,
      pid: process.pid,
      type: SPAWN_TYPES.SPAWN
    };
  }

  /**
   * Запуск через exec
   */
  async execProcess(config, jobInfo) {
    return new Promise((resolve, reject) => {
      const process = exec(config.command, {
        cwd: config.cwd,
        env: { ...process.env, ...config.env },
        maxBuffer: 1024 * 1024 // 1MB
      }, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            process,
            pid: process.pid,
            type: SPAWN_TYPES.EXEC,
            stdout,
            stderr
          });
        }
      });
    });
  }

  /**
   * Запуск через execFile
   */
  async execFileProcess(config, jobInfo) {
    return new Promise((resolve, reject) => {
      const process = execFile(config.command, config.args, {
        cwd: config.cwd,
        env: { ...process.env, ...config.env },
        maxBuffer: 1024 * 1024 // 1MB
      }, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            process,
            pid: process.pid,
            type: SPAWN_TYPES.EXEC_FILE,
            stdout,
            stderr
          });
        }
      });
    });
  }

  /**
   * Настройка обработчиков событий процесса
   */
  setupProcessHandlers(process, jobId, config) {
    let stdout = '';
    let stderr = '';

    // Обработка stdout
    if (process.stdout) {
      process.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        
        if (config.options.logOutput) {
          this.logOutput(jobId, 'stdout', output);
        }
      });
    }

    // Обработка stderr
    if (process.stderr) {
      process.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        
        if (config.options.logOutput) {
          this.logOutput(jobId, 'stderr', output);
        }
      });
    }

    // Обработка завершения
    process.on('close', async (code) => {
      await this.handleProcessClose(jobId, code, { stdout, stderr });
    });

    // Обработка ошибок
    process.on('error', async (error) => {
      await this.handleProcessError(jobId, error);
    });

    // Обработка отключения
    process.on('disconnect', async () => {
      await this.handleProcessDisconnect(jobId);
    });

    // Обработка выхода
    process.on('exit', async (code, signal) => {
      await this.handleProcessExit(jobId, code, signal);
    });
  }

  /**
   * Обработка завершения процесса
   */
  async handleProcessClose(jobId, code, output) {
    try {
      const processInfo = this.runningProcesses.get(jobId);
      if (!processInfo) {
        return;
      }

      this.logger.log(`📋 Процесс ${jobId} завершен с кодом ${code}`);

      // Обновляем статус job
      const status = code === 0 ? PROCESS_STATUSES.COMPLETED : PROCESS_STATUSES.FAILED;
      await this.jobManager.updateJobStatus(jobId, status, {
        exitCode: code,
        output,
        endTime: new Date().toISOString()
      });

      // Удаляем из мониторинга
      this.processMonitor.removeProcess(processInfo.pid);

      // Удаляем из списка запущенных
      this.runningProcesses.delete(jobId);

      // Логируем завершение
      await this.logProcessEvent(jobId, 'close', {
        code,
        output,
        duration: Date.now() - processInfo.startTime.getTime()
      });

    } catch (error) {
      this.logger.error(`Ошибка обработки завершения процесса ${jobId}:`, error);
    }
  }

  /**
   * Обработка ошибки процесса
   */
  async handleProcessError(jobId, error) {
    try {
      this.logger.error(`❌ Ошибка процесса ${jobId}:`, error);

      // Обновляем статус job
      await this.jobManager.updateJobStatus(jobId, PROCESS_STATUSES.FAILED, {
        error: error.message,
        endTime: new Date().toISOString()
      });

      // Удаляем из списка запущенных
      const processInfo = this.runningProcesses.get(jobId);
      if (processInfo) {
        this.processMonitor.removeProcess(processInfo.pid);
        this.runningProcesses.delete(jobId);
      }

      // Логируем ошибку
      await this.logProcessEvent(jobId, 'error', {
        error: error.message,
        stack: error.stack
      });

    } catch (logError) {
      this.logger.error(`Ошибка логирования ошибки процесса ${jobId}:`, logError);
    }
  }

  /**
   * Обработка отключения процесса
   */
  async handleProcessDisconnect(jobId) {
    this.logger.log(`🔌 Процесс ${jobId} отключен`);
    await this.logProcessEvent(jobId, 'disconnect', {});
  }

  /**
   * Обработка выхода процесса
   */
  async handleProcessExit(jobId, code, signal) {
    this.logger.log(`🚪 Процесс ${jobId} вышел (код: ${code}, сигнал: ${signal})`);
    await this.logProcessEvent(jobId, 'exit', { code, signal });
  }

  /**
   * Остановка процесса
   */
  async stopProcess(jobId, killType = 'graceful') {
    try {
      const processInfo = this.runningProcesses.get(jobId);
      if (!processInfo) {
        throw new Error(`Процесс ${jobId} не найден`);
      }

      this.logger.log(`🛑 Остановка процесса ${jobId} (PID: ${processInfo.pid})`);

      // Завершаем процесс
      const killResult = await this.processKiller.killProcess(processInfo.pid, {
        killType,
        daemonId: processInfo.daemonId,
        jobId,
        reason: 'manual_stop'
      });

      if (killResult.success) {
        // Обновляем статус job
        await this.jobManager.updateJobStatus(jobId, PROCESS_STATUSES.KILLED, {
          killResult,
          endTime: new Date().toISOString()
        });

        // Удаляем из мониторинга
        this.processMonitor.removeProcess(processInfo.pid);

        // Удаляем из списка запущенных
        this.runningProcesses.delete(jobId);

        this.logger.log(`✅ Процесс ${jobId} остановлен`);
        return { success: true, killResult };
      } else {
        throw new Error(`Не удалось остановить процесс: ${killResult.reason}`);
      }

    } catch (error) {
      this.logger.error(`❌ Ошибка остановки процесса ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Получение статуса процесса
   */
  async getProcessStatus(jobId) {
    try {
      const job = await this.jobManager.findJobById(jobId);
      if (!job) {
        return { status: 'not_found' };
      }

      const processInfo = this.runningProcesses.get(jobId);
      const isRunning = processInfo && processInfo.process && !processInfo.process.killed;

      return {
        jobId,
        status: job.status,
        pid: job.pid,
        startTime: job.startTime,
        isRunning,
        config: job.config
      };
    } catch (error) {
      this.logger.error(`Ошибка получения статуса процесса ${jobId}:`, error);
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Получение всех запущенных процессов
   */
  async getAllProcesses() {
    const processes = [];
    
    for (const [jobId, processInfo] of this.runningProcesses) {
      const status = await this.getProcessStatus(jobId);
      processes.push(status);
    }

    return processes;
  }

  /**
   * Логирование вывода процесса
   */
  async logOutput(jobId, type, output) {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        jobId,
        type,
        output: output.trim()
      };

      let logs = [];
      if (await this.fileSystem.exists(this.logFile)) {
        const content = await this.fileSystem.readFile(this.logFile, 'utf8');
        logs = JSON.parse(content);
      }

      logs.push(logEntry);

      // Ограничиваем размер лога (последние 10000 записей)
      if (logs.length > 10000) {
        logs = logs.slice(-10000);
      }

      await this.fileSystem.writeFile(this.logFile, JSON.stringify(logs, null, 2));
    } catch (error) {
      this.logger.error('Ошибка логирования вывода:', error);
    }
  }

  /**
   * Логирование событий процесса
   */
  async logProcessEvent(jobId, event, data) {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        jobId,
        event,
        data
      };

      let logs = [];
      if (await this.fileSystem.exists(this.logFile)) {
        const content = await this.fileSystem.readFile(this.logFile, 'utf8');
        logs = JSON.parse(content);
      }

      logs.push(logEntry);

      // Ограничиваем размер лога (последние 10000 записей)
      if (logs.length > 10000) {
        logs = logs.slice(-10000);
      }

      await this.fileSystem.writeFile(this.logFile, JSON.stringify(logs, null, 2));
    } catch (error) {
      this.logger.error('Ошибка логирования события процесса:', error);
    }
  }

  /**
   * Получение статистики
   */
  getStats() {
    return {
      runningProcesses: this.runningProcesses.size,
      jobManager: this.jobManager.getStats(),
      processMonitor: this.processMonitor.getStats(),
      processKiller: this.processKiller.getKillHistory().length
    };
  }

  /**
   * Остановка spawner
   */
  async stop() {
    try {
      this.logger.log('🛑 Остановка ProcessSpawner...');

      // Останавливаем все процессы
      const stopPromises = Array.from(this.runningProcesses.keys()).map(jobId =>
        this.stopProcess(jobId, 'graceful').catch(error => {
          this.logger.error(`Ошибка остановки процесса ${jobId}:`, error);
        })
      );

      await Promise.all(stopPromises);

      // Останавливаем компоненты
      await this.processMonitor.stop();
      await this.jobManager.stop();

      this.logger.log('✅ ProcessSpawner остановлен');
    } catch (error) {
      this.logger.error('❌ Ошибка остановки ProcessSpawner:', error);
      throw error;
    }
  }
}

module.exports = { ProcessSpawner };

