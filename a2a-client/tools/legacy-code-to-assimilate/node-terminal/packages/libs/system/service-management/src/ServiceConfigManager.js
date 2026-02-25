const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

class ServiceConfigManager {
  constructor(configPath, logger, eventEmitter) {
    this.configPath = configPath;
    this.logger = logger;
    this.eventEmitter = eventEmitter;
    this.config = {}; // Внутреннее хранилище конфигурации
  }

  loadConfigurationSync() {
    try {
      const configData = fsSync.readFileSync(this.configPath, 'utf8');
      this.config = JSON.parse(configData);
    } catch (error) {
      this.logger.warn(`Failed to load configuration synchronously: ${error.message}`);
      this.config = { services: {}, groups: {} };
    }
  }

  async loadConfiguration() {
    try {
      const configData = await fs.readFile(this.configPath, 'utf8');
      this.config = JSON.parse(configData);
    } catch (error) {
      throw new Error(`Failed to load configuration: ${error.message}`);
    }
  }

  async saveConfiguration() {
    try {
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
      return true;
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error.message}`);
    }
  }

  async reloadConfiguration() {
    await this.loadConfiguration();
    this.eventEmitter.emit('config:reloaded', this.config);
  }

  // Геттеры для конфигурации
  get rawConfig() {
    return this.config || {};
  }

  get services() {
    return (this.config && this.config.services) || {};
  }

  get groups() {
    return (this.config && this.config.groups) || {};
  }

  get settings() {
    return (this.config && this.config.settings) || {};
  }

  get gateway() {
    return (this.config && this.config.gateway) || {};
  }
}

module.exports = { ServiceConfigManager };
