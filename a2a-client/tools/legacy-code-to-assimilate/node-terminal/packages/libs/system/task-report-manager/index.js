/**
 * TaskReportManager - менеджер отчетов задач
 * Управление генерацией, хранением и экспортом отчетов о задачах
 */

const fs = require('fs').promises;
const path = require('path');
const logger = require('C:/apps/libs/logging-monitoring/logging/index.mjs');
const { ErrorHandlingUtils } = require('@libs/error-management/error-handler');

class TaskReportManager {
  constructor(options = {}) {
    this.options = {
      reportsDir: options.reportsDir || 'reports/tasks',
      maxReports: options.maxReports || 100,
      enablePersistence: options.enablePersistence !== false,
      enableCompression: options.enableCompression !== false,
      reportFormats: options.reportFormats || ['json', 'html', 'csv'],
      ...options
    };

    // Инициализация зависимостей
    this.logger = logger;
    this.errorHandler = new ErrorHandlingUtils({ logger: this.logger });

    this.reports = new Map();
    this.reportQueue = [];

    // Инициализация
    this._initialize();
  }

  /**
   * Инициализация TaskReportManager
   */
  async _initialize() {
    try {
      await this._ensureReportsDirectory();

      if (this.options.enablePersistence) {
        await this._loadExistingReports();
      }

      this.logger.info('[TaskReportManager] Инициализация завершена');
    } catch (error) {
      this.errorHandler.handleError(error, 'TaskReportManager initialization failed');
    }
  }

  /**
   * Создание директории для отчетов
   */
  async _ensureReportsDirectory() {
    try {
      await fs.access(this.options.reportsDir);
    } catch {
      await fs.mkdir(this.options.reportsDir, { recursive: true });
    }
  }

  /**
   * Загрузка существующих отчетов
   */
  async _loadExistingReports() {
    try {
      const files = await fs.readdir(this.options.reportsDir);
      const reportFiles = files.filter(file => file.endsWith('.json'));

      for (const file of reportFiles) {
        try {
          const filePath = path.join(this.options.reportsDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const report = JSON.parse(content);

          this.reports.set(report.id, report);
        } catch (error) {
          this.logger.warn(`[TaskReportManager] Не удалось загрузить отчет ${file}: ${error.message}`);
        }
      }

      this.logger.info(`[TaskReportManager] Загружено отчетов: ${this.reports.size}`);
    } catch (error) {
      this.errorHandler.handleError(error, 'Failed to load existing reports');
    }
  }

  /**
   * Создание нового отчета
   */
  async createReport(taskId, taskData, options = {}) {
    try {
      const reportId = this._generateReportId();
      const timestamp = new Date().toISOString();

      const report = {
        id: reportId,
        taskId,
        type: options.type || 'task_execution',
        status: taskData.status || 'completed',
        data: taskData,
        metadata: {
          created: timestamp,
          version: '1.0.0',
          format: options.format || 'json'
        },
        summary: this._generateReportSummary(taskData),
        ...options.customData
      };

      this.reports.set(reportId, report);

      // Сохранение отчета
      if (this.options.enablePersistence) {
        await this._saveReport(report);
      }

      this.logger.info(`[TaskReportManager] Создан отчет: ${reportId} для задачи ${taskId}`);

      return reportId;

    } catch (error) {
      this.errorHandler.handleError(error, `Failed to create report for task ${taskId}`);
      throw error;
    }
  }

  /**
   * Получение отчета по ID
   */
  getReport(reportId) {
    return this.reports.get(reportId);
  }

  /**
   * Получение всех отчетов
   */
  getAllReports(filter = {}) {
    let reports = Array.from(this.reports.values());

    // Применение фильтров
    if (filter.taskId) {
      reports = reports.filter(report => report.taskId === filter.taskId);
    }

    if (filter.type) {
      reports = reports.filter(report => report.type === filter.type);
    }

    if (filter.status) {
      reports = reports.filter(report => report.status === filter.status);
    }

    // Сортировка по умолчанию - по времени создания (новые сначала)
    reports.sort((a, b) => new Date(b.metadata.created) - new Date(a.metadata.created));

    return reports;
  }

  /**
   * Обновление отчета
   */
  async updateReport(reportId, updates) {
    try {
      const report = this.reports.get(reportId);
      if (!report) {
        throw new Error(`Report not found: ${reportId}`);
      }

      // Обновление данных
      Object.assign(report, updates);
      report.metadata.updated = new Date().toISOString();

      // Пересчет сводки если обновлены данные задачи
      if (updates.data) {
        report.summary = this._generateReportSummary(updates.data);
      }

      // Сохранение обновленного отчета
      if (this.options.enablePersistence) {
        await this._saveReport(report);
      }

      this.logger.info(`[TaskReportManager] Обновлен отчет: ${reportId}`);

      return report;

    } catch (error) {
      this.errorHandler.handleError(error, `Failed to update report ${reportId}`);
      throw error;
    }
  }

  /**
   * Удаление отчета
   */
  async deleteReport(reportId) {
    try {
      const report = this.reports.get(reportId);
      if (!report) {
        return false;
      }

      this.reports.delete(reportId);

      // Удаление файла отчета
      if (this.options.enablePersistence) {
        const filePath = path.join(this.options.reportsDir, `${reportId}.json`);
        try {
          await fs.unlink(filePath);
        } catch (error) {
          this.logger.warn(`[TaskReportManager] Не удалось удалить файл отчета ${filePath}: ${error.message}`);
        }
      }

      this.logger.info(`[TaskReportManager] Удален отчет: ${reportId}`);

      return true;

    } catch (error) {
      this.errorHandler.handleError(error, `Failed to delete report ${reportId}`);
      throw error;
    }
  }

  /**
   * Генерация сводки отчета
   */
  _generateReportSummary(taskData) {
    const summary = {
      status: taskData.status,
      duration: taskData.duration || 0,
      hasError: !!taskData.error,
      hasOutput: !!taskData.output,
      startTime: taskData.startTime,
      endTime: taskData.endTime
    };

    if (taskData.error) {
      summary.errorType = taskData.error.type || 'Unknown';
      summary.errorMessage = taskData.error.message;
    }

    if (taskData.output) {
      summary.outputLines = taskData.output.split('\n').length;
    }

    return summary;
  }

  /**
   * Сохранение отчета в файл
   */
  async _saveReport(report) {
    try {
      const fileName = `${report.id}.json`;
      const filePath = path.join(this.options.reportsDir, fileName);

      await fs.writeFile(filePath, JSON.stringify(report, null, 2), 'utf8');

      this.logger.debug(`[TaskReportManager] Сохранен отчет: ${filePath}`);
    } catch (error) {
      this.errorHandler.handleError(error, `Failed to save report ${report.id}`);
    }
  }

  /**
   * Экспорт отчета в различные форматы
   */
  async exportReport(reportId, format = 'json', outputPath = null) {
    try {
      const report = this.reports.get(reportId);
      if (!report) {
        throw new Error(`Report not found: ${reportId}`);
      }

      const outputDir = outputPath || this.options.reportsDir;
      const fileName = `${reportId}_export.${format}`;
      const filePath = path.join(outputDir, fileName);

      let content;

      switch (format.toLowerCase()) {
        case 'json':
          content = JSON.stringify(report, null, 2);
          break;

        case 'html':
          content = this._generateHTMLReport(report);
          break;

        case 'csv':
          content = this._generateCSVReport(report);
          break;

        case 'xml':
          content = this._generateXMLReport(report);
          break;

        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      await fs.writeFile(filePath, content, 'utf8');

      this.logger.info(`[TaskReportManager] Экспортирован отчет ${reportId} в ${format}: ${filePath}`);

      return {
        format,
        filePath,
        size: content.length
      };

    } catch (error) {
      this.errorHandler.handleError(error, `Failed to export report ${reportId}`);
      throw error;
    }
  }

  /**
   * Генерация HTML отчета
   */
  _generateHTMLReport(report) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Task Report: ${report.taskId}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .summary { background: #e9ecef; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .data { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .error { color: #dc3545; background: #f8d7da; padding: 10px; border-radius: 3px; margin: 10px 0; }
        pre { background: #f1f3f4; padding: 10px; border-radius: 3px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Task Report</h1>
        <p><strong>Report ID:</strong> ${report.id}</p>
        <p><strong>Task ID:</strong> ${report.taskId}</p>
        <p><strong>Type:</strong> ${report.type}</p>
        <p><strong>Created:</strong> ${report.metadata.created}</p>
    </div>

    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Status:</strong> ${report.status}</p>
        <p><strong>Duration:</strong> ${report.summary.duration}ms</p>
        <p><strong>Has Error:</strong> ${report.summary.hasError ? 'Yes' : 'No'}</p>
        <p><strong>Has Output:</strong> ${report.summary.hasOutput ? 'Yes' : 'No'}</p>
    </div>

    <div class="data">
        <h2>Task Data</h2>
        <pre>${JSON.stringify(report.data, null, 2)}</pre>
    </div>

    ${report.summary.hasError ? `
    <div class="error">
        <h3>Error</h3>
        <p><strong>Type:</strong> ${report.summary.errorType}</p>
        <p><strong>Message:</strong> ${report.summary.errorMessage}</p>
    </div>
    ` : ''}

    ${report.summary.hasOutput ? `
    <div class="data">
        <h2>Output</h2>
        <pre>${report.data.output || 'No output'}</pre>
    </div>
    ` : ''}
</body>
</html>
    `;
  }

  /**
   * Генерация CSV отчета
   */
  _generateCSVReport(report) {
    const headers = ['Field', 'Value'];
    const rows = [
      ['Report ID', report.id],
      ['Task ID', report.taskId],
      ['Type', report.type],
      ['Status', report.status],
      ['Created', report.metadata.created],
      ['Duration', report.summary.duration],
      ['Has Error', report.summary.hasError],
      ['Has Output', report.summary.hasOutput]
    ];

    if (report.summary.hasError) {
      rows.push(['Error Type', report.summary.errorType]);
      rows.push(['Error Message', report.summary.errorMessage]);
    }

    return [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }

  /**
   * Генерация XML отчета
   */
  _generateXMLReport(report) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<task-report>\n';
    xml += `  <id>${report.id}</id>\n`;
    xml += `  <taskId>${report.taskId}</taskId>\n`;
    xml += `  <type>${report.type}</type>\n`;
    xml += `  <status>${report.status}</status>\n`;
    xml += `  <created>${report.metadata.created}</created>\n`;
    xml += '  <summary>\n';
    xml += `    <duration>${report.summary.duration}</duration>\n`;
    xml += `    <hasError>${report.summary.hasError}</hasError>\n`;
    xml += `    <hasOutput>${report.summary.hasOutput}</hasOutput>\n`;
    xml += '  </summary>\n';
    xml += '</task-report>';

    return xml;
  }

  /**
   * Получение статистики отчетов
   */
  getStats() {
    const stats = {
      total: this.reports.size,
      byType: {},
      byStatus: {},
      byDate: {}
    };

    for (const report of this.reports.values()) {
      // По типу
      stats.byType[report.type] = (stats.byType[report.type] || 0) + 1;

      // По статусу
      stats.byStatus[report.status] = (stats.byStatus[report.status] || 0) + 1;

      // По дате
      const date = report.metadata.created.split('T')[0];
      stats.byDate[date] = (stats.byDate[date] || 0) + 1;
    }

    return stats;
  }

  /**
   * Очистка старых отчетов
   */
  async cleanupOldReports(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 дней по умолчанию
    try {
      const now = Date.now();
      let removed = 0;

      for (const [reportId, report] of this.reports) {
        const reportAge = now - new Date(report.metadata.created).getTime();

        if (reportAge > maxAge) {
          await this.deleteReport(reportId);
          removed++;
        }
      }

      if (removed > 0) {
        this.logger.info(`[TaskReportManager] Очищено старых отчетов: ${removed}`);
      }

      return removed;

    } catch (error) {
      this.errorHandler.handleError(error, 'Failed to cleanup old reports');
      throw error;
    }
  }

  /**
   * Генерация ID отчета
   */
  _generateReportId() {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Очистка ресурсов
   */
  async cleanup() {
    try {
      // Сохранение всех отчетов перед очисткой
      if (this.options.enablePersistence) {
        for (const report of this.reports.values()) {
          await this._saveReport(report);
        }
      }

      this.reports.clear();
      this.reportQueue = [];

      this.logger.info('[TaskReportManager] Очистка завершена');

    } catch (error) {
      this.errorHandler.handleError(error, 'TaskReportManager cleanup failed');
    }
  }
}

export { TaskReportManager };
