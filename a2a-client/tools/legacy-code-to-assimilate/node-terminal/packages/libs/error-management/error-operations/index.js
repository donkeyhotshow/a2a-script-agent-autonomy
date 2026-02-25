const { FileSystemUtils } = require('@libs/system/file-operations');
const { LoggingUtils } = require('@libs/logging-monitoring/logging');
const ErrorReportManager = require('@libs/app-framework/error-handling/error-report-manager/index.cjs'); // Обновлен импорт
const { ConfigurationUtils } = require('@libs/core/configuration');
const { ServiceManager: ServiceManagementUtils } = require('@libs/system/service-management');
// const { TestingUtils } = require('../testing'); // Если TestingUtils еще не перенесен

const { ErrorHandlingStrategies } = require('./src/ErrorHandlingStrategies.js');
const { ErrorCategorizationManager } = require('./src/ErrorCategorizationManager.js');
const { ServiceConfigurationValidator } = require('./src/ServiceConfigurationValidator.js');

class ErrorOperationsUtils {
  constructor(options = {}) {
    this.logger = options.logger || new LoggingUtils();
    this.errorReporting = options.errorReporting || new ErrorReportManager({ logger: this.logger }); // Обновлена инициализация
    this.configurationUtils = options.configurationUtils || new ConfigurationUtils({ logger: this.logger });
    this.serviceManagementUtils = options.serviceManagementUtils || new ServiceManagementUtils({ logger: this.logger });
    // this.testingUtils = options.testingUtils || new TestingUtils({ logger: this.logger });

    this.errorHandlingStrategies = new ErrorHandlingStrategies(this.errorReporting, this.logger);
    this.errorCategorizationManager = new ErrorCategorizationManager(this.errorReporting, this.logger);
    this.serviceConfigurationValidator = new ServiceConfigurationValidator(this.errorReporting, this.logger, this.serviceManagementUtils);
  }

  _generateParametersHash(parameters) {
    return this.errorReporting._generateMd5Hash(parameters);
  }

  async _checkExistingError(md5Hash) {
    return await this.errorReporting.checkExistingReport(md5Hash);
  }

  async _createErrorReport(reportData) {
    // В createErrorReport передаем данные, которые соответствуют новому формату
    // В errorData ожидается объект { message, stack, name, code, title, description, parameters, priority, scriptName }
    return await this.errorReporting.createErrorReport(reportData);
  }

  /**
   * Ошибки с retry и предотвращением циклов
   */
  async retryOperation(operation, fallback, parameters = {}, maxAttempts = 3) {
    return this.errorHandlingStrategies.retryOperation(operation, fallback, parameters, maxAttempts);
  }

  /**
   * Ошибки с отключением функциональности
   */
  async featureOperation(operation, reducedOperation, parameters = {}) {
    return this.errorHandlingStrategies.featureOperation(operation, reducedOperation, parameters);
  }

  /**
   * Batch обработка с группировкой ошибок
   */
  async batchOperation(processItem, items) {
    return this.errorHandlingStrategies.batchOperation(processItem, items);
  }

  /**
   * Проверка конфигурации сервисов
   */
  async validateServiceConfig() {
    return this.serviceConfigurationValidator.validateServiceConfig();
  }

  /**
   * Запуск fallback сервиса из конфигурации
   */
  async startFallbackService(serviceId = 'projects-manager-ui') {
    return this.serviceConfigurationValidator.startFallbackService(serviceId);
  }

  /**
   * Обработка ошибок процессов (child_process)
   */
  async processOperation(operation, parameters = {}) {
    return this.errorCategorizationManager.processOperation(operation, parameters);
  }

  /**
   * Обработка ошибок файловой системы
   */
  async fileSystemOperation(operation, parameters = {}) {
    return this.errorCategorizationManager.fileSystemOperation(operation, parameters);
  }

  /**
   * Обработка ошибок сети и HTTP
   */
  async networkOperation(operation, parameters = {}) {
    return this.errorCategorizationManager.networkOperation(operation, parameters);
  }

  /**
   * Обработка ошибок таймаутов
   */
  async timeoutOperation(operation, timeoutMs = 30000, parameters = {}) {
    return this.errorCategorizationManager.timeoutOperation(operation, timeoutMs, parameters);
  }

  /**
   * Обработка ошибок памяти
   */
  async memoryOperation(operation, parameters = {}) {
    return this.errorCategorizationManager.memoryOperation(operation, parameters);
  }

  /**
   * Обработка ошибок портов
   */
  async portOperation(operation, parameters = {}) {
    return this.errorCategorizationManager.portOperation(operation, parameters);
  }

  /**
   * Обработка ошибок конфигурации
   */
  async configOperation(operation, parameters = {}) {
    return this.errorCategorizationManager.configOperation(operation, parameters);
  }

  /**
   * Обработка ошибок базы данных
   */
  async databaseOperation(operation, parameters = {}) {
    return this.errorCategorizationManager.databaseOperation(operation, parameters);
  }

  /**
   * Обработка ошибок аутентификации
   */
  async authOperation(operation, parameters = {}) {
    return this.errorCategorizationManager.authOperation(operation, parameters);
  }
}

module.exports = { ErrorOperationsUtils, errorOperationsUtils: new ErrorOperationsUtils() };
