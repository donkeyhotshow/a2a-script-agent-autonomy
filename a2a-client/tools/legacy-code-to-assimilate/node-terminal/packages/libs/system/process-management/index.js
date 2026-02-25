/**
 * Unified Process Management Library
 * Объединенная библиотека управления процессами
 */

import { spawn, exec, execSync } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { systemConfigManager } from '@libs/config-unified/system-config/index.cjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ProcessManagementUtils {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.errorHandler = options.errorHandler || console;
    this.rootDir = options.rootDir || process.cwd();
    this.shell = process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe';
    
    // Кэш процессов
    this.activeProcesses = new Map();
    this.processHistory = [];
    this.maxHistorySize = options.maxHistorySize || 1000;
    
    // Статистика
    this.stats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      activeProcesses: 0
    };
  }

  /**
   * Выполнение команды синхронно
   */
  executeSync(command, options = {}) {
    this.logger.info(`Выполнение синхронной команды: ${command}`);
    this.stats.totalExecutions++;
    
    try {
      const execOptions = {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...options.env },
        timeout: options.timeout || systemConfigManager.getServiceManagerConfig().statusCheckInterval || 30000,
        ...options
      };

      const output = execSync(command, execOptions);
      this.stats.successfulExecutions++;
      
      this.logger.info(`Синхронная команда успешно выполнена: ${command}`, { 
        output: output.trim() 
      });
      
      return { 
        success: true, 
        output: output.trim(), 
        code: 0,
        command,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.stats.failedExecutions++;
      
      const errorMessage = `Ошибка выполнения синхронной команды: ${command}. Ошибка: ${error.message}`;
      this.logger.error(errorMessage, { 
        stderr: error.stderr ? error.stderr.trim() : 'N/A', 
        stdout: error.stdout ? error.stdout.trim() : 'N/A' 
      });
      
      if (this.errorHandler.handleError) {
        this.errorHandler.handleError(error, 'CommandExecutionError', { command, type: 'sync' });
      }
      
      return { 
        success: false, 
        output: error.stdout ? error.stdout.trim() : '', 
        error: error.stderr ? error.stderr.trim() : error.message, 
        code: error.status || 1,
        command,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Выполнение команды асинхронно
   */
  executeAsync(command, options = {}) {
    this.logger.info(`Выполнение асинхронной команды: ${command}`);
    this.stats.totalExecutions++;
    
    return new Promise((resolve) => {
      const execOptions = {
        encoding: 'utf8',
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...options.env },
        timeout: options.timeout || systemConfigManager.getServiceManagerConfig().statusCheckInterval || 30000,
        ...options
      };

      exec(command, execOptions, (error, stdout, stderr) => {
        if (error) {
          this.stats.failedExecutions++;
          
          const errorMessage = `Ошибка выполнения асинхронной команды: ${command}. Ошибка: ${error.message}`;
          this.logger.error(errorMessage, { 
            stderr: stderr.trim(), 
            stdout: stdout.trim() 
          });
          
          if (this.errorHandler.handleError) {
            this.errorHandler.handleError(error, 'CommandExecutionError', { command, type: 'async' });
          }
          
          resolve({ 
            success: false, 
            output: stdout.trim(), 
            error: stderr.trim(), 
            code: error.code || 1,
            command,
            timestamp: new Date().toISOString()
          });
          return;
        }
        
        this.stats.successfulExecutions++;
        this.logger.info(`Асинхронная команда успешно выполнена: ${command}`, { 
          output: stdout.trim() 
        });
        
        resolve({ 
          success: true, 
          output: stdout.trim(), 
          code: 0,
          command,
          timestamp: new Date().toISOString()
        });
      });
    });
  }

  /**
   * Создание процесса с потоковым выводом
   */
  spawnProcess(command, args = [], options = {}) {
    const processId = `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.logger.info(`Создание процесса: ${command} ${args.join(' ')}`);
    
    const spawnOptions = {
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env },
      stdio: options.stdio || ['pipe', 'pipe', 'pipe'],
      shell: options.shell || false,
      ...options
    };

    const childProcess = spawn(command, args, spawnOptions);
    
    const processInfo = {
      id: processId,
      pid: childProcess.pid,
      command,
      args,
      options: spawnOptions,
      startTime: new Date(),
      status: 'running',
      output: {
        stdout: [],
        stderr: []
      }
    };

    // Сохраняем процесс
    this.activeProcesses.set(processId, processInfo);
    this.stats.activeProcesses = this.activeProcesses.size;

    // Обработка вывода
    if (childProcess.stdout) {
      childProcess.stdout.on('data', (data) => {
        const output = data.toString();
        processInfo.output.stdout.push(output);
        if (options.onStdout) {
          options.onStdout(output);
        }
      });
    }

    if (childProcess.stderr) {
      childProcess.stderr.on('data', (data) => {
        const output = data.toString();
        processInfo.output.stderr.push(output);
        if (options.onStderr) {
          options.onStderr(output);
        }
      });
    }

    // Обработка завершения
    childProcess.on('close', (code, signal) => {
      processInfo.status = 'completed';
      processInfo.endTime = new Date();
      processInfo.exitCode = code;
      processInfo.signal = signal;
      processInfo.duration = processInfo.endTime - processInfo.startTime;
      
      this.activeProcesses.delete(processId);
      this.stats.activeProcesses = this.activeProcesses.size;
      
      // Добавляем в историю
      this.processHistory.push(processInfo);
      if (this.processHistory.length > this.maxHistorySize) {
        this.processHistory.shift();
      }
      
      this.logger.info(`Процесс завершен: ${processId} (PID: ${childProcess.pid})`, {
        code,
        signal,
        duration: processInfo.duration
      });
      
      if (options.onClose) {
        options.onClose(code, signal);
      }
    });

    // Обработка ошибок
    childProcess.on('error', (error) => {
      processInfo.status = 'error';
      processInfo.error = error.message;
      processInfo.endTime = new Date();
      
      this.logger.error(`Ошибка процесса: ${processId}`, { error: error.message });
      
      if (this.errorHandler.handleError) {
        this.errorHandler.handleError(error, 'ProcessError', { processId, command });
      }
      
      if (options.onError) {
        options.onError(error);
      }
    });

    return {
      processId,
      childProcess,
      kill: () => this.killProcess(processId),
      wait: () => new Promise((resolve) => {
        childProcess.on('close', resolve);
      })
    };
  }

  /**
   * Завершение процесса
   */
  killProcess(processId, signal = 'SIGTERM') {
    const processInfo = this.activeProcesses.get(processId);
    if (!processInfo) {
      this.logger.warn(`Процесс не найден: ${processId}`);
      return { success: false, error: 'Process not found' };
    }

    try {
      process.kill(processInfo.pid, signal);
      this.logger.info(`Процесс завершен: ${processId} (PID: ${processInfo.pid})`);
      return { success: true };
    } catch (error) {
      if (error.code === 'ESRCH') {
        this.logger.warn(`Процесс уже завершен: ${processId}`);
        return { success: true, message: 'Process already terminated' };
      } else {
        this.logger.error(`Ошибка завершения процесса: ${processId}`, { error: error.message });
        if (this.errorHandler.handleError) {
          this.errorHandler.handleError(error, 'ProcessKillError', { processId });
        }
        return { success: false, error: error.message };
      }
    }
  }

  /**
   * Завершение процесса по PID
   */
  killProcessByPid(pid, signal = 'SIGTERM') {
    const pidNum = typeof pid === 'string' ? parseInt(pid, 10) : pid;
    this.logger.info(`Попытка завершить процесс с PID: ${pidNum}`);
    
    try {
      process.kill(pidNum, signal);
      this.logger.info(`Процесс с PID ${pidNum} успешно завершен`);
      return { success: true };
    } catch (error) {
      const errorMessage = `Ошибка завершения процесса с PID ${pidNum}: ${error.message}`;
      this.logger.error(errorMessage, { pid: pidNum, error: error.message });
      
      if (this.errorHandler.handleError) {
        this.errorHandler.handleError(error, 'ProcessKillError', { pid: pidNum });
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Поиск процесса по порту
   */
  async findProcessByPort(port) {
    try {
      const command = process.platform === 'win32'
        ? `netstat -ano | findstr :${port}`
        : `lsof -ti:${port}`;

      const result = await this.executeAsync(command);

      if (!result.success) {
        this.logger.debug(`Процесс на порту ${port} не найден: ${result.error || 'Command failed'}`);
        return { success: false, error: 'No process found on port' };
      }

      const lines = result.output.trim().split('\n');
      if (lines.length === 0 || lines[0] === '') {
        this.logger.debug(`Процесс на порту ${port} не найден`);
        return { success: false, error: 'No process found on port' };
      }

      let pid;
      if (process.platform === 'win32') {
        const parts = lines[0].trim().split(/\s+/);
        pid = parts[parts.length - 1];
      } else {
        pid = lines[0].trim();
      }

      if (pid && !isNaN(pid)) {
        this.logger.debug(`Найден процесс для порта ${port}: PID ${pid}`);
        return { success: true, pid: parseInt(pid) };
      } else {
        this.logger.warn(`Некорректный PID для порта ${port}: '${pid}'`);
        return { success: false, error: 'Invalid PID' };
      }
    } catch (error) {
      this.logger.debug(`Ошибка поиска процесса на порту ${port}: ${error.message}`);
      return { success: false, error: 'Error finding process' };
    }
  }

  /**
   * Завершение процесса по порту
   */
  async killProcessByPort(port) {
    try {
      this.logger.info(`Попытка завершить процесс на порту: ${port}`);
      const result = await this.findProcessByPort(port);
      if (!result.success) {
        this.logger.info(`Нет процесса для завершения на порту: ${port}`);
        return result;
      }
      return this.killProcessByPid(result.pid);
    } catch (error) {
      if (this.errorHandler.handleError) {
        this.errorHandler.handleError(error, { operation: 'killProcessByPort', port });
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Получение информации о процессе
   */
  getProcessInfo(processId) {
    return this.activeProcesses.get(processId) || null;
  }

  /**
   * Получение всех активных процессов
   */
  getActiveProcesses() {
    return Array.from(this.activeProcesses.values());
  }

  /**
   * Получение истории процессов
   */
  getProcessHistory(limit = 50) {
    return this.processHistory.slice(-limit);
  }

  /**
   * Очистка истории процессов
   */
  clearProcessHistory() {
    this.processHistory = [];
    this.logger.info('История процессов очищена');
  }

  /**
   * Получение статистики
   */
  getStats() {
    return {
      ...this.stats,
      activeProcesses: this.activeProcesses.size,
      historySize: this.processHistory.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Выполнение команды с таймаутом
   */
  async executeWithTimeout(command, timeout = 30000, options = {}) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve({
          success: false,
          error: 'Command execution timeout',
          command,
          timeout,
          timestamp: new Date().toISOString()
        });
      }, timeout);

      this.executeAsync(command, options).then((result) => {
        clearTimeout(timer);
        resolve(result);
      });
    });
  }

  /**
   * Выполнение команды с повторными попытками
   */
  async executeWithRetry(command, maxRetries = systemConfigManager.getCommandMaxRetries() || 3, delay = systemConfigManager.getCommandRetryDelayMs() || 1000, options = {}) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.executeAsync(command, options);
        if (result.success) {
          return result;
        }
        lastError = result.error;
      } catch (error) {
        lastError = error.message;
      }
      
      if (attempt < maxRetries) {
        this.logger.warn(`Попытка ${attempt + 1}/${maxRetries} не удалась, повтор через ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return {
      success: false,
      error: `Command failed after ${maxRetries} attempts. Last error: ${lastError}`,
      command,
      attempts: maxRetries,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Выполнение последовательности команд
   */
  async executeSequence(commands, options = {}) {
    const results = [];
    const stopOnError = options.stopOnError !== false;
    
    for (const command of commands) {
      const result = await this.executeAsync(command, options);
      results.push(result);
      
      if (!result.success && stopOnError) {
        break;
      }
    }
    
    return {
      success: results.every(r => r.success),
      results,
      commands,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Проверка доступности порта
   */
  async isPortAvailable(port) {
    const result = await this.findProcessByPort(port);
    return !result.success;
  }

  /**
   * Получение свободного порта
   */
  async getFreePort(startPort = 3000, endPort = 4000) {
    for (let port = startPort; port <= endPort; port++) {
      if (await this.isPortAvailable(port)) {
        return port;
      }
    }
    throw new Error(`No free ports available in range ${startPort}-${endPort}`);
  }
}

export { ProcessManagementUtils };
