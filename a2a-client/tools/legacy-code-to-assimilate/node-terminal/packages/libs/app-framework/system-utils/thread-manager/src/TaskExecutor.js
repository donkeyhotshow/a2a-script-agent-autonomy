const EventEmitter = require('eventemitter3');
const pTimeout = require('p-timeout');
const pRetry = require('p-retry');

/**
 * Исполнитель задач с поддержкой различных типов выполнения
 */
class TaskExecutor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      defaultTimeout: options.defaultTimeout || 30000,
      defaultRetries: options.defaultRetries || 3,
      defaultRetryDelay: options.defaultRetryDelay || 1000,
      enableLogging: options.enableLogging !== false,
      ...options
    };

    this.activeExecutions = new Map();
    this.executionCounter = 0;
    
    this.stats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      executionTimes: []
    };
  }

  /**
   * Выполнение задачи
   */
  async execute(task) {
    const executionId = `exec_${++this.executionCounter}_${Date.now()}`;
    const startTime = Date.now();
    
    const execution = {
      id: executionId,
      task: { ...task, id: task.id || executionId },
      startTime,
      status: 'running',
      attempts: 0,
      maxAttempts: task.retryAttempts || this.options.defaultRetries
    };
    
    this.activeExecutions.set(executionId, execution);
    this.stats.totalExecutions++;
    
    this.emit('execution:start', execution);
    
    try {
      // Выполняем задачу с повторными попытками
      const result = await pRetry(
        async () => {
          execution.attempts++;
          this.emit('execution:attempt', execution);
          
          return await pTimeout(
            this._executeTask(task),
            task.timeout || this.options.defaultTimeout,
            `Выполнение задачи ${executionId} превысило лимит времени`
          );
        },
        {
          retries: execution.maxAttempts - 1,
          delay: task.retryDelay || this.options.defaultRetryDelay,
          onFailedAttempt: (error) => {
            this.emit('execution:retry', execution, error);
          }
        }
      );
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      execution.status = 'completed';
      execution.endTime = endTime;
      execution.result = result;
      execution.executionTime = executionTime;
      
      this._updateStats(executionTime, true);
      this.stats.successfulExecutions++;
      
      this.activeExecutions.delete(executionId);
      
      this.emit('execution:complete', execution, result);
      
      return result;
      
    } catch (error) {
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      execution.status = 'failed';
      execution.endTime = endTime;
      execution.error = error;
      execution.executionTime = executionTime;
      
      this._updateStats(executionTime, false);
      this.stats.failedExecutions++;
      
      this.activeExecutions.delete(executionId);
      
      this.emit('execution:error', execution, error);
      
      throw error;
    }
  }

  /**
   * Выполнение задачи в зависимости от типа
   */
  async _executeTask(task) {
    if (typeof task.function === 'function') {
      return await task.function(task.data);
    } else if (typeof task.execute === 'function') {
      return await task.execute(task.data);
    } else if (task.module && task.method) {
      return await this._executeModuleMethod(task);
    } else if (task.command) {
      return await this._executeCommand(task);
    } else if (task.url) {
      return await this._executeHttpRequest(task);
    } else {
      throw new Error('Не указан способ выполнения задачи');
    }
  }

  /**
   * Выполнение метода из модуля
   */
  async _executeModuleMethod(task) {
    try {
      const module = require(task.module);
      const method = module[task.method];
      
      if (typeof method !== 'function') {
        throw new Error(`Метод ${task.method} не найден в модуле ${task.module}`);
      }
      
      return await method(task.data);
    } catch (error) {
      throw new Error(`Ошибка выполнения метода ${task.method}: ${error.message}`);
    }
  }

  /**
   * Выполнение команды
   */
  async _executeCommand(task) {
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
      const child = spawn(task.command, task.args || [], {
        cwd: task.cwd || process.cwd(),
        env: { ...process.env, ...task.env },
        stdio: task.stdio || 'pipe'
      });
      
      let stdout = '';
      let stderr = '';
      
      if (child.stdout) {
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
      }
      
      if (child.stderr) {
        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      }
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Команда завершилась с кодом ${code}: ${stderr}`));
        }
      });
      
      child.on('error', (error) => {
        reject(new Error(`Ошибка выполнения команды: ${error.message}`));
      });
    });
  }

  /**
   * Выполнение HTTP запроса
   */
  async _executeHttpRequest(task) {
    const fetch = require('node-fetch');
    
    const options = {
      method: task.method || 'GET',
      headers: task.headers || {},
      ...task.options
    };
    
    if (task.body) {
      options.body = typeof task.body === 'string' ? task.body : JSON.stringify(task.body);
    }
    
    const response = await fetch(task.url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      return await response.text();
    }
  }

  /**
   * Обновление статистики
   */
  _updateStats(executionTime, success) {
    this.stats.executionTimes.push(executionTime);
    
    // Ограничиваем количество записей
    if (this.stats.executionTimes.length > 1000) {
      this.stats.executionTimes.shift();
    }
    
    // Пересчитываем среднее время
    const sum = this.stats.executionTimes.reduce((acc, time) => acc + time, 0);
    this.stats.averageExecutionTime = sum / this.stats.executionTimes.length;
  }

  /**
   * Отмена выполнения
   */
  cancel(executionId) {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      return false;
    }

    execution.status = 'cancelled';
    execution.endTime = Date.now();
    
    this.activeExecutions.delete(executionId);
    
    this.emit('execution:cancelled', execution);
    
    return true;
  }

  /**
   * Получение активных выполнений
   */
  getActiveExecutions() {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Получение информации о выполнении
   */
  getExecution(executionId) {
    return this.activeExecutions.get(executionId);
  }

  /**
   * Получение статистики
   */
  getStats() {
    return {
      ...this.stats,
      activeExecutions: this.activeExecutions.size,
      successRate: this.stats.totalExecutions > 0 ? 
        (this.stats.successfulExecutions / this.stats.totalExecutions) * 100 : 0
    };
  }

  /**
   * Очистка старых выполнений
   */
  cleanup(maxAge = 3600000) { // 1 час по умолчанию
    const now = Date.now();
    const executionsToRemove = [];

    for (const [executionId, execution] of this.activeExecutions.entries()) {
      const age = now - execution.startTime;
      if (age > maxAge) {
        executionsToRemove.push(executionId);
      }
    }

    executionsToRemove.forEach(executionId => {
      this.cancel(executionId);
    });

    return executionsToRemove.length;
  }

  /**
   * Создание задачи для выполнения функции
   */
  createFunctionTask(fn, data, options = {}) {
    return {
      function: fn,
      data,
      ...options
    };
  }

  /**
   * Создание задачи для выполнения команды
   */
  createCommandTask(command, args = [], options = {}) {
    return {
      command,
      args,
      ...options
    };
  }

  /**
   * Создание задачи для HTTP запроса
   */
  createHttpTask(url, options = {}) {
    return {
      url,
      ...options
    };
  }

  /**
   * Создание задачи для выполнения метода модуля
   */
  createModuleTask(module, method, data, options = {}) {
    return {
      module,
      method,
      data,
      ...options
    };
  }

  /**
   * Пакетное выполнение задач
   */
  async executeBatch(tasks, options = {}) {
    const {
      concurrency = 1,
      stopOnError = false
    } = options;

    const results = [];
    const errors = [];
    
    if (concurrency === 1) {
      // Последовательное выполнение
      for (const task of tasks) {
        try {
          const result = await this.execute(task);
          results.push({ task, result, success: true });
        } catch (error) {
          errors.push({ task, error, success: false });
          if (stopOnError) {
            break;
          }
        }
      }
    } else {
      // Параллельное выполнение с ограничением
      const chunks = this._chunkArray(tasks, concurrency);
      
      for (const chunk of chunks) {
        const chunkPromises = chunk.map(async (task) => {
          try {
            const result = await this.execute(task);
            return { task, result, success: true };
          } catch (error) {
            return { task, error, success: false };
          }
        });
        
        const chunkResults = await Promise.all(chunkPromises);
        
        chunkResults.forEach(result => {
          if (result.success) {
            results.push(result);
          } else {
            errors.push(result);
            if (stopOnError) {
              throw new Error('Остановка по ошибке');
            }
          }
        });
      }
    }
    
    return { results, errors };
  }

  /**
   * Разделение массива на чанки
   */
  _chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

export default TaskExecutor;
