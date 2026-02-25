/**
 * Unified Task Management Utilities Library
 * Предоставляет утилиты для создания, управления и мониторинга задач.
 */

const crypto = require('crypto');
const path = require('path');
const { LoggingUtils } = require('../../logging-monitoring/logging/index');
const { ErrorHandlingUtils } = require('../../error-management/error-handler/index.mjs');
const { FileOperations } = require('../file-operations/src/file-operations.cjs'); // Используем новую утилиту файловой системы

class TaskManagementUtils {
  constructor(options = {}) {
    this.options = {
      tasksFile: options.tasksFile || 'tasks.json',
      appsConfigFile: options.appsConfigFile || 'apps-list.json',
      storagePath: options.storagePath || process.cwd(), // Новый параметр для пути хранения задач
      resolvedStatuses: options.resolvedStatuses || ['resolved', 'closed', 'ignored', 'ok', 'cancelled'],
      maxTasks: options.maxTasks || 1000,
      ...options
    };
    
    this.tasks = [];
    this.appsMap = new Map();
    this.logger = options.logger || console;
    this.errorHandler = options.errorHandler || console;
    this.fileSystemUtils = options.fileSystemUtils || null;
  }

  async initialize() {
    await this._loadTasks();
    await this._loadAppsConfig();
    this.logger.info('[TaskManagementUtils] Инициализация завершена. Загружено задач:', this.tasks.length);
  }

  async cleanup() {
    this.logger.info('[TaskManagementUtils] Очистка TaskManager.');
    // Здесь можно добавить логику для сохранения состояния или других операций очистки
    await this._saveTasks(); // Убедимся, что все изменения сохранены
    this.tasks = [];
    this.appsMap.clear();
  }

  async createErrorTask(options) {
    const {
      appId,
      errorCode,
      status = 'open',
      message,
      context = {},
      priority = 'medium',
      tags = [],
      scheduledFor = null
    } = options;

    if (!appId || !errorCode || !message) {
      this.errorHandler.handleError(this.errorHandler.createError('appId, errorCode и message обязательны', 'VALIDATION'), { options });
      throw new Error('appId, errorCode и message обязательны');
    }

    const app = this.appsMap.get(String(appId));
    if (!app) {
      this.errorHandler.handleError(this.errorHandler.createError(`Приложение с ID "${appId}" не найдено`, 'VALIDATION'), { appId });
      throw new Error(`Приложение с ID "${appId}" не найдено`);
    }

    const task = {
      id: this._generateTaskId(),
      appId: String(appId),
      appPath: app.path,
      errorCode: String(errorCode),
      status: String(status),
      message: String(message),
      context: { ...context },
      priority: String(priority),
      tags: Array.isArray(tags) ? tags : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      resolvedAt: null,
      resolvedBy: null,
      attempts: 0,
      lastAttempt: null,
      scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : null
    };

    this.tasks.push(task);
    await this._saveTasks();
    this.logger.info(`[TaskManagementUtils] Создана новая задача: ${task.id} (${task.message})`);
    return task;
  }

  async loadTemplates() {
    this.logger.info('[TaskManagementUtils] loadTemplates called');
    return [];
  }

  async updateTaskStatus(taskId, status, resolvedBy = null) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error(`Задача с ID "${taskId}" не найдена`);
    }

    task.status = String(status);
    task.updatedAt = new Date().toISOString();

    if (this.options.resolvedStatuses.includes(status)) {
      task.resolvedAt = new Date().toISOString();
      task.resolvedBy = resolvedBy;
    } else {
      task.resolvedAt = null;
      task.resolvedBy = null;
    }

    await this._saveTasks();
    return task;
  }

  async cancelTask(taskId, reason = 'Отменено пользователем') {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) {
      this.errorHandler.handleError(this.errorHandler.createError(`Задача с ID "${taskId}" не найдена`, 'VALIDATION'), { taskId });
      throw new Error(`Задача с ID "${taskId}" не найдена`);
    }

    if (task.status === 'cancelled') {
      this.logger.warn(`[TaskManagementUtils] Задача ${taskId} уже отменена.`);
      return task;
    }

    task.status = 'cancelled';
    task.updatedAt = new Date().toISOString();
    task.resolvedAt = new Date().toISOString();
    task.resolvedBy = 'system';
    task.context.cancellationReason = reason;

    await this._saveTasks();
    this.logger.info(`[TaskManagementUtils] Задача ${taskId} отменена по причине: ${reason}`);
    return task;
  }

  async scheduleTask(taskId, scheduledFor) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) {
      this.errorHandler.handleError(this.errorHandler.createError(`Задача с ID "${taskId}" не найдена`, 'VALIDATION'), { taskId });
      throw new Error(`Задача с ID "${taskId}" не найдена`);
    }

    if (!(scheduledFor instanceof Date) && typeof scheduledFor !== 'string') {
      this.errorHandler.handleError(this.errorHandler.createError('scheduledFor должна быть датой или строкой даты', 'VALIDATION'), { scheduledFor });
      throw new Error('scheduledFor должна быть датой или строкой даты');
    }

    task.scheduledFor = new Date(scheduledFor).toISOString();
    task.updatedAt = new Date().toISOString();
    this.logger.info(`[TaskManagementUtils] Задача ${taskId} запланирована на ${task.scheduledFor}`);
    await this._saveTasks();
    return task;
  }

  async getScheduledTasks() {
    const now = new Date();
    return this.tasks.filter(task =>
      task.scheduledFor &&
      new Date(task.scheduledFor) <= now &&
      !this.options.resolvedStatuses.includes(task.status)
    ).sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor));
  }

  getTasksByPriority(status = null) {
    const priorityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
    let filteredTasks = this.tasks;

    if (status) {
      filteredTasks = filteredTasks.filter(task => task.status === status);
    }
    
    return filteredTasks.sort((a, b) => {
      const pA = priorityOrder[a.priority] !== undefined ? priorityOrder[a.priority] : 99;
      const pB = priorityOrder[b.priority] !== undefined ? priorityOrder[b.priority] : 99;
      return pA - pB;
    });
  }

  async cleanupResolvedTasks(options = {}) {
    const {
      olderThan = '7d',
      statuses = this.options.resolvedStatuses,
      dryRun = false
    } = options;

    const cutoffDate = this._parseTimeAgo(olderThan);
    const tasksToRemove = this.tasks.filter(task => 
      statuses.includes(task.status) && 
      task.resolvedAt && 
      new Date(task.resolvedAt) < cutoffDate
    );

    if (dryRun) {
      return {
        tasksToRemove: tasksToRemove.length,
        tasks: tasksToRemove
      };
    }

    this.tasks = this.tasks.filter(task => !tasksToRemove.includes(task));
    await this._saveTasks();

    return {
      removedTasks: tasksToRemove.length,
      remainingTasks: this.tasks.length
    };
  }

  async reportTaskStatus(options = {}) {
    const {
      appId = null,
      status = null,
      priority = null,
      includeResolved = false
    } = options;

    let filteredTasks = this.tasks;

    if (appId) {
      filteredTasks = filteredTasks.filter(task => task.appId === String(appId));
    }

    if (status) {
      filteredTasks = filteredTasks.filter(task => task.status === String(status));
    }

    if (priority) {
      filteredTasks = filteredTasks.filter(task => task.priority === String(priority));
    }

    if (tags && tags.length > 0) {
      filteredTasks = filteredTasks.filter(task => 
        tags.some(tag => task.tags.includes(tag))
      );
    }

    if (!includeResolved) {
      filteredTasks = filteredTasks.filter(task => !this.options.resolvedStatuses.includes(task.status));
    }

    const statusCounts = {};
    const priorityCounts = {};
    const appCounts = {};

    filteredTasks.forEach(task => {
      statusCounts[task.status] = (statusCounts[task.status] || 0) + 1;
      priorityCounts[task.priority] = (priorityCounts[task.priority] || 0) + 1;
      appCounts[task.appId] = (appCounts[task.appId] || 0) + 1;
    });

    return {
      total: filteredTasks.length,
      byStatus: statusCounts,
      byPriority: priorityCounts,
      byApp: appCounts,
      tasks: filteredTasks
    };
  }

  async heartbeatOpenTasks(options = {}) {
    const {
      appId = null,
      updateAttempts = true
    } = options;

    let openTasks = this.tasks.filter(task => 
      !this.options.resolvedStatuses.includes(task.status)
    );

    if (appId) {
      openTasks = openTasks.filter(task => task.appId === String(appId));
    }

    const updatedTasks = [];

    for (const task of openTasks) {
      if (updateAttempts) {
        task.attempts = (task.attempts || 0) + 1;
        task.lastAttempt = new Date().toISOString();
      }
      
      task.updatedAt = new Date().toISOString();
      updatedTasks.push(task);
    }

    if (updatedTasks.length > 0) {
      await this._saveTasks();
    }

    return {
      updatedTasks: updatedTasks.length,
      tasks: updatedTasks
    };
  }

  async findTaskByError(appId, errorCode, options = {}) {
    const { includeResolved = false, resolvedOlderThan = '7d' } = options;
    const cutoffDate = this._parseTimeAgo(resolvedOlderThan);

    let foundTask = null;

    foundTask = this.tasks.find(task =>
      task.appId === String(appId) &&
      task.errorCode === String(errorCode) &&
      !this.options.resolvedStatuses.includes(task.status)
    );

    if (foundTask) {
      return foundTask;
    }

    if (includeResolved) {
      foundTask = this.tasks.find(task =>
        task.appId === String(appId) &&
        task.errorCode === String(errorCode) &&
        this.options.resolvedStatuses.includes(task.status) &&
        task.resolvedAt &&
        new Date(task.resolvedAt) >= cutoffDate
      );
    }
    
    return foundTask;
  }

  async reopenTask(taskId, newContext = {}) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error(`Задача с ID "${taskId}" не найдена`);
    }

    if (!this.options.resolvedStatuses.includes(task.status)) {
      return task;
    }

    task.status = 'open';
    task.updatedAt = new Date().toISOString();
    task.resolvedAt = null;
    task.resolvedBy = null;
    task.attempts = (task.attempts || 0) + 1;
    task.lastAttempt = new Date().toISOString();
    task.context = { ...task.context, ...newContext };

    await this._saveTasks();
    return task;
  }

  async findTasks(criteria = {}) {
    const {
      appId,
      errorCode,
      status,
      priority,
      tags,
      createdAfter,
      createdBefore
    } = criteria;

    let filteredTasks = this.tasks;

    if (appId) {
      filteredTasks = filteredTasks.filter(task => task.appId === String(appId));
    }

    if (errorCode) {
      filteredTasks = filteredTasks.filter(task => task.errorCode === String(errorCode));
    }

    if (status) {
      filteredTasks = filteredTasks.filter(task => task.status === String(status));
    }

    if (priority) {
      filteredTasks = filteredTasks.filter(task => task.priority === String(priority));
    }

    if (tags && tags.length > 0) {
      filteredTasks = filteredTasks.filter(task => 
        tags.some(tag => task.tags.includes(tag))
      );
    }

    if (createdAfter) {
      const afterDate = new Date(createdAfter);
      filteredTasks = filteredTasks.filter(task => new Date(task.createdAt) >= afterDate);
    }

    if (createdBefore) {
      const beforeDate = new Date(createdBefore);
      filteredTasks = filteredTasks.filter(task => new Date(task.createdAt) <= beforeDate);
    }

    return filteredTasks;
  }

  async _loadTasks() {
    try {
      const tasksFilePath = path.join(this.options.storagePath, this.options.tasksFile);
      if (await this.fileSystemUtils.fileExists(tasksFilePath)) {
        const data = await this.fileSystemUtils.readFile(tasksFilePath);
        this.tasks = JSON.parse(data);
      } else {
        this.tasks = [];
      }
    } catch (error) {
      this.errorHandler.handleError(error, { operation: '_loadTasks', path: this.options.tasksFile });
      this.tasks = [];
    }
  }

  async _saveTasks() {
    try {
      if (this.tasks.length > this.options.maxTasks) {
        this.tasks = this.tasks
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
          .slice(0, this.options.maxTasks);
        this.logger.warn(`[TaskManagementUtils] Количество задач превысило лимит ${this.options.maxTasks}. Удалены старые задачи.`);
      }

      const tasksFilePath = path.join(this.options.storagePath, this.options.tasksFile);
      await this.fileSystemUtils.writeFile(tasksFilePath, JSON.stringify(this.tasks, null, 2));
    } catch (error) {
      this.errorHandler.handleError(error, { operation: '_saveTasks', path: this.options.tasksFile });
      throw error;
    }
  }

  async _loadAppsConfig() {
    try {
      const appsConfigPath = path.join(this.options.storagePath, this.options.appsConfigFile);
      if (await this.fileSystemUtils.fileExists(appsConfigPath)) {
        const data = await this.fileSystemUtils.readFile(appsConfigPath);
        const config = JSON.parse(data);
        
        if (config.apps && Array.isArray(config.apps)) {
          for (const app of config.apps) {
            const id = app.id || app.appId;
            if (id) {
              this.appsMap.set(String(id), { 
                id: String(id), 
                path: app.path || '.' 
              });
            }
          }
        }
      }
    } catch (error) {
      this.errorHandler.handleError(error, { operation: '_loadAppsConfig', path: this.options.appsConfigFile });
    }
  }

  _generateTaskId() {
    return crypto.randomBytes(8).toString('hex');
  }

  _parseTimeAgo(timeAgo) {
    const now = new Date();
    const match = timeAgo.match(/^(\d+)([dhms])$/);
    
    if (!match) {
      throw new Error('Неверный формат времени. Используйте: 7d, 24h, 30m, 60s');
    }

    const [, amount, unit] = match;
    const value = parseInt(amount);

    switch (unit) {
      case 'd': return new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
      case 'h': return new Date(now.getTime() - value * 60 * 60 * 1000);
      case 'm': return new Date(now.getTime() - value * 60 * 1000);
      case 's': return new Date(now.getTime() - value * 1000);
      default: throw new Error('Неизвестная единица времени');
    }
  }
}

// Экспортируем класс и экземпляры для быстрого использования
module.exports = { TaskManagementUtils, taskManagementUtils: new TaskManagementUtils() };

// Вспомогательные функции для быстрого использования (передача инстанса)
module.exports.createErrorTask = async (options) => {
  // Если инстанс уже создан в другом месте, можно передать его, чтобы избежать повторной инициализации
  const manager = module.exports.taskManagementUtils; 
  await manager.initialize(); // Убедимся, что менеджер инициализирован
  return manager.createErrorTask(options);
};

module.exports.cleanupResolvedTasks = async (options) => {
  const manager = module.exports.taskManagementUtils;
  await manager.initialize();
  return manager.cleanupResolvedTasks(options);
};

module.exports.reportTaskStatus = async (options) => {
  const manager = module.exports.taskManagementUtils;
  await manager.initialize();
  return manager.reportTaskStatus(options);
};
