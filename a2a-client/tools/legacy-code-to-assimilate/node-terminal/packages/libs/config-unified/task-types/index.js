const fs = require('fs').promises;
const path = require('path');
const { readFileSync, existsSync } = require('fs');
const Ajv = require('ajv').default;
const addFormats = require('ajv-formats');
const ConfigManager = require('../../config-manager');

class TaskTypesConfigManager extends ConfigManager {
  constructor(configPath, schemaPath) {
    super(configPath, schemaPath);
    this.configName = 'task-types';
    this.defaultConfig = this.getDefaultConfig();
  }

  // Методы getConfig, loadConfig, saveConfig, addWatcher, notifyWatchers, clearCache, getInfo
  // теперь наследуются от ConfigManager. Переопределите, если нужна специфическая логика.

  getDefaultConfig() {
    return {
      taskTypes: {},
      qualityThresholds: {},
      generationSettings: {},
      fileNaming: {},
      metadata: {
        created: new Date().toISOString(),
        version: '1.0.0',
        description: 'Конфигурация типов задач'
      }
    };
  }

  async getTaskTypes() {
    const config = await this.getConfig();
    return config.taskTypes;
  }

  async getQualityThresholds() {
    const config = await this.getConfig();
    return config.qualityThresholds;
  }

  async getGenerationSettings() {
    const config = await this.getConfig();
    return config.generationSettings;
  }

  async getFileNaming() {
    const config = await this.getConfig();
    return config.fileNaming;
  }

  async getTaskType(type) {
    const config = await this.getConfig();
    return config.taskTypes[type];
  }

  async getQualityThreshold(check) {
    const config = await this.getConfig();
    return config.qualityThresholds[check];
  }
}

const configPath = path.join(__dirname, 'config.json');
const schemaPath = path.join(__dirname, 'schema.json');
const taskTypesConfigManager = new TaskTypesConfigManager(configPath, schemaPath);

module.exports = taskTypesConfigManager;
