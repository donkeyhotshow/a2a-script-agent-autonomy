/**
 * Error Report Manager
 * Менеджер отчетов об ошибках
 */

const { LoggingUtils } = require('../../../logging-monitoring/logging/index.mjs'); // Добавлен импорт LoggingUtils
const { ErrorCoreManager } = require('@libs/core/error-core/index.js'); // Обновлен импорт на ErrorCoreManager

const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

class ErrorReportManager {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || process.cwd();
    this.reportsDir = options.reportsDir || path.join(this.projectRoot, 'error-reports');
    this.maxReports = options.maxReports || 100;
    this.archiveOldReports = options.archiveOldReports !== false;
    this.logger = options.logger || new LoggingUtils(); // Инициализация логгера
    this.errorHandler = options.errorHandler || new ErrorCoreManager({ logger: this.logger, reportsDir: path.join(this.projectRoot, 'reports', 'errors') }); // Инициализация обработчика ошибок
    this.errorHandler.initialize(); // Инициализация ErrorCoreManager
  }

  _generateMd5Hash(data) {
    if (typeof data === 'object') {
      return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
    }
    return crypto.createHash('md5').update(String(data)).digest('hex');
  }

  _getReportPathByHash(md5Hash) {
    return path.join(this.reportsDir, `${md5Hash}.json`);
  }

  async checkExistingReport(md5Hash) {
    const reportPath = this._getReportPathByHash(md5Hash);
    try {
      await fs.access(reportPath);
      return { exists: true, file: reportPath };
    } catch (e) {
      return { exists: false, file: reportPath };
    }
  }

  /**
   * Создание отчета об ошибке
   */
  async createErrorReport(errorData, context = {}) {
    try {
      // Создаем директорию если не существует
      await fs.mkdir(this.reportsDir, { recursive: true });

      const reportId = `error-${new Date().toISOString().replace(/[:.]/g, '-')}-${Math.random().toString(36).substr(2, 9)}`;
      const md5Hash = this._generateMd5Hash(errorData); // Генерируем хеш для данных ошибки

      // Проверяем, существует ли уже отчет с таким хешем
      const existingReport = await this.checkExistingReport(md5Hash);
      if (existingReport.exists) {
        this.logger.warn(`[ErrorReportManager] Отчет об ошибке с хешем ${md5Hash} уже существует. Обновляем существующий.`);
        const existingContent = await fs.readFile(existingReport.file, 'utf8');
        const report = JSON.parse(existingContent);
        // Можно обновить timestamp или другую информацию здесь
        report.timestamp = new Date().toISOString();
        await fs.writeFile(existingReport.file, JSON.stringify(report, null, 2), 'utf8');
        return { success: true, reportId: report.id, filePath: existingReport.file, updated: true };
      }

      const report = {
        id: reportId,
        md5Hash: md5Hash, // Добавляем хеш в отчет
        timestamp: new Date().toISOString(),
        error: {
          message: errorData.message || 'Unknown error',
          stack: errorData.stack || '',
          name: errorData.name || 'Error'
        },
        code: errorData.code || 'UNKNOWN_ERROR',
        title: errorData.title || 'Произошла ошибка',
        description: errorData.description || 'Детальное описание ошибки отсутствует.',
        parameters: errorData.parameters || {},
        priority: errorData.priority || 'medium',
        scriptName: errorData.scriptName || process.env.SCRIPT_NAME || 'unknown',
        context,
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          cwd: process.cwd()
        }
      };

      const fileName = `${md5Hash}.json`; // Используем хеш как имя файла
      const filePath = path.join(this.reportsDir, fileName);

      await fs.writeFile(filePath, JSON.stringify(report, null, 2), 'utf8');

      this.logger.error(`[ErrorReportManager] Создан отчет об ошибке: ${report.code} - ${report.title} (${report.id})`);
      return { success: true, reportId, filePath };
    } catch (writeError) {
      // Используем новый API ErrorCoreManager
      await this.errorHandler.collectError({
        appId: 'app-framework', // Или другой соответствующий appId
        error: writeError,
        context: { operation: 'createErrorReport' },
        source: 'ErrorReportManager',
        severity: 'high'
      });
      return { success: false, error: writeError.message };
    }
  }

  /**
   * Получение списка отчетов
   */
  async getReportsList() {
    try {
      const files = await fs.readdir(this.reportsDir);
      const reportFiles = files.filter(file => file.endsWith('.json'));

      const reports = [];
      for (const file of reportFiles) {
        try {
          const filePath = path.join(this.reportsDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const report = JSON.parse(content);
          reports.push({
            id: report.id,
            md5Hash: report.md5Hash, // Добавляем хеш в список
            file: file,
            timestamp: report.timestamp,
            errorMessage: report.error.message
          });
        } catch (error) {
          // Пропускаем поврежденные файлы
          this.logger.warn(`[ErrorReportManager] Пропущен поврежденный файл отчета: ${file} - ${error.message}`);
          continue;
        }
      }

      // Сортируем по времени создания (новые первыми)
      reports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return { success: true, reports };
    } catch (error) {
      // Используем новый API ErrorCoreManager
      await this.errorHandler.collectError({
        appId: 'app-framework',
        error: error,
        context: { operation: 'getReportsList' },
        source: 'ErrorReportManager',
        severity: 'medium'
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Получение отчета по ID или MD5 хешу
   */
  async getReport(identifier) {
    try {
      const files = await fs.readdir(this.reportsDir);
      const reportFile = files.find(file => file.includes(identifier));

      if (!reportFile) {
        return { success: false, error: 'Report not found' };
      }

      const filePath = path.join(this.reportsDir, reportFile);
      const content = await fs.readFile(filePath, 'utf8');
      const report = JSON.parse(content);

      return { success: true, report };
    } catch (error) {
      // Используем новый API ErrorCoreManager
      await this.errorHandler.collectError({
        appId: 'app-framework',
        error: error,
        context: { operation: 'getReport', identifier },
        source: 'ErrorReportManager',
        severity: 'medium'
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Удаление отчета
   */
  async deleteReport(identifier) {
    try {
      const files = await fs.readdir(this.reportsDir);
      const reportFile = files.find(file => file.includes(identifier));

      if (!reportFile) {
        return { success: false, error: 'Report not found' };
      }

      const filePath = path.join(this.reportsDir, reportFile);
      await fs.unlink(filePath);

      this.logger.info(`[ErrorReportManager] Удален отчет: ${identifier}`);
      return { success: true };
    } catch (error) {
      // Используем новый API ErrorCoreManager
      await this.errorHandler.collectError({
        appId: 'app-framework',
        error: error,
        context: { operation: 'deleteReport', identifier },
        source: 'ErrorReportManager',
        severity: 'medium'
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Очистка старых отчетов
   */
  async cleanupOldReports() {
    try {
      const result = await this.getReportsList();
      if (!result.success) {
        return result;
      }

      const reports = result.reports;
      if (reports.length <= this.maxReports) {
        return { success: true, message: 'No cleanup needed' };
      }

      // Удаляем старые отчеты
      const reportsToDelete = reports.slice(this.maxReports);
      for (const report of reportsToDelete) {
        await this.deleteReport(report.md5Hash); // Используем md5Hash для удаления
      }

      this.logger.info(`[ErrorReportManager] Очищено старых отчетов: ${reportsToDelete.length}`);
      return { success: true, deleted: reportsToDelete.length };
    } catch (error) {
      // Используем новый API ErrorCoreManager
      await this.errorHandler.collectError({
        appId: 'app-framework',
        error: error,
        context: { operation: 'cleanupOldReports' },
        source: 'ErrorReportManager',
        severity: 'medium'
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Генерация ID отчета
   */
  _generateReportId() { // Этот метод больше не нужен, так как мы используем md5Hash для идентификации
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = ErrorReportManager;
