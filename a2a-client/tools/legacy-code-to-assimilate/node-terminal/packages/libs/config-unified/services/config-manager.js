const fs = require('fs').promises;
const path = require('path');
const { readFileSync, existsSync } = require('fs');
const Ajv = require('ajv').default;
const addFormats = require('ajv-formats');
const { ConfigManager } = require('../../config-manager/index.cjs');

class ServicesConfigManager extends ConfigManager {
  constructor(configPath, schemaPath) {
    super(configPath, schemaPath);
    this.configName = 'services';
    this.defaultConfig = this.getDefaultConfig();
  }

  // Методы getConfig, loadConfig, saveConfig, addWatcher, notifyWatchers, clearCache, getInfo
  // теперь наследуются от ConfigManager. Переопределите, если нужна специфическая логика.

  getDefaultConfig() {
    return {
      global: {},
      services: {},
      metadata: {
        created: new Date().toISOString(),
        version: '1.0.0',
        description: 'Конфигурация сервисов'
      }
    };
  }

  async getGlobalConfig() {
    const config = await this.getConfig();
    return config.global;
  }

  async getService(serviceId) {
    const config = await this.getConfig();
    return config.services[serviceId];
  }

  async getAllServices() {
    const config = await this.getConfig();
    return config.services;
  }

  async addService(serviceId, serviceConfig) {
    const config = await this.getConfig();
    if (config.services[serviceId]) {
      throw new Error(`Сервис с ID ${serviceId} уже существует`);
    }
    config.services[serviceId] = serviceConfig;
    await this.saveConfig(config);
  }

  async updateService(serviceId, updates) {
    const config = await this.getConfig();
    if (!config.services[serviceId]) {
      throw new Error(`Сервис с ID ${serviceId} не найден`);
    }
    config.services[serviceId] = { ...config.services[serviceId], ...updates };
    await this.saveConfig(config);
  }

  async deleteService(serviceId) {
    const config = await this.getConfig();
    if (!config.services[serviceId]) {
      throw new Error(`Сервис с ID ${serviceId} не найден`);
    }
    delete config.services[serviceId];
    await this.saveConfig(config);
  }
}

const configPath = path.join(__dirname, 'config.json');
const schemaPath = path.join(__dirname, 'schema.json');
const servicesConfigManager = new ServicesConfigManager(configPath, schemaPath);

module.exports = servicesConfigManager;
