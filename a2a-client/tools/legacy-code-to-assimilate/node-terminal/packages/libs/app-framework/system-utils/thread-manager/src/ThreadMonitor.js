const EventEmitter = require('eventemitter3');

/**
 * Мониторинг потоков выполнения и сбор метрик
 */
class ThreadMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      metricsInterval: options.metricsInterval || 5000, // 5 секунд
      maxHistorySize: options.maxHistorySize || 1000,
      enableSystemMetrics: options.enableSystemMetrics !== false,
      ...options
    };

    this.isRunning = false;
    this.metricsInterval = null;
    
    // Метрики производительности
    this.metrics = {
      cpu: {
        usage: 0,
        load: 0,
        history: []
      },
      memory: {
        used: 0,
        total: 0,
        percentage: 0,
        history: []
      },
      tasks: {
        active: 0,
        queued: 0,
        completed: 0,
        failed: 0,
        averageTime: 0,
        history: []
      },
      throughput: {
        tasksPerSecond: 0,
        history: []
      },
      errors: {
        count: 0,
        rate: 0,
        history: []
      }
    };
    
    // Счетчики для расчета метрик
    this.counters = {
      tasksCompleted: 0,
      tasksFailed: 0,
      lastMetricsTime: Date.now()
    };
  }

  /**
   * Запуск мониторинга
   */
  start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.counters.lastMetricsTime = Date.now();
    
    // Запускаем сбор метрик
    this.metricsInterval = setInterval(() => {
      this._collectMetrics();
    }, this.options.metricsInterval);
    
    this.emit('started');
  }

  /**
   * Остановка мониторинга
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
    
    this.emit('stopped');
  }

  /**
   * Сбор метрик
   */
  _collectMetrics() {
    const now = Date.now();
    const timeDiff = now - this.counters.lastMetricsTime;
    
    // Сбор системных метрик
    if (this.options.enableSystemMetrics) {
      this._collectSystemMetrics();
    }
    
    // Расчет метрик производительности
    this._calculatePerformanceMetrics(timeDiff);
    
    // Сохранение истории
    this._saveMetricsHistory();
    
    this.counters.lastMetricsTime = now;
    
    this.emit('metrics:update', this.getMetrics());
  }

  /**
   * Сбор системных метрик
   */
  _collectSystemMetrics() {
    try {
      // CPU usage (упрощенная версия)
      const startUsage = process.cpuUsage();
      const startTime = process.hrtime.bigint();
      
      // Небольшая задержка для измерения CPU
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const endTime = process.hrtime.bigint();
        
        const cpuTime = (endUsage.user + endUsage.system) / 1000000; // в секундах
        const realTime = Number(endTime - startTime) / 1000000000; // в секундах
        
        this.metrics.cpu.usage = (cpuTime / realTime) * 100;
      }, 100);
      
      // Memory usage
      const memUsage = process.memoryUsage();
      this.metrics.memory.used = memUsage.heapUsed;
      this.metrics.memory.total = memUsage.heapTotal;
      this.metrics.memory.percentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      
    } catch (error) {
      this.emit('metrics:error', error);
    }
  }

  /**
   * Расчет метрик производительности
   */
  _calculatePerformanceMetrics(timeDiff) {
    const seconds = timeDiff / 1000;
    
    // Throughput (задачи в секунду)
    this.metrics.throughput.tasksPerSecond = this.counters.tasksCompleted / seconds;
    
    // Error rate
    this.metrics.errors.rate = this.counters.tasksFailed / seconds;
    
    // Сброс счетчиков
    this.counters.tasksCompleted = 0;
    this.counters.tasksFailed = 0;
  }

  /**
   * Сохранение истории метрик
   */
  _saveMetricsHistory() {
    const timestamp = Date.now();
    
    // CPU history
    this._addToHistory(this.metrics.cpu.history, {
      timestamp,
      usage: this.metrics.cpu.usage
    });
    
    // Memory history
    this._addToHistory(this.metrics.memory.history, {
      timestamp,
      used: this.metrics.memory.used,
      total: this.metrics.memory.total,
      percentage: this.metrics.memory.percentage
    });
    
    // Throughput history
    this._addToHistory(this.metrics.throughput.history, {
      timestamp,
      tasksPerSecond: this.metrics.throughput.tasksPerSecond
    });
    
    // Error rate history
    this._addToHistory(this.metrics.errors.history, {
      timestamp,
      rate: this.metrics.errors.rate
    });
  }

  /**
   * Добавление данных в историю с ограничением размера
   */
  _addToHistory(history, data) {
    history.push(data);
    
    if (history.length > this.options.maxHistorySize) {
      history.shift();
    }
  }

  /**
   * Обновление метрик задач
   */
  updateTaskMetrics(stats) {
    this.metrics.tasks.active = stats.activeTasks || 0;
    this.metrics.tasks.queued = stats.queuedTasks || 0;
    this.metrics.tasks.completed = stats.completedTasks || 0;
    this.metrics.tasks.failed = stats.failedTasks || 0;
    this.metrics.tasks.averageTime = stats.averageTaskTime || 0;
    
    // Обновляем счетчики
    this.counters.tasksCompleted += stats.completedTasks || 0;
    this.counters.tasksFailed += stats.failedTasks || 0;
  }

  /**
   * Регистрация события выполнения задачи
   */
  onTaskComplete(task, result, duration) {
    this.counters.tasksCompleted++;
    
    // Добавляем в историю задач
    this._addToHistory(this.metrics.tasks.history, {
      timestamp: Date.now(),
      taskId: task.id,
      duration,
      success: true
    });
  }

  /**
   * Регистрация события ошибки задачи
   */
  onTaskError(task, error, duration) {
    this.counters.tasksFailed++;
    this.metrics.errors.count++;
    
    // Добавляем в историю задач
    this._addToHistory(this.metrics.tasks.history, {
      timestamp: Date.now(),
      taskId: task.id,
      duration,
      success: false,
      error: error.message
    });
  }

  /**
   * Получение текущих метрик
   */
  getMetrics() {
    return {
      ...this.metrics,
      timestamp: Date.now(),
      isRunning: this.isRunning
    };
  }

  /**
   * Получение метрик за период
   */
  getMetricsForPeriod(startTime, endTime) {
    const filteredMetrics = {
      cpu: { history: [] },
      memory: { history: [] },
      tasks: { history: [] },
      throughput: { history: [] },
      errors: { history: [] }
    };
    
    // Фильтруем историю по времени
    Object.keys(filteredMetrics).forEach(key => {
      if (this.metrics[key].history) {
        filteredMetrics[key].history = this.metrics[key].history.filter(
          item => item.timestamp >= startTime && item.timestamp <= endTime
        );
      }
    });
    
    return filteredMetrics;
  }

  /**
   * Получение агрегированных метрик
   */
  getAggregatedMetrics() {
    const cpuHistory = this.metrics.cpu.history;
    const memoryHistory = this.metrics.memory.history;
    const throughputHistory = this.metrics.throughput.history;
    
    return {
      cpu: {
        average: cpuHistory.length > 0 ? 
          cpuHistory.reduce((sum, item) => sum + item.usage, 0) / cpuHistory.length : 0,
        max: cpuHistory.length > 0 ? Math.max(...cpuHistory.map(item => item.usage)) : 0,
        min: cpuHistory.length > 0 ? Math.min(...cpuHistory.map(item => item.usage)) : 0
      },
      memory: {
        average: memoryHistory.length > 0 ? 
          memoryHistory.reduce((sum, item) => sum + item.percentage, 0) / memoryHistory.length : 0,
        max: memoryHistory.length > 0 ? Math.max(...memoryHistory.map(item => item.percentage)) : 0,
        min: memoryHistory.length > 0 ? Math.min(...memoryHistory.map(item => item.percentage)) : 0
      },
      throughput: {
        average: throughputHistory.length > 0 ? 
          throughputHistory.reduce((sum, item) => sum + item.tasksPerSecond, 0) / throughputHistory.length : 0,
        max: throughputHistory.length > 0 ? Math.max(...throughputHistory.map(item => item.tasksPerSecond)) : 0,
        min: throughputHistory.length > 0 ? Math.min(...throughputHistory.map(item => item.tasksPerSecond)) : 0
      }
    };
  }

  /**
   * Очистка старых метрик
   */
  cleanup(maxAge = 3600000) { // 1 час по умолчанию
    const now = Date.now();
    
    Object.keys(this.metrics).forEach(key => {
      if (this.metrics[key].history) {
        this.metrics[key].history = this.metrics[key].history.filter(
          item => (now - item.timestamp) <= maxAge
        );
      }
    });
  }

  /**
   * Экспорт метрик
   */
  exportMetrics() {
    return {
      metrics: this.getMetrics(),
      aggregated: this.getAggregatedMetrics(),
      timestamp: Date.now()
    };
  }

  /**
   * Сброс метрик
   */
  reset() {
    Object.keys(this.metrics).forEach(key => {
      if (this.metrics[key].history) {
        this.metrics[key].history = [];
      }
    });
    
    this.counters = {
      tasksCompleted: 0,
      tasksFailed: 0,
      lastMetricsTime: Date.now()
    };
    
    this.emit('metrics:reset');
  }
}

export default ThreadMonitor;
