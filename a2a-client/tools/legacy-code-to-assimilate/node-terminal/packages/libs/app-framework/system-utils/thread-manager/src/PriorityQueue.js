const EventEmitter = require('eventemitter3');

/**
 * Приоритетная очередь задач
 */
class PriorityQueue extends EventEmitter {
  constructor() {
    super();
    
    // Приоритеты от высшего к низшему
    this.priorities = ['critical', 'high', 'normal', 'low', 'background'];
    this.queues = {};
    
    // Инициализация очередей для каждого приоритета
    this.priorities.forEach(priority => {
      this.queues[priority] = [];
    });
    
    this.stats = {
      totalQueued: 0,
      totalProcessed: 0,
      byPriority: {}
    };
    
    // Инициализация статистики по приоритетам
    this.priorities.forEach(priority => {
      this.stats.byPriority[priority] = {
        queued: 0,
        processed: 0
      };
    });
  }

  /**
   * Добавление задачи в очередь
   */
  add(task) {
    const priority = task.priority || 'normal';
    
    if (!this.priorities.includes(priority)) {
      throw new Error(`Неизвестный приоритет: ${priority}`);
    }
    
    // Добавляем метаданные
    const queuedTask = {
      ...task,
      queuedAt: Date.now(),
      priority
    };
    
    this.queues[priority].push(queuedTask);
    this.stats.totalQueued++;
    this.stats.byPriority[priority].queued++;
    
    this.emit('task:added', queuedTask);
    
    return queuedTask;
  }

  /**
   * Получение следующей задачи с наивысшим приоритетом
   */
  getNext() {
    for (const priority of this.priorities) {
      if (this.queues[priority].length > 0) {
        const task = this.queues[priority].shift();
        this.stats.totalProcessed++;
        this.stats.byPriority[priority].queued--;
        this.stats.byPriority[priority].processed++;
        
        this.emit('task:removed', task);
        return task;
      }
    }
    
    return null;
  }

  /**
   * Просмотр следующей задачи без извлечения
   */
  peek() {
    for (const priority of this.priorities) {
      if (this.queues[priority].length > 0) {
        return this.queues[priority][0];
      }
    }
    
    return null;
  }

  /**
   * Удаление задачи по ID
   */
  remove(taskId) {
    for (const priority of this.priorities) {
      const index = this.queues[priority].findIndex(task => task.id === taskId);
      if (index !== -1) {
        const task = this.queues[priority].splice(index, 1)[0];
        this.stats.totalQueued--;
        this.stats.byPriority[priority].queued--;
        
        this.emit('task:removed', task);
        return task;
      }
    }
    
    return null;
  }

  /**
   * Получение всех задач в очереди
   */
  getAll() {
    const allTasks = [];
    
    for (const priority of this.priorities) {
      allTasks.push(...this.queues[priority]);
    }
    
    return allTasks;
  }

  /**
   * Получение задач по приоритету
   */
  getByPriority(priority) {
    if (!this.priorities.includes(priority)) {
      throw new Error(`Неизвестный приоритет: ${priority}`);
    }
    
    return [...this.queues[priority]];
  }

  /**
   * Получение статистики очереди
   */
  getStats() {
    const queueSizes = {};
    this.priorities.forEach(priority => {
      queueSizes[priority] = this.queues[priority].length;
    });
    
    return {
      ...this.stats,
      queueSizes,
      totalInQueue: this.getSize()
    };
  }

  /**
   * Получение общего размера очереди
   */
  getSize() {
    return this.priorities.reduce((total, priority) => {
      return total + this.queues[priority].length;
    }, 0);
  }

  /**
   * Проверка на пустоту очереди
   */
  isEmpty() {
    return this.getSize() === 0;
  }

  /**
   * Очистка очереди
   */
  clear() {
    const clearedTasks = [];
    
    this.priorities.forEach(priority => {
      clearedTasks.push(...this.queues[priority]);
      this.queues[priority] = [];
      this.stats.byPriority[priority].queued = 0;
    });
    
    this.stats.totalQueued = 0;
    
    this.emit('queue:cleared', clearedTasks);
    
    return clearedTasks;
  }

  /**
   * Очистка старых задач
   */
  cleanup(maxAge = 3600000) { // 1 час по умолчанию
    const now = Date.now();
    const cleanedTasks = [];
    
    this.priorities.forEach(priority => {
      const originalLength = this.queues[priority].length;
      this.queues[priority] = this.queues[priority].filter(task => {
        const age = now - task.queuedAt;
        if (age > maxAge) {
          cleanedTasks.push(task);
          return false;
        }
        return true;
      });
      
      const removed = originalLength - this.queues[priority].length;
      this.stats.byPriority[priority].queued -= removed;
      this.stats.totalQueued -= removed;
    });
    
    if (cleanedTasks.length > 0) {
      this.emit('tasks:cleaned', cleanedTasks);
    }
    
    return cleanedTasks;
  }

  /**
   * Перемещение задачи в другой приоритет
   */
  reprioritize(taskId, newPriority) {
    if (!this.priorities.includes(newPriority)) {
      throw new Error(`Неизвестный приоритет: ${newPriority}`);
    }
    
    const task = this.remove(taskId);
    if (task) {
      task.priority = newPriority;
      return this.add(task);
    }
    
    return null;
  }

  /**
   * Получение задач с определенными критериями
   */
  find(criteria) {
    const results = [];
    
    for (const priority of this.priorities) {
      for (const task of this.queues[priority]) {
        let matches = true;
        
        for (const [key, value] of Object.entries(criteria)) {
          if (task[key] !== value) {
            matches = false;
            break;
          }
        }
        
        if (matches) {
          results.push(task);
        }
      }
    }
    
    return results;
  }
}

export default PriorityQueue;
