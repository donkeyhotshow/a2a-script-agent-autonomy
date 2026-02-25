/**
 * ProcessKiller - Завершение процессов
 * Функции:
 * - Graceful shutdown с таймаутом 10 секунд
 * - Принудительное завершение через taskkill
 * - Завершение дерева процессов (родитель + дети)
 * - Логирование всех попыток завершения
 */

const { spawn } = require('child_process');
const { LoggingUtils } = require('@libs/logging-monitoring/logging');
const FileSystemUtils = require('@libs/system/file-operations');
const { KILL_TYPES, RESOURCE_LIMITS } = require('./types/SpawnTypes');
const path = require('path');

class ProcessKiller {
  constructor(options = {}) {
    this.gracefulTimeout = options.gracefulTimeout || RESOURCE_LIMITS.GRACEFUL_TIMEOUT_MS; // 10 секунд
    this.forceTimeout = options.forceTimeout || 5000; // 5 секунд на принудительное завершение
    this.logFile = options.logFile || 'C:/apps/logs/process-killer.json';
    this.killHistory = [];
    this.logger = options.logger || new LoggingUtils();
    this.fileSystem = FileSystemUtils(this.logger);
  }

  /**
   * Завершение процесса с полной логикой
   */
  async killProcess(pid, options = {}) {
    const killInfo = {
      pid,
      timestamp: new Date().toISOString(),
      killType: options.killType || KILL_TYPES.GRACEFUL,
      daemonId: options.daemonId || 'unknown',
      jobId: options.jobId || 'unknown',
      reason: options.reason || 'manual_kill',
      steps: []
    };

    try {
      this.logger.log(`🛑 Начинаем завершение процесса ${pid} (тип: ${killInfo.killType})`);

      // Проверяем, существует ли процесс
      const isAlive = await this.isProcessAlive(pid);
      if (!isAlive) {
        killInfo.steps.push({
          step: 'check_alive',
          result: 'process_not_found',
          message: 'Процесс не найден'
        });
        
        await this.logKillAttempt(killInfo);
        return { success: true, reason: 'process_not_found' };
      }

      // Graceful shutdown
      if (killInfo.killType === KILL_TYPES.GRACEFUL) {
        const gracefulResult = await this.gracefulKill(pid, killInfo);
        
        if (gracefulResult.success) {
          await this.logKillAttempt(killInfo);
          return gracefulResult;
        }

        // Если graceful не удался, переходим к принудительному
        this.logger.warn(`⚠️ Graceful shutdown не удался для ${pid}, переходим к принудительному завершению`);
        killInfo.killType = KILL_TYPES.FORCE;
      }

      // Принудительное завершение
      if (killInfo.killType === KILL_TYPES.FORCE) {
        const forceResult = await this.forceKill(pid, killInfo);
        await this.logKillAttempt(killInfo);
        return forceResult;
      }

      // Немедленное завершение
      if (killInfo.killType === KILL_TYPES.IMMEDIATE) {
        const immediateResult = await this.immediateKill(pid, killInfo);
        await this.logKillAttempt(killInfo);
        return immediateResult;
      }

    } catch (error) {
      killInfo.steps.push({
        step: 'error',
        result: 'failed',
        error: error.message
      });

      await this.logKillAttempt(killInfo);
      this.logger.error(`❌ Ошибка завершения процесса ${pid}:`, error);
      throw error;
    }
  }

  /**
   * Graceful shutdown процесса
   */
  async gracefulKill(pid, killInfo) {
    try {
      this.logger.log(`🔄 Graceful shutdown процесса ${pid}...`);

      // Отправляем SIGTERM
      const gracefulResult = await this.sendSignal(pid, 'SIGTERM');
      
      killInfo.steps.push({
        step: 'graceful_sigterm',
        result: gracefulResult.success ? 'sent' : 'failed',
        message: gracefulResult.message
      });

      if (!gracefulResult.success) {
        return { success: false, reason: 'sigterm_failed' };
      }

      // Ждем завершения процесса
      const waitResult = await this.waitForProcessEnd(pid, this.gracefulTimeout);
      
      killInfo.steps.push({
        step: 'wait_graceful',
        result: waitResult.success ? 'completed' : 'timeout',
        duration: waitResult.duration,
        message: waitResult.message
      });

      if (waitResult.success) {
        this.logger.log(`✅ Процесс ${pid} завершен gracefully за ${waitResult.duration}ms`);
        return { success: true, reason: 'graceful_completed', duration: waitResult.duration };
      }

      return { success: false, reason: 'graceful_timeout' };

    } catch (error) {
      killInfo.steps.push({
        step: 'graceful_error',
        result: 'failed',
        error: error.message
      });
      return { success: false, reason: 'graceful_error', error: error.message };
    }
  }

  /**
   * Принудительное завершение процесса
   */
  async forceKill(pid, killInfo) {
    try {
      this.logger.log(`💀 Принудительное завершение процесса ${pid}...`);

      // Завершаем дерево процессов
      const treeResult = await this.killProcessTree(pid);
      
      killInfo.steps.push({
        step: 'kill_tree',
        result: treeResult.success ? 'completed' : 'failed',
        killedProcesses: treeResult.killedProcesses,
        message: treeResult.message
      });

      if (treeResult.success) {
        // Ждем завершения
        const waitResult = await this.waitForProcessEnd(pid, this.forceTimeout);
        
        killInfo.steps.push({
          step: 'wait_force',
          result: waitResult.success ? 'completed' : 'timeout',
          duration: waitResult.duration,
          message: waitResult.message
        });

        if (waitResult.success) {
          this.logger.log(`✅ Процесс ${pid} принудительно завершен за ${waitResult.duration}ms`);
          return {
            success: true,
            reason: 'force_completed',
            duration: waitResult.duration,
            killedProcesses: treeResult.killedProcesses
          };
        }
      }

      // Если не удалось, пробуем taskkill
      const taskkillResult = await this.taskKill(pid);
      
      killInfo.steps.push({
        step: 'taskkill',
        result: taskkillResult.success ? 'completed' : 'failed',
        message: taskkillResult.message
      });

      if (taskkillResult.success) {
        this.logger.log(`✅ Процесс ${pid} завершен через taskkill`);
        return { success: true, reason: 'taskkill_completed' };
      }

      return { success: false, reason: 'force_failed' };

    } catch (error) {
      killInfo.steps.push({
        step: 'force_error',
        result: 'failed',
        error: error.message
      });
      return { success: false, reason: 'force_error', error: error.message };
    }
  }

  /**
   * Немедленное завершение процесса
   */
  async immediateKill(pid, killInfo) {
    try {
      this.logger.log(`⚡ Немедленное завершение процесса ${pid}...`);

      // Отправляем SIGKILL
      const sigkillResult = await this.sendSignal(pid, 'SIGKILL');
      
      killInfo.steps.push({
        step: 'immediate_sigkill',
        result: sigkillResult.success ? 'sent' : 'failed',
        message: sigkillResult.message
      });

      if (sigkillResult.success) {
        // Ждем завершения
        const waitResult = await this.waitForProcessEnd(pid, 2000);
        
        killInfo.steps.push({
          step: 'wait_immediate',
          result: waitResult.success ? 'completed' : 'timeout',
          duration: waitResult.duration,
          message: waitResult.message
        });

        if (waitResult.success) {
          this.logger.log(`✅ Процесс ${pid} немедленно завершен за ${waitResult.duration}ms`);
          return { success: true, reason: 'immediate_completed', duration: waitResult.duration };
        }
      }

      // Если не удалось, используем taskkill /F
      const taskkillResult = await this.taskKillForce(pid);
      
      killInfo.steps.push({
        step: 'taskkill_force',
        result: taskkillResult.success ? 'completed' : 'failed',
        message: taskkillResult.message
      });

      return taskkillResult.success ?
        { success: true, reason: 'taskkill_force_completed' } :
        { success: false, reason: 'immediate_failed' };

    } catch (error) {
      killInfo.steps.push({
        step: 'immediate_error',
        result: 'failed',
        error: error.message
      });
      return { success: false, reason: 'immediate_error', error: error.message };
    }
  }

  /**
   * Отправка сигнала процессу
   */
  async sendSignal(pid, signal) {
    try {
      const process = spawn('taskkill', ['/PID', pid.toString(), '/SIGNAL', signal], {
        stdio: 'pipe',
        shell: true
      });

      return new Promise((resolve) => {
        process.on('close', (code) => {
          if (code === 0) {
            resolve({ success: true, message: `Сигнал ${signal} отправлен` });
          } else {
            resolve({ success: false, message: `Ошибка отправки сигнала ${signal}, код: ${code}` });
          }
        });
      });
    } catch (error) {
      return { success: false, message: `Ошибка отправки сигнала: ${error.message}` };
    }
  }

  /**
   * Ожидание завершения процесса
   */
  async waitForProcessEnd(pid, timeout) {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const checkInterval = setInterval(async () => {
        const isAlive = await this.isProcessAlive(pid);
        const elapsed = Date.now() - startTime;
        
        if (!isAlive) {
          clearInterval(checkInterval);
          resolve({
            success: true,
            duration: elapsed,
            message: `Процесс завершен за ${elapsed}ms`
          });
        } else if (elapsed >= timeout) {
          clearInterval(checkInterval);
          resolve({
            success: false,
            duration: elapsed,
            message: `Таймаут ожидания: ${elapsed}ms`
          });
        }
      }, 100);
    });
  }

  /**
   * Завершение дерева процессов
   */
  async killProcessTree(pid) {
    try {
      // Получаем дерево процессов
      const treeCommand = `Get-Process -Id ${pid} | ForEach-Object { $_.Id } | ForEach-Object { Get-Process -Id $_ -IncludeChildProcesses | Select-Object -ExpandProperty Id } | Sort-Object -Unique`;
      
      const process = spawn('powershell', ['-Command', treeCommand], {
        stdio: 'pipe',
        shell: true
      });

      return new Promise((resolve) => {
        let stdout = '';
        
        process.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        process.on('close', async (code) => {
          if (code === 0) {
            try {
              const pids = stdout.trim().split('\n').filter(pid => pid && !isNaN(pid)).map(pid => parseInt(pid));
              
              if (pids.length > 0) {
                // Завершаем все процессы в дереве
                const killPromises = pids.map(async (processPid) => {
                  try {
                    await this.sendSignal(processPid, 'SIGTERM');
                    return processPid;
                  } catch (error) {
                    return null;
                  }
                });

                const killedPids = (await Promise.all(killPromises)).filter(pid => pid !== null);
                
                resolve({
                  success: true,
                  killedProcesses: killedPids,
                  message: `Завершено ${killedPids.length} процессов в дереве`
                });
              } else {
                resolve({
                  success: false,
                  killedProcesses: [],
                  message: 'Не удалось получить дерево процессов'
                });
              }
            } catch (error) {
              resolve({
                success: false,
                killedProcesses: [],
                message: `Ошибка парсинга дерева процессов: ${error.message}`
              });
            }
          } else {
            resolve({
              success: false,
              killedProcesses: [],
              message: `Ошибка получения дерева процессов, код: ${code}`
            });
          }
        });
      });
    } catch (error) {
      return {
        success: false,
        killedProcesses: [],
        message: `Ошибка завершения дерева процессов: ${error.message}`
      };
    }
  }

  /**
   * Завершение через taskkill
   */
  async taskKill(pid) {
    try {
      const process = spawn('taskkill', ['/PID', pid.toString()], {
        stdio: 'pipe',
        shell: true
      });

      return new Promise((resolve) => {
        process.on('close', (code) => {
          if (code === 0) {
            resolve({ success: true, message: 'Процесс завершен через taskkill' });
          } else {
            resolve({ success: false, message: `taskkill завершился с кодом ${code}` });
          }
        });
      });
    } catch (error) {
      return { success: false, message: `Ошибка taskkill: ${error.message}` };
    }
  }

  /**
   * Принудительное завершение через taskkill /F
   */
  async taskKillForce(pid) {
    try {
      const process = spawn('taskkill', ['/PID', pid.toString(), '/F'], {
        stdio: 'pipe',
        shell: true
      });

      return new Promise((resolve) => {
        process.on('close', (code) => {
          if (code === 0) {
            resolve({ success: true, message: 'Процесс принудительно завершен через taskkill /F' });
          } else {
            resolve({ success: false, message: `taskkill /F завершился с кодом ${code}` });
          }
        });
      });
    } catch (error) {
      return { success: false, message: `Ошибка taskkill /F: ${error.message}` };
    }
  }

  /**
   * Проверка активности процесса
   */
  async isProcessAlive(pid) {
    try {
      const checkCommand = `Get-Process -Id ${pid} -ErrorAction SilentlyContinue`;
      const process = spawn('powershell', ['-Command', checkCommand], {
        stdio: 'pipe',
        shell: true
      });

      return new Promise((resolve) => {
        process.on('close', (code) => {
          resolve(code === 0);
        });
      });
    } catch (error) {
      return false;
    }
  }

  /**
   * Логирование попытки завершения
   */
  async logKillAttempt(killInfo) {
    try {
      await this.fileSystem.ensureDir(path.dirname(this.logFile));
      
      let logs = [];
      if (await this.fileSystem.exists(this.logFile)) {
        const content = await this.fileSystem.readFile(this.logFile, 'utf8');
        logs = JSON.parse(content);
      }

      logs.push(killInfo);

      // Ограничиваем размер лога (последние 1000 записей)
      if (logs.length > 1000) {
        logs = logs.slice(-1000);
      }

      await this.fileSystem.writeFile(this.logFile, JSON.stringify(logs, null, 2));
      
      // Добавляем в историю в памяти
      this.killHistory.push(killInfo);
      if (this.killHistory.length > 100) {
        this.killHistory = this.killHistory.slice(-100);
      }

    } catch (error) {
      this.logger.error('Ошибка логирования попытки завершения:', error);
    }
  }

  /**
   * Получение истории завершений
   */
  getKillHistory() {
    return [...this.killHistory];
  }

  /**
   * Очистка истории завершений
   */
  clearKillHistory() {
    this.killHistory = [];
  }
}

module.exports = { ProcessKiller };

