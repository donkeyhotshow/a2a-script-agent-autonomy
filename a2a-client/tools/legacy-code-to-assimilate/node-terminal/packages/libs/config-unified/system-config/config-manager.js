const fs = require('fs').promises;
const path = require('path');
const { readFileSync, existsSync } = require('fs');
const { ConfigManagerWrapper } = require('../../config-manager/index.cjs');

class SystemConfigManager extends ConfigManagerWrapper {
  constructor(configPath, schemaPath) {
    super(configPath, schemaPath);
    this.configName = 'system-config';
    this.defaultConfig = this.getDefaultConfig();
  }

  // Методы getConfig, loadConfig, saveConfig, addWatcher, notifyWatchers, clearCache, getInfo
  // теперь наследуются от ConfigManager. Переопределите, если нужна специфическая логика.

  getDefaultConfig() {
    return {
      serviceManager: {
        retryDelaysMs: [1000, 3000, 5000],
        restartBackoffMs: [5000, 10000, 30000],
        commandMaxRetries: 3,
        commandRetryDelayMs: 1000
      },
      metadata: {
        created: new Date().toISOString(),
        version: '1.0.0',
        description: 'Системная конфигурация'
      }
    };
  }

  async getServiceManagerConfig() {
    const config = await this.getConfig();
    return config.serviceManager || {};
  }

  async getRetryDelays() {
    const config = await this.getServiceManagerConfig();
    return config.retryDelaysMs || [];
  }

  async getRestartBackoff() {
    const config = await this.getServiceManagerConfig();
    return config.restartBackoffMs || [];
  }

  async getCommandMaxRetries() {
    const config = await this.getConfig();
    return config.serviceManager.commandMaxRetries;
  }

  async getCommandRetryDelayMs() {
    const config = await this.getConfig();
    return config.serviceManager.commandRetryDelayMs;
  }
}

const configPath = path.join(__dirname, 'config.json');
const schemaPath = path.join(__dirname, 'schema.json');
const systemConfigManager = new SystemConfigManager(configPath, schemaPath);

module.exports = systemConfigManager;
