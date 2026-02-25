/**
 * Валидация конфигурации сервисов и управление fallback сервисами.
 */

const { FileSystemUtils } = require('../../../core/file-utils');
const { LoggingUtils } = require('../../../logging-monitoring/logging');

export class ServiceConfigurationValidator {
  constructor(errorReporting, logger, serviceManagementUtils) {
    this.errorReporting = errorReporting;
    this.logger = logger || new LoggingUtils();
    this.serviceManagementUtils = serviceManagementUtils;
  }

  _generateParametersHash(parameters) {
    return this.errorReporting._generateMd5Hash(parameters);
  }

  async _checkExistingError(md5Hash) {
    return await this.errorReporting.checkExistingReport(md5Hash);
  }

  async _createErrorReport(reportData) {
    return await this.errorReporting.createErrorReport(reportData);
  }

  /**
   * Проверка конфигурации сервисов
   */
  async validateServiceConfig() {
    try {
      const configPath = 'config/apps-list.json';
      const config = JSON.parse(await FileSystemUtils.readFile(configPath, 'utf8'));
      
      const errors = [];
      
      for (const app of config.apps) {
        if (app.enabled && !app.command) {
          errors.push({
            appId: app.id,
            issue: 'Включенное приложение без команды'
          });
        }
      }
      
      if (errors.length > 0) {
        await this._createErrorReport({
          code: 'CONFIG_VALIDATION_FAILED',
          title: 'Ошибки валидации конфигурации',
          description: `Найдено ${errors.length} ошибок в конфигурации`,
          parameters: { errors },
          priority: 'high',
          scriptName: 'validateServiceConfig'
        });
      }
      
      return errors.length === 0;
    } catch (error) {
      await this._createErrorReport({
        code: 'CONFIG_READ_FAILED',
        title: 'Ошибка чтения конфигурации',
        description: error.message,
        parameters: { configPath: 'config/apps-list.json' },
        priority: 'critical',
        scriptName: 'validateServiceConfig'
      });
      return false;
    }
  }

  /**
   * Запуск fallback сервиса из конфигурации
   */
  async startFallbackService(serviceId = 'projects-manager-ui') {
    try {
      const configPath = 'config/apps-list.json';
      const config = JSON.parse(await FileSystemUtils.readFile(configPath, 'utf8'));
      
      const service = config.apps.find(app => app.id === serviceId);
      if (!service) {
        throw new Error(`Сервис ${serviceId} не найден в конфигурации`);
      }
      
      if (!service.command) {
        throw new Error(`Сервис ${serviceId} не имеет команды запуска`);
      }
      
      this.logger.info(`🔄 Запускаю fallback сервис: ${serviceId}`);
      this.logger.info(`📦 Команда: ${service.command}`);
      
      // Запускаем сервис
      const { spawn } = require('child_process');
      const child = spawn(service.command, [], {
        cwd: service.path,
        stdio: 'inherit',
        shell: true
      });
      
      return child;
    } catch (error) {
      await this._createErrorReport({
        code: 'FALLBACK_SERVICE_FAILED',
        title: 'Ошибка запуска fallback сервиса',
        description: error.message,
        parameters: { serviceId },
        priority: 'critical',
        scriptName: 'startFallbackService'
      });
      
      throw error;
    }
  }
}
