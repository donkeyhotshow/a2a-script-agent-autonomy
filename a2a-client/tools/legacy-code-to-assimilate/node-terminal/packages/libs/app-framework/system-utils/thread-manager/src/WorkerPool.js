const EventEmitter = require('eventemitter3');
const pTimeout = require('p-timeout');
const pRetry = require('p-retry');

/**
 * Пул воркеров для выполнения задач
 */
class WorkerPool extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      maxWorkers: options.maxWorkers || 4,
      taskTimeout: options.taskTimeout || 30000,
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 1000,
      ...options
    };

    this.workers = new Map();
    this.activeTasks = new Map();
    this.isRunning = false;
    
    this.stats = {
      totalWorkers: 0,
      activeWorkers: 0,
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageTaskTime: 0,
      taskTimes: []
    };
  }

  /**
   * Запуск пула воркеров
   */
  async start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.emit('started');
  }

  /**
   * Остановка пула воркеров
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    // Отменяем все активные задачи
    const cancelPromises = Array.from(this.activeTasks.values()).map(task => {
      return this.cancelTask(task.id);
    });
    
    await Promise.all(cancelPromises);
    
    this.emit('stopped');
  }

  /**
   * Выполнение задачи
   */
  async executeTask(task) {
    if (!this.isRunning) {
      throw new Error('WorkerPool не запущен');
    }

    const taskId = task.id;
    const startTime = Date.now();
    
    // Добавляем задачу в активные
    this.activeTasks.set(taskId, {
      ...task,
      startTime,
      workerId: null
    });
    
    this.stats.totalTasks++;
    this.emit('task:start', task);

    try {
      // Выполняем задачу с таймаутом и повторными попытками
      const result = await pRetry(
        async () => {
          return await pTimeout(
            this._executeTaskFunction(task),
            task.timeout || this.options.taskTimeout,
            `Задача ${taskId} превысила лимит времени`
          );
        },
        {
          retries: task.retryAttempts || this.options.retryAttempts,
          delay: task.retryDelay || this.options.retryDelay,
          onFailedAttempt: (error) => {
            this.emit('task:retry', task, error);
          }
        }
      );

      const endTime = Date.now();
      const taskTime = endTime - startTime;
      
      // Обновляем статистику
      this._updateTaskStats(taskTime);
      
      this.activeTasks.delete(taskId);
      this.stats.completedTasks++;
      
      this.emit('task:complete', task, result);
      
      return result;
      
    } catch (error) {
      const endTime = Date.now();
      const taskTime = endTime - startTime;
      
      this._updateTaskStats(taskTime);
      
      this.activeTasks.delete(taskId);
      this.stats.failedTasks++;
      
      this.emit('task:error', task, error);
      
      throw error;
    }
  }

  /**
   * Выполнение функции задачи
   */
  async _executeTaskFunction(task) {
    if (typeof task.function === 'function') {
      return await task.function(task.data);
    } else if (typeof task.execute === 'function') {
      return await task.execute(task.data);
    } else if (task.module && task.method) {
      // Выполнение метода из модуля
      const module = require(task.module);
      const method = module[task.method];
      
      if (typeof method !== 'function') {
        throw new Error(`Метод ${task.method} не найден в модуле ${task.module}`);
      }
      
      return await method(task.data);
    } else {
      throw new Error('Не указан способ выполнения задачи');
    }
  }

  /**
   * Обновление статистики выполнения задач
   */
  _updateTaskStats(taskTime) {
    this.stats.taskTimes.push(taskTime);
    
    // Ограничиваем количество записей для расчета среднего
    if (this.stats.taskTimes.length > 1000) {
      this.stats.taskTimes.shift();
    }
    
    // Пересчитываем среднее время
    const sum = this.stats.taskTimes.reduce((acc, time) => acc + time, 0);
    this.stats.averageTaskTime = sum / this.stats.taskTimes.length;
  }

  /**
   * Отмена задачи
   */
  cancelTask(taskId) {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      return false;
    }

    // Если у задачи есть метод отмены
    if (task.cancel && typeof task.cancel === 'function') {
      try {
        task.cancel();
      } catch (error) {
        this.emit('task:cancel:error', task, error);
      }
    }

    this.activeTasks.delete(taskId);
    this.emit('task:cancelled', task);
    
    return true;
  }

  /**
   * Проверка на заполненность пула
   */
  isFull() {
    return this.activeTasks.size >= this.options.maxWorkers;
  }

  /**
   * Получение количества активных задач
   */
  getActiveCount() {
    return this.activeTasks.size;
  }

  /**
   * Получение списка активных задач
   */
  getActiveTasks() {
    return Array.from(this.activeTasks.values());
  }

  /**
   * Получение статистики пула
   */
  getStats() {
    return {
      ...this.stats,
      activeTasks: this.getActiveCount(),
      maxWorkers: this.options.maxWorkers,
      utilization: this.getActiveCount() / this.options.maxWorkers
    };
  }

  /**
   * Очистка завершенных задач
   */
  cleanup() {
    const now = Date.now();
    const maxTaskAge = 3600000; // 1 час
    
    for (const [taskId, task] of this.activeTasks.entries()) {
      const taskAge = now - task.startTime;
      if (taskAge > maxTaskAge) {
        this.cancelTask(taskId);
      }
    }
  }

  /**
   * Получение информации о задаче
   */
  getTaskInfo(taskId) {
    return this.activeTasks.get(taskId);
  }

  /**
   * Приостановка выполнения задач
   */
  pause() {
    this.isRunning = false;
    this.emit('paused');
  }

  /**
   * Возобновление выполнения задач
   */
  resume() {
    this.isRunning = true;
    this.emit('resumed');
  }

  /**
   * Изменение максимального количества воркеров
   */
  setMaxWorkers(maxWorkers) {
    this.options.maxWorkers = maxWorkers;
    this.emit('maxWorkers:changed', maxWorkers);
  }

  /**
   * Получение нагрузки на пул
   */
  getLoad() {
    return {
      active: this.getActiveCount(),
      max: this.options.maxWorkers,
      percentage: (this.getActiveCount() / this.options.maxWorkers) * 100
    };
  }
}

export default WorkerPool;
