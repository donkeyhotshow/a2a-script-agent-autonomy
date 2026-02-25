const EventEmitter = require('eventemitter3');
const PriorityQueue = require('./PriorityQueue');
const WorkerPool = require('./WorkerPool');
const ThreadMonitor = require('./ThreadMonitor');
const TaskScheduler = require('./TaskScheduler');
const { LoggerCore } = require('../../../logging-reporting/core-logger/index.js'); // Updated path after libs reorganization
const ErrorHandler = require('../../error-handler/src/error-handler.js');

/**
 * Основной класс для управления потоками выполнения кода
 */
class ThreadManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      maxConcurrency: options.maxConcurrency || 4,
      defaultPriority: options.defaultPriority || 'normal',
      enableMonitoring: options.enableMonitoring !== false,
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 1000,
      taskTimeout: options.taskTimeout || 30000,
      ...options
    };

    this.logger = options.logger || new LoggerCore();
    this.errorHandler = options.errorHandler || new ErrorHandler({ logger: this.logger });

    // Инициализация компонентов
    this.priorityQueue = new PriorityQueue();
    this.workerPool = new WorkerPool({
      maxWorkers: this.options.maxConcurrency,
      taskTimeout: this.options.taskTimeout,
      logger: this.logger, // Передаем логгер в WorkerPool
      errorHandler: this.errorHandler // Передаем обработчик ошибок в WorkerPool
    });
    
    this.monitor = this.options.enableMonitoring ? new ThreadMonitor({ logger: this.logger }) : null;
    this.scheduler = new TaskScheduler({ logger: this.logger, errorHandler: this.errorHandler });
    
    // Состояние менеджера
    this.isRunning = false;
    this.stats = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      activeTasks: 0,
      queuedTasks: 0,
      cancelledTasks: 0,
      scheduledTasks: 0
    };

    this._setupEventHandlers();
    this.logger.info('[ThreadManager] ThreadManager инициализирован.');
  }

  /**
   * Настройка обработчиков событий
   */
  _setupEventHandlers() {
    // Обработка событий от воркер пула
    this.workerPool.on('task:start', (task) => {
      this.stats.activeTasks++;
      this.stats.queuedTasks--;
      this.logger.debug(`[ThreadManager] Задача ${task.id} начала выполнение.`);
      this.emit('task:start', task);
    });

    this.workerPool.on('task:complete', (task, result) => {
      this.stats.completedTasks++;
      this.stats.activeTasks--;
      this.logger.info(`[ThreadManager] Задача ${task.id} успешно завершена.`);
      this.emit('task:complete', task, result);
      this._processNextTask(); // Попытаться запустить следующую задачу
    });

    this.workerPool.on('task:error', (task, error) => {
      this.stats.failedTasks++;
      this.stats.activeTasks--;
      this.errorHandler.handleError(error, { task: task.id, operation: 'taskExecution' });
      this.emit('task:error', task, error);
      this._processNextTask(); // Попытаться запустить следующую задачу
    });

    // Обработка событий от монитора
    if (this.monitor) {
      this.monitor.on('metrics:update', (metrics) => {
        this.emit('metrics:update', metrics);
      });
    }

    // Обработка событий от планировщика
    this.scheduler.on('task:ready', (task) => {
      this.logger.info(`[ThreadManager] Запланированная задача ${task.id} готова к выполнению.`);
      this.stats.scheduledTasks--;
      this.addTask(task); // Добавляем в обычную очередь для выполнения
    });
  }

  /**
   * Добавление задачи в очередь
   */
  async addTask(task) {
    const taskConfig = {
      id: task.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      priority: task.priority || this.options.defaultPriority,
      retryAttempts: task.retryAttempts || this.options.retryAttempts,
      retryDelay: task.retryDelay || this.options.retryDelay,
      timeout: task.timeout || this.options.taskTimeout,
      ...task
    };

    if (task.scheduledFor && new Date(task.scheduledFor) > new Date()) {
      // Если задача запланирована на будущее, добавляем в планировщик
      this.scheduler.schedule(taskConfig);
      this.stats.scheduledTasks++;
      this.logger.info(`[ThreadManager] Задача ${taskConfig.id} запланирована.`);
      this.emit('task:scheduled', taskConfig);
    } else {
      this.stats.totalTasks++;
      this.stats.queuedTasks++;
      
      this.priorityQueue.add(taskConfig);
      this.logger.debug(`[ThreadManager] Задача ${taskConfig.id} добавлена в очередь.`);
      this.emit('task:queued', taskConfig);
      
      // Запускаем обработку если менеджер активен
      if (this.isRunning) {
        this._processNextTask();
      }
    }
    
    return taskConfig.id;
  }

  /**
   * Обработка следующей задачи из очереди
   */
  async _processNextTask() {
    if (!this.isRunning || this.workerPool.isFull() || this.priorityQueue.isEmpty()) {
      return;
    }

    const task = this.priorityQueue.getNext();
    if (!task) {
      return;
    }

    try {
      this.logger.debug(`[ThreadManager] Отправка задачи ${task.id} в WorkerPool.`);
      await this.workerPool.executeTask(task);
    } catch (error) {
      this.errorHandler.handleError(error, { task: task.id, operation: '_processNextTask' });
      this.emit('error', error);
    }
  }

  /**
   * Запуск менеджера потоков
   */
  async start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    await this.workerPool.start();
    
    if (this.monitor) {
      this.monitor.start();
    }
    
    this.scheduler.start();
    
    // Запускаем обработку задач
    this._processNextTask();
    
    this.emit('started');
  }

  /**
   * Остановка менеджера потоков
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    await this.workerPool.stop();
    
    if (this.monitor) {
      this.monitor.stop();
    }
    
    this.scheduler.stop();
    
    this.emit('stopped');
  }

  /**
   * Получение статистики
   */
  getStats() {
    return {
      ...this.stats,
      workerPool: this.workerPool.getStats(),
      queue: this.priorityQueue.getStats(),
      monitor: this.monitor ? this.monitor.getMetrics() : null
    };
  }

  /**
   * Очистка завершенных задач
   */
  cleanup() {
    this.priorityQueue.cleanup();
    this.workerPool.cleanup();
    
    if (this.monitor) {
      this.monitor.cleanup();
    }
  }

  /**
   * Планирование задачи на определенное время
   */
  scheduleTask(task, schedule) {
    return this.scheduler.schedule(task, schedule);
  }

  /**
   * Отмена задачи
   */
  cancelTask(taskId) {
    // Проверяем в очереди
    const queuedTask = this.priorityQueue.remove(taskId);
    if (queuedTask) {
      this.stats.queuedTasks--;
      this.stats.cancelledTasks++;
      this.logger.info(`[ThreadManager] Задача ${taskId} отменена (в очереди).`);
      this.emit('task:cancelled', queuedTask);
      return true;
    }

    // Проверяем в планировщике
    const scheduledTask = this.scheduler.cancel(taskId);
    if (scheduledTask) {
      this.stats.scheduledTasks--;
      this.stats.cancelledTasks++;
      this.logger.info(`[ThreadManager] Задача ${taskId} отменена (запланирована).`);
      this.emit('task:cancelled', scheduledTask);
      return true;
    }

    // Проверяем в воркер пуле
    const cancelled = this.workerPool.cancelTask(taskId);
    if (cancelled) {
      this.stats.activeTasks--; // Предполагаем, что отмененная активная задача больше не считается активной
      this.stats.cancelledTasks++;
      this.logger.info(`[ThreadManager] Задача ${taskId} отменена (в процессе выполнения).`);
      this.emit('task:cancelled', { id: taskId });
      return true;
    }

    this.logger.warn(`[ThreadManager] Задача ${taskId} не найдена для отмены.`);
    return false;
  }

  /**
   * Получение списка активных задач
   */
  getActiveTasks() {
    return this.workerPool.getActiveTasks();
  }

  /**
   * Получение списка задач в очереди
   */
  getQueuedTasks() {
    return this.priorityQueue.getAll();
  }
}

export default ThreadManager;
