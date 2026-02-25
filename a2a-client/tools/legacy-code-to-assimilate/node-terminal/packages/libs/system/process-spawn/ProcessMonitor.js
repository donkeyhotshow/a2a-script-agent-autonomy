/**
 * ProcessMonitor - Мониторинг ресурсов процессов
 * Функции:
 * - Мониторинг CPU и памяти
 * - Проверка лимитов ресурсов
 * - Автоматическое завершение при превышении лимитов
 * - Уведомления о превышении лимитов
 */

const { spawn } = require('child_process');
const { fileSystemUtils } = require('@libs/system/file-operations');
const { RESOURCE_LIMITS } = require('./types/SpawnTypes');
const path = require('path');
const EventEmitter = require('events');

class ProcessMonitor extends EventEmitter {
  constructor(options = {}, logger = null, fileSystem = null) {
    super();
    this.monitoringInterval = options.monitoringInterval || 5000; // 5 секунд
    this.monitoredProcesses = new Map(); // pid -> processInfo
    this.monitoringTimer = null;
    this.isRunning = false;
    this.logFile = options.logFile || 'C:/apps/logs/process-monitor.json';
    this.notifications = [];
    this.logs = []; // Add logs array
    this.fileSystem = fileSystem || fileSystemUtils; // Use passed fileSystem or default
    this.logger = logger || { // Use passed logger or default mock
      log: (message) => console.log(message),
      error: (message) => console.error(message),
      warn: (message) => console.warn(message)
    };
  }

  /**
   * Запуск мониторинга
   */
  async start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    
    // Создаем директорию для логов
    await this.fileSystem.ensureDir(path.dirname(this.logFile));
    
    // Запускаем периодический мониторинг
    this.monitoringTimer = setInterval(() => {
      this.monitorAllProcesses().catch(error => {
        this.logger.error('Ошибка мониторинга процессов:', error);
      });
    }, this.monitoringInterval);

    this.logger.log('✅ ProcessMonitor запущен');
  }

  /**
   * Остановка мониторинга
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }

    this.logger.log('🛑 ProcessMonitor остановлен');
  }

  /**
   * Добавление процесса для мониторинга
   */
  addProcess(pid, processInfo) {
    const monitorInfo = {
      pid,
      daemonId: processInfo.daemonId,
      jobId: processInfo.jobId,
      startTime: new Date(),
      limits: {
        cpuPercent: processInfo.limits?.cpuPercent || RESOURCE_LIMITS.CPU_PERCENT,
        memoryMB: processInfo.limits?.memoryMB || RESOURCE_LIMITS.MEMORY_MB,
        timeoutMs: processInfo.limits?.timeoutMs || RESOURCE_LIMITS.TIMEOUT_MS
      },
      autoKill: processInfo.options?.autoKill !== false,
      lastCheck: new Date(),
      resourceHistory: []
    };

    this.monitoredProcesses.set(pid, monitorInfo);
    this.logger.log(`📊 Добавлен процесс для мониторинга: ${pid} (Демон: ${processInfo.daemonId})`);
  }

  /**
   * Удаление процесса из мониторинга
   */
  removeProcess(pid) {
    const removed = this.monitoredProcesses.delete(pid);
    if (removed) {
      this.logger.log(`📊 Удален процесс из мониторинга: ${pid}`);
    }
    return removed;
  }

  /**
   * Мониторинг всех процессов
   */
  async monitorAllProcesses() {
    for (const [pid, processInfo] of this.monitoredProcesses) {
      try {
        await this.monitorProcess(pid, processInfo);
      } catch (error) {
        this.logger.error(`Ошибка мониторинга процесса ${pid}:`, error);
      }
    }
  }

  /**
   * Мониторинг конкретного процесса
   */
  async monitorProcess(pid, processInfo) {
    try {
      // Проверяем, жив ли процесс
      const isAlive = await this.isProcessAlive(pid);
      if (!isAlive) {
        this.logger.log(`⚠️ Процесс ${pid} не отвечает, удаляем из мониторинга`);
        this.removeProcess(pid);
        return;
      }

      // Получаем информацию о ресурсах
      const resourceInfo = await this.getProcessResources(pid);
      
      // Обновляем информацию о процессе
      processInfo.lastCheck = new Date();
      processInfo.resourceHistory.push({
        timestamp: new Date().toISOString(),
        ...resourceInfo
      });

      // Ограничиваем историю (последние 100 записей)
      if (processInfo.resourceHistory.length > 100) {
        processInfo.resourceHistory = processInfo.resourceHistory.slice(-100);
      }

      // Проверяем лимиты
      const limitViolations = this.checkResourceLimits(resourceInfo, processInfo.limits);
      
      if (limitViolations.length > 0) {
        await this.handleLimitViolations(pid, processInfo, limitViolations, resourceInfo);
      }

      // Проверяем таймаут
      const runtime = Date.now() - processInfo.startTime.getTime();
      if (runtime > processInfo.limits.timeoutMs) {
        await this.handleTimeout(pid, processInfo, runtime);
      }

    } catch (error) {
      this.logger.error(`Ошибка мониторинга процесса ${pid}:`, error);
    }
  }

  /**
   * Проверка активности процесса
   */
  async isProcessAlive(pid) {
    try {
      const checkCommand = `Get-Process -Id ${pid} -ErrorAction SilentlyContinue`;
      const childProcess = spawn('powershell', ['-Command', checkCommand], {
        stdio: 'pipe',
        shell: true
      });

      return new Promise((resolve) => {
        childProcess.on('close', (code) => {
          resolve(code === 0);
        });
      });
    } catch (error) {
      return false;
    }
  }

  /**
   * Получение информации о ресурсах процесса
   */
  async getProcessResources(pid) {
    try {
      const command = `Get-Process -Id ${pid} | Select-Object CPU, WorkingSet, ProcessName | ConvertTo-Json`;
      const childProcess = spawn('powershell', ['-Command', command], {
        stdio: 'pipe',
        shell: true
      });

      return new Promise((resolve, reject) => {
        let stdout = '';
        let stderr = '';

        childProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        childProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        childProcess.on('close', (code) => {
          if (code === 0) {
            try {
              const processInfo = JSON.parse(stdout);
              const cpuPercent = processInfo.CPU || 0;
              const memoryMB = Math.round((processInfo.WorkingSet || 0) / 1024 / 1024);
              
              resolve({
                cpuPercent,
                memoryMB,
                processName: processInfo.ProcessName || 'unknown'
              });
            } catch (error) {
              reject(new Error(`Ошибка парсинга информации о процессе: ${error.message}`));
            }
          } else {
            reject(new Error(`Команда завершилась с кодом ${code}: ${stderr}`));
          }
        });
      });
    } catch (error) {
      this.logger.error(`Ошибка получения ресурсов процесса ${pid}:`, error);
      return {
        cpuPercent: 0,
        memoryMB: 0,
        processName: 'unknown'
      };
    }
  }

  /**
   * Проверка лимитов ресурсов
   */
  checkResourceLimits(resourceInfo, limits) {
    const violations = [];

    if (resourceInfo.cpuPercent > limits.cpuPercent) {
      violations.push({
        type: 'cpu',
        current: resourceInfo.cpuPercent,
        limit: limits.cpuPercent,
        message: `CPU превышен: ${resourceInfo.cpuPercent}% > ${limits.cpuPercent}%`
      });
    }

    if (resourceInfo.memoryMB > limits.memoryMB) {
      violations.push({
        type: 'memory',
        current: resourceInfo.memoryMB,
        limit: limits.memoryMB,
        message: `Память превышена: ${resourceInfo.memoryMB}MB > ${limits.memoryMB}MB`
      });
    }

    return violations;
  }

  /**
   * Обработка нарушений лимитов
   */
  async handleLimitViolations(pid, processInfo, violations, resourceInfo) {
    const violationLog = {
      timestamp: new Date().toISOString(),
      pid,
      daemonId: processInfo.daemonId,
      jobId: processInfo.jobId,
      violations,
      resourceInfo
    };

    // Логируем нарушение
    await this.logViolation(violationLog);

    // Отправляем уведомление
    await this.sendNotification(violationLog);

    // Автоматически завершаем процесс если включено
    if (processInfo.autoKill) {
      this.logger.warn(`🛑 Автоматическое завершение процесса ${pid} из-за превышения лимитов`);
      
      // Эмитим событие для ProcessKiller
      this.emit('processLimitExceeded', {
        pid,
        processInfo,
        violations
      });
    }
  }

  /**
   * Обработка таймаута
   */
  async handleTimeout(pid, processInfo, runtime) {
    const timeoutLog = {
      timestamp: new Date().toISOString(),
      pid,
      daemonId: processInfo.daemonId,
      jobId: processInfo.jobId,
      runtime,
      limit: processInfo.limits.timeoutMs,
      message: `Таймаут превышен: ${Math.round(runtime / 1000)}s > ${Math.round(processInfo.limits.timeoutMs / 1000)}s`
    };

    // Логируем таймаут
    await this.logViolation(timeoutLog);

    // Отправляем уведомление
    await this.sendNotification(timeoutLog);

    // Автоматически завершаем процесс
    if (processInfo.autoKill) {
      this.logger.warn(`🛑 Автоматическое завершение процесса ${pid} из-за таймаута`);
      
      this.emit('processTimeout', {
        pid,
        processInfo,
        runtime
      });
    }
  }

  /**
   * Логирование нарушений
   */
  async logViolation(violationLog) {
    try {
      let logs = [];
      
      if (await this.fileSystem.exists(this.logFile)) {
        const content = await this.fileSystem.readFile(this.logFile, 'utf8');
        logs = JSON.parse(content);
      }

      logs.push(violationLog);

      // Ограничиваем размер лога (последние 1000 записей)
      if (logs.length > 1000) {
        logs = logs.slice(-1000);
      }

      await this.fileSystem.writeFile(this.logFile, JSON.stringify(logs, null, 2));
    } catch (error) {
      this.logger.error('Ошибка логирования нарушения:', error);
    }
  }

  /**
   * Отправка уведомления
   */
  async sendNotification(violationLog) {
    const notification = {
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      type: 'resource_violation',
      severity: 'warning',
      ...violationLog
    };

    this.notifications.push(notification);
    
    // Ограничиваем количество уведомлений (последние 100)
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(-100);
    }

    this.logger.warn(`⚠️ Уведомление: ${violationLog.message}`);
  }

  /**
   * Получение статистики мониторинга
   */
  getStats() {
    const processes = Array.from(this.monitoredProcesses.values());
    
    return {
      monitoredProcesses: processes.length,
      notifications: this.notifications.length,
      lastCheck: processes.length > 0 ? 
        Math.max(...processes.map(p => p.lastCheck.getTime())) : null
    };
  }

  /**
   * Получение информации о процессе
   */
  getProcessInfo(pid) {
    return this.monitoredProcesses.get(pid);
  }

  /**
   * Получение всех уведомлений
   */
  getNotifications() {
    return [...this.notifications];
  }

  /**
   * Очистка уведомлений
   */
  clearNotifications() {
    this.notifications = [];
  }
}

module.exports = { ProcessMonitor };

