/**
 * Service Management Integration Layer
 * Предоставляет богатый API для интеграции с UI, формами и внешними системами
 */

const path = require('path');
const { ServiceManagementUtils } = require('./index');
const { ServiceConfigManager } = require('./src/ServiceConfigManager');
const { ServiceDataManager } = require('./src/ServiceDataManager');
const { ServiceFormGenerator } = require('./src/ServiceFormGenerator');
const { ServiceValidator } = require('./src/ServiceValidator');
const { ServiceActionManager } = require('./src/ServiceActionManager');
const { EventEmitter } = require('events'); // Используем встроенный EventEmitter

class ServiceManagementIntegration {
    constructor(options = {}) {
        this.serviceManager = new ServiceManagementUtils(options);
        this.configPath = options.configPath || path.join(__dirname, 'config', 'services.json');
        this.uiFramework = options.uiFramework || 'html'; // html, react, vue, angular
        this.theme = options.theme || 'default'; // default, dark, light, custom
        this.language = options.language || 'ru'; // ru, en, etc.
        
        this.cache = new Map();
        this.cacheTimeout = options.cacheTimeout || 30000; // 30 секунд
        
    this.eventEmitter = new EventEmitter(); // Инициализируем EventEmitter

    this.serviceConfigManager = new ServiceConfigManager(this.configPath, console, this.eventEmitter);
    this.serviceDataManager = new ServiceDataManager(this.serviceManager, this.serviceConfigManager, this.cache, this.cacheTimeout, console);
    this.serviceFormGenerator = new ServiceFormGenerator(this.serviceConfigManager, console);
    this.serviceValidator = new ServiceValidator(this.serviceConfigManager, console);
    this.serviceActionManager = new ServiceActionManager(this.serviceManager, this.serviceConfigManager, this.serviceValidator, this.cache, this.eventEmitter, console);

        this.initializeSync();
    }

    initializeSync() {
        try {
      this.serviceConfigManager.loadConfigurationSync();
      this.serviceFormGenerator.loadFormsAndTemplates();
            console.log('[ServiceManagementIntegration] Initialized successfully');
        } catch (error) {
            console.error('[ServiceManagementIntegration] Initialization failed:', error.message);
        }
    }

    async initialize() {
        try {
      await this.serviceConfigManager.loadConfiguration();
      await this.serviceFormGenerator.loadFormsAndTemplates();
            console.log('[ServiceManagementIntegration] Initialized successfully');
        } catch (error) {
            console.error('[ServiceManagementIntegration] Initialization failed:', error.message);
            throw error;
        }
    }

  async loadConfiguration() { return this.serviceConfigManager.loadConfiguration(); }
  async reloadConfiguration() { return this.serviceConfigManager.reloadConfiguration(); }
  async getServicesData(format) { return this.serviceDataManager.getServicesData(format); }
  async getServiceData(serviceId, includeStatus) { return this.serviceDataManager.getServiceData(serviceId, includeStatus); }
  async getServicesStats() { return this.serviceDataManager.getServicesStats(); }
  getServiceForm(mode, serviceId) { return this.serviceFormGenerator.getServiceForm(mode, serviceId); }
  generateServiceForm(mode, serviceId) { return this.serviceFormGenerator.generateServiceForm(mode, serviceId); }
  getStartCommandTemplate() { return this.serviceFormGenerator.getStartCommandTemplate(); }
  getGroupForm(mode, groupId) { return this.serviceFormGenerator.getGroupForm(mode, groupId); }
  validateServiceData(data) { return this.serviceValidator.validateServiceData(data); }
  validateGroupData(data) { return this.serviceValidator.validateGroupData(data); }
  async createService(serviceData) { return this.serviceActionManager.createService(serviceData); }
  async updateService(serviceId, updateData) { return this.serviceActionManager.updateService(serviceId, updateData); }
  async deleteService(serviceId) { return this.serviceActionManager.deleteService(serviceId); }

    clearCache() {
        this.cache.clear();
    }

    getDefaultStartCommand() {
    return this.serviceFormGenerator.getDefaultStartCommand();
  }

    on(event, callback) {
    this.eventEmitter.on(event, callback);
    }

    off(event, callback) {
    this.eventEmitter.off(event, callback);
  }

    emit(event, data) {
    this.eventEmitter.emit(event, data);
    }
}

module.exports = { ServiceManagementIntegration };
