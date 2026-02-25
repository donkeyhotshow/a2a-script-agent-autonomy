/**
 * Unified Daemon Utilities Library
 * Объединенная библиотека утилит для управления жизненным циклом демонов и дочерних процессов
 */

const EventEmitter = require('eventemitter3');
const path = require('path');
const fs = require('fs').promises; // Используем нативный fs.promises
const fsSync = require('fs');

const LoggingUtils = require('@libs/logging-monitoring/logging');
const { ErrorHandlingUtils } = require('@libs/error-management/error-handler');
const { ProcessManagementUtils } = require('../process-management');
const { MonitoringUtils } = require('@libs/logging-monitoring/monitoring');

class EnhancedDaemon extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.logger = options.logger || new LoggingUtils();
    this.errorHandler = options.errorHandler || new ErrorHandlingUtils({ logger: this.logger });
    this.processManager = options.processManager || new ProcessManagementUtils({ logger: this.logger, errorHandler: this.errorHandler });
    this.monitoringUtils = options.monitoringUtils || new MonitoringUtils({ logger: this.logger, errorHandler: this.errorHandler });
    // configManager может быть передан отдельно, т.к. может быть специфичным для приложения
    this.configManager = options.configManager || null; 
    
    this.config = {
      daemonScript: options.daemonScript || null,
      workingDir: options.workingDir || process.cwd(),
      enableMonitoring: options.enableMonitoring !== false,
      enableAutoRestart: options.enableAutoRestart !== false,
      enableScheduler: options.enableScheduler !== false,
      maxRestarts: options.maxRestarts || 5,
      restartDelay: options.restartDelay || 5000,
      monitoringConfig: options.monitoringConfig || { enabled: true, timeout: 5000, checkInterval: 30000 }, // Конфигурация для MonitoringUtils
      ...options
    };
    
    this.isRunning = false;
    this.childProcess = null; // Изменено с this.process на this.childProcess во избежание конфликтов с global.process
    this.restartCount = 0;
    this.monitoringTimer = null;
    this.schedulerTimer = null;

    // Инициализация MonitoringUtils с учетом переданной конфигурации
    this.monitoringUtils = options.monitoringUtils || new MonitoringUtils(this.config.monitoringConfig, this.logger);
    
    this.logger.info('[EnhancedDaemon] Инициализирован', {
      workingDir: this.config.workingDir,
      enableMonitoring: this.config.enableMonitoring,
      enableAutoRestart: this.config.enableAutoRestart
    });
  }

  async start() {
    if (this.isRunning) {
      this.logger.warn('[EnhancedDaemon] Демон уже запущен.');
      return;
    }

    try {
      this.logger.info('[EnhancedDaemon] Запуск');
      
      if (this.config.daemonScript) {
        await this.startChildProcess();
      }
      
      if (this.config.enableMonitoring) {
        this.startMonitoring();
      }
      
      if (this.config.enableScheduler) {
        this.startScheduler();
      }
      
      this.isRunning = true;
      this.emit('started');
      
      this.logger.info('[EnhancedDaemon] Успешно запущен.');
    } catch (error) {
      this.errorHandler.handleError(error, { context: 'EnhancedDaemon.start' });
      throw error;
    }
  }

  async stop() {
    if (!this.isRunning) {
      this.logger.warn('[EnhancedDaemon] Демон не запущен.');
      return;
    }

    try {
      this.logger.info('[EnhancedDaemon] Остановка');
      
      this.stopMonitoring();
      this.stopScheduler();
      
      if (this.childProcess) {
        await this.stopChildProcess();
      }
      
      this.isRunning = false;
      this.emit('stopped');
      
      this.logger.info('[EnhancedDaemon] Успешно остановлен.');
    } catch (error) {
      this.errorHandler.handleError(error, { context: 'EnhancedDaemon.stop' });
      throw error;
    }
  }

  async startChildProcess() {
    if (!this.config.daemonScript) {
      throw new Error('Не указан скрипт демона для запуска.');
    }

    const scriptPath = path.resolve(this.config.workingDir, this.config.daemonScript);
    
    if (!fsSync.existsSync(scriptPath)) {
      throw new Error(`Скрипт демона не найден: ${scriptPath}`);
    }

    this.logger.info('[EnhancedDaemon] Запуск дочернего процесса', { scriptPath, cwd: this.config.workingDir });

    try {
      const { child, pid } = await this.processManager.start({
        command: `node ${scriptPath}`,
        cwd: this.config.workingDir,
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'production' },
        // Дополнительные опции, которые могут потребоваться ProcessManagementUtils
      });

      this.childProcess = child;

      this.childProcess.stdout.on('data', (data) => {
        this.logger.info('Демон stdout:', data.toString().trim());
      });

      this.childProcess.stderr.on('data', (data) => {
        this.logger.error('Демон stderr:', data.toString().trim());
      });

      this.childProcess.on('close', (code) => {
        this.logger.info('Дочерний процесс демона завершен', { code, pid });
        this.childProcess = null;
        
        if (this.config.enableAutoRestart && this.restartCount < this.config.maxRestarts) {
          this.restartCount++;
          this.logger.info('[EnhancedDaemon] Перезапуск демона', { restartCount: this.restartCount });
          setTimeout(() => this.startChildProcess(), this.config.restartDelay);
        } else if (this.restartCount >= this.config.maxRestarts) {
          this.logger.error('[EnhancedDaemon] Превышено максимальное количество перезапусков', { maxRestarts: this.config.maxRestarts });
          this.emit('maxRestartsExceeded');
          this.stop(); // Останавливаем демон, если превышено количество перезапусков
        }
      });

      this.childProcess.on('error', (error) => {
        this.logger.error('[EnhancedDaemon] Ошибка дочернего процесса демона:', error);
        this.emit('processError', error);
      });

      this.emit('processStarted', { child: this.childProcess, pid });
    } catch (error) {
      this.errorHandler.handleError(error, { context: 'EnhancedDaemon.startChildProcess' });
      throw error;
    }
  }

  async stopChildProcess() {
    if (!this.childProcess) {
      return;
    }

    this.logger.info('[EnhancedDaemon] Остановка дочернего процесса', { pid: this.childProcess.pid });

    try {
      await this.processManager.kill(this.childProcess.pid); // Используем ProcessManagementUtils для остановки
      this.childProcess = null;
      this.emit('processStopped');
    } catch (error) {
      this.errorHandler.handleError(error, { context: 'EnhancedDaemon.stopChildProcess' });
      throw error;
    }
  }

  startMonitoring() {
    this.logger.info('[EnhancedDaemon] Запуск мониторинга.');
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }
    this.monitoringTimer = setInterval(async () => {
      await this.checkHealth();
    }, this.config.monitoringConfig.checkInterval);
  }

  stopMonitoring() {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
      this.logger.info('[EnhancedDaemon] Мониторинг остановлен.');
    }
  }

  async checkHealth() {
    if (!this.childProcess) {
      this.logger.warn('[EnhancedDaemon] Дочерний процесс демона не найден для проверки статуса.');
      this.emit('statusCheckFailed', 'process_not_found');
      return;
    }

    // Используем MonitoringUtils для проверки статуса процесса
    const pids = await this.monitoringUtils.detectRunningPids(this.config.daemonScript, {}); // Передаем пустую конфигурацию или актуальную
    const isProcessRunning = pids.includes(this.childProcess.pid);

    if (isProcessRunning) {
      this.emit('statusCheckPassed', { pid: this.childProcess.pid });
    } else {
      this.logger.warn('[EnhancedDaemon] Дочерний процесс демона не работает.', { pid: this.childProcess.pid });
      this.emit('statusCheckFailed', 'process_not_running', { pid: this.childProcess.pid });
      // Если процесс не работает, и включен автоперезапуск, и не превышено макс. количество перезапусков,
      // то механизм on('close') уже позаботится о перезапуске.
      // Здесь можно добавить дополнительную логику, если on('close') не сработает вовремя.
    }
  }

  startScheduler() {
    this.logger.info('[EnhancedDaemon] Запуск планировщика.');
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
    }
    this.schedulerTimer = setInterval(() => {
      this.runScheduledTasks();
    }, this.config.schedulerInterval || 60000); // По умолчанию каждую минуту
  }

  stopScheduler() {
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
      this.logger.info('[EnhancedDaemon] Планировщик остановлен.');
    }
  }

  runScheduledTasks() {
    this.emit('scheduledTasksRun');
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      processRunning: !!this.childProcess && !this.childProcess.killed,
      restartCount: this.restartCount,
      config: {
        workingDir: this.config.workingDir,
        enableMonitoring: this.config.enableMonitoring,
        enableAutoRestart: this.config.enableAutoRestart,
        enableScheduler: this.config.enableScheduler
      },
      childPid: this.childProcess ? this.childProcess.pid : null
    };
  }

  getStats() {
    return {
      uptime: this.isRunning ? Date.now() - this.startTime : 0,
      restartCount: this.restartCount,
      process: this.childProcess ? {
        pid: this.childProcess.pid,
        killed: this.childProcess.killed
      } : null,
      // Метрики мониторинга можно получить через monitoringUtils.getMetrics()
      statusMetrics: this.config.enableMonitoring ? this.monitoringUtils.getMetrics() : {}
    };
  }
}

export { EnhancedDaemon, enhancedDaemon: new EnhancedDaemon() };
