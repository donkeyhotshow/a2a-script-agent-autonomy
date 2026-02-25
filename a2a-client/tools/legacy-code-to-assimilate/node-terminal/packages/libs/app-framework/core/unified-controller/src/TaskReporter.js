/**
 * Система отчетов об ошибках для генерации задач на исправление
 */

import { debugCritical } from './TaskReporterLogger';
import { ReportPersistenceManager } from './ReportPersistenceManager';
import { ReportCrudOperations } from './ReportCrudOperations';
import { ReportQueryManager } from './ReportQueryManager';
import { ReportStatisticsManager } from './ReportStatisticsManager';

class TaskReporter {
  constructor() {
    this.reports = [];
    this.isInitialized = false;
    this.persistenceManager = new ReportPersistenceManager(this.reports);
    this.crudOperations = new ReportCrudOperations(this.reports, this.persistenceManager, this.sendReport.bind(this));
    this.queryManager = new ReportQueryManager(this.reports);
    this.statisticsManager = new ReportStatisticsManager(this.reports);
    
    debugCritical('TaskReporter инициализирован');
  }

  /**
   * Инициализация системы отчетов
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        debugCritical('TaskReporter уже инициализирован');
        return;
      }

      debugCritical('Начало инициализации TaskReporter');

      // Загрузка существующих отчетов
      await this.persistenceManager.loadReports();

      this.isInitialized = true;
      debugCritical('TaskReporter инициализирован успешно');
    } catch (error) {
      debugCritical('Критическая ошибка инициализации TaskReporter:', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Создание отчета об ошибке
   */
  createErrorReport(error, context = {}) {
    return this.crudOperations.createErrorReport(error, context);
  }

  /**
   * Определение приоритета ошибки
   */
  determinePriority(error, context) {
    return this.crudOperations.determinePriority(error, context);
  }

  /**
   * Запись ошибки плагина
   */
  recordPluginError(pluginName, error, context = '') {
    return this.crudOperations.recordPluginError(pluginName, error, context);
  }

  /**
   * Запись ошибки API
   */
  recordApiError(endpoint, error, context = {}) {
    return this.crudOperations.recordApiError(endpoint, error, context);
  }

  /**
   * Запись ошибки компонента
   */
  recordComponentError(componentName, error, context = {}) {
    return this.crudOperations.recordComponentError(componentName, error, context);
  }

  /**
   * Отправка отчета на сервер
   */
  async sendReport(reportId) {
    return this.crudOperations.sendReport(reportId);
  }

  /**
   * Получение отчетов по фильтрам
   */
  getReports(filters = {}) {
    return this.queryManager.getReports(filters);
  }

  /**
   * Обновление статуса отчета
   */
  updateReportStatus(reportId, status, notes = '') {
    return this.crudOperations.updateReportStatus(reportId, status, notes);
  }

  /**
   * Удаление отчета
   */
  deleteReport(reportId) {
    return this.crudOperations.deleteReport(reportId);
  }

  /**
   * Очистка старых отчетов
   */
  cleanupOldReports(daysToKeep = 30) {
    return this.persistenceManager.cleanupOldReports(daysToKeep);
  }

  /**
   * Получение статистики отчетов
   */
  getReportStats() {
    return this.statisticsManager.getReportStats();
  }
}

// Экспорт синглтона
const taskReporter = new TaskReporter();

// Глобальные функции для удобства использования
export const recordPluginError = (pluginName, error, context = '') => {
  return taskReporter.recordPluginError(pluginName, error, context);
};

export const recordApiError = (endpoint, error, context = {}) => {
  return taskReporter.recordApiError(endpoint, error, context);
};

export const recordComponentError = (componentName, error, context = {}) => {
  return taskReporter.recordComponentError(componentName, error, context);
};

export default taskReporter;


