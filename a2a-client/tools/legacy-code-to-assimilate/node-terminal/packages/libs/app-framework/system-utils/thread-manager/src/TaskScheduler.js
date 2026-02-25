const EventEmitter = require('eventemitter3');

/**
 * Планировщик задач
 */
class TaskScheduler extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      checkInterval: options.checkInterval || 1000, // 1 секунда
      maxScheduledTasks: options.maxScheduledTasks || 1000,
      ...options
    };

    this.isRunning = false;
    this.checkInterval = null;
    this.scheduledTasks = new Map();
    this.taskCounter = 0;
    
    this.stats = {
      totalScheduled: 0,
      totalExecuted: 0,
      totalCancelled: 0,
      activeScheduled: 0
    };
  }

  /**
   * Запуск планировщика
   */
  start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    
    // Запускаем проверку запланированных задач
    this.checkInterval = setInterval(() => {
      this._checkScheduledTasks();
    }, this.options.checkInterval);
    
    this.emit('started');
  }

  /**
   * Остановка планировщика
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    this.emit('stopped');
  }

  /**
   * Планирование задачи
   */
  schedule(task, schedule) {
    if (this.scheduledTasks.size >= this.options.maxScheduledTasks) {
      throw new Error('Достигнут лимит запланированных задач');
    }

    const taskId = `scheduled_${++this.taskCounter}_${Date.now()}`;
    const scheduledTask = {
      id: taskId,
      task: { ...task, id: taskId },
      schedule: this._parseSchedule(schedule),
      createdAt: Date.now(),
      nextExecution: this._calculateNextExecution(schedule),
      executions: 0,
      maxExecutions: schedule.maxExecutions || Infinity
    };

    this.scheduledTasks.set(taskId, scheduledTask);
    this.stats.totalScheduled++;
    this.stats.activeScheduled++;
    
    this.emit('task:scheduled', scheduledTask);
    
    return taskId;
  }

  /**
   * Парсинг расписания
   */
  _parseSchedule(schedule) {
    if (typeof schedule === 'string') {
      // Cron-like формат: "*/5 * * * *" (каждые 5 минут)
      return this._parseCronSchedule(schedule);
    } else if (typeof schedule === 'object') {
      return {
        type: schedule.type || 'interval',
        interval: schedule.interval,
        cron: schedule.cron,
        at: schedule.at,
        maxExecutions: schedule.maxExecutions,
        ...schedule
      };
    } else {
      throw new Error('Неверный формат расписания');
    }
  }

  /**
   * Парсинг cron-подобного расписания
   */
  _parseCronSchedule(cronString) {
    const parts = cronString.split(' ');
    if (parts.length !== 5) {
      throw new Error('Неверный формат cron строки');
    }

    return {
      type: 'cron',
      cron: cronString,
      minute: parts[0],
      hour: parts[1],
      day: parts[2],
      month: parts[3],
      weekday: parts[4]
    };
  }

  /**
   * Расчет следующего времени выполнения
   */
  _calculateNextExecution(schedule) {
    const now = new Date();
    
    if (schedule.type === 'interval') {
      return now.getTime() + (schedule.interval || 60000);
    } else if (schedule.type === 'cron') {
      return this._calculateNextCronExecution(schedule, now);
    } else if (schedule.at) {
      return new Date(schedule.at).getTime();
    } else {
      return now.getTime() + 60000; // По умолчанию через минуту
    }
  }

  /**
   * Расчет следующего времени выполнения для cron
   */
  _calculateNextCronExecution(schedule, now) {
    // Упрощенная реализация cron парсинга
    // В реальном проекте лучше использовать библиотеку node-cron
    
    const next = new Date(now);
    
    if (schedule.minute !== '*') {
      const minutes = parseInt(schedule.minute);
      next.setMinutes(minutes);
      if (next <= now) {
        next.setHours(next.getHours() + 1);
      }
    }
    
    if (schedule.hour !== '*') {
      const hours = parseInt(schedule.hour);
      next.setHours(hours);
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
    }
    
    return next.getTime();
  }

  /**
   * Проверка запланированных задач
   */
  _checkScheduledTasks() {
    const now = Date.now();
    const tasksToExecute = [];

    for (const [taskId, scheduledTask] of this.scheduledTasks.entries()) {
      if (scheduledTask.nextExecution <= now) {
        tasksToExecute.push(scheduledTask);
      }
    }

    // Выполняем готовые задачи
    tasksToExecute.forEach(scheduledTask => {
      this._executeScheduledTask(scheduledTask);
    });
  }

  /**
   * Выполнение запланированной задачи
   */
  _executeScheduledTask(scheduledTask) {
    const { task, schedule } = scheduledTask;
    
    // Увеличиваем счетчик выполнений
    scheduledTask.executions++;
    
    // Проверяем лимит выполнений
    if (scheduledTask.executions >= scheduledTask.maxExecutions) {
      this.scheduledTasks.delete(scheduledTask.id);
      this.stats.activeScheduled--;
      this.stats.totalCancelled++;
      this.emit('task:completed', scheduledTask);
      return;
    }

    // Вычисляем следующее время выполнения
    scheduledTask.nextExecution = this._calculateNextExecution(schedule);
    
    this.stats.totalExecuted++;
    this.emit('task:execute', scheduledTask);
  }

  /**
   * Отмена запланированной задачи
   */
  cancel(taskId) {
    const scheduledTask = this.scheduledTasks.get(taskId);
    if (!scheduledTask) {
      return false;
    }

    this.scheduledTasks.delete(taskId);
    this.stats.activeScheduled--;
    this.stats.totalCancelled++;
    
    this.emit('task:cancelled', scheduledTask);
    
    return true;
  }

  /**
   * Получение информации о запланированной задаче
   */
  getTask(taskId) {
    return this.scheduledTasks.get(taskId);
  }

  /**
   * Получение всех запланированных задач
   */
  getAllTasks() {
    return Array.from(this.scheduledTasks.values());
  }

  /**
   * Получение задач по критериям
   */
  getTasksByCriteria(criteria) {
    const results = [];
    
    for (const scheduledTask of this.scheduledTasks.values()) {
      let matches = true;
      
      for (const [key, value] of Object.entries(criteria)) {
        if (scheduledTask[key] !== value) {
          matches = false;
          break;
        }
      }
      
      if (matches) {
        results.push(scheduledTask);
      }
    }
    
    return results;
  }

  /**
   * Обновление расписания задачи
   */
  updateSchedule(taskId, newSchedule) {
    const scheduledTask = this.scheduledTasks.get(taskId);
    if (!scheduledTask) {
      return false;
    }

    scheduledTask.schedule = this._parseSchedule(newSchedule);
    scheduledTask.nextExecution = this._calculateNextExecution(scheduledTask.schedule);
    
    this.emit('task:updated', scheduledTask);
    
    return true;
  }

  /**
   * Получение статистики планировщика
   */
  getStats() {
    return {
      ...this.stats,
      activeScheduled: this.scheduledTasks.size,
      maxScheduledTasks: this.options.maxScheduledTasks
    };
  }

  /**
   * Очистка старых задач
   */
  cleanup(maxAge = 86400000) { // 24 часа по умолчанию
    const now = Date.now();
    const tasksToRemove = [];

    for (const [taskId, scheduledTask] of this.scheduledTasks.entries()) {
      const age = now - scheduledTask.createdAt;
      if (age > maxAge) {
        tasksToRemove.push(taskId);
      }
    }

    tasksToRemove.forEach(taskId => {
      this.cancel(taskId);
    });

    return tasksToRemove.length;
  }

  /**
   * Пауза планировщика
   */
  pause() {
    this.isRunning = false;
    this.emit('paused');
  }

  /**
   * Возобновление планировщика
   */
  resume() {
    this.isRunning = true;
    this.emit('resumed');
  }

  /**
   * Экспорт запланированных задач
   */
  exportTasks() {
    return {
      tasks: Array.from(this.scheduledTasks.values()),
      stats: this.getStats(),
      timestamp: Date.now()
    };
  }

  /**
   * Импорт запланированных задач
   */
  importTasks(tasksData) {
    if (!Array.isArray(tasksData)) {
      throw new Error('Неверный формат данных для импорта');
    }

    tasksData.forEach(taskData => {
      try {
        this.schedule(taskData.task, taskData.schedule);
      } catch (error) {
        this.emit('import:error', taskData, error);
      }
    });

    this.emit('tasks:imported', tasksData.length);
  }
}

export default TaskScheduler;
