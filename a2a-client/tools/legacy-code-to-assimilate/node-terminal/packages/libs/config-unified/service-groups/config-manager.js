const fs = require('fs').promises;
const path = require('path');
const { readFileSync, existsSync } = require('fs');
const Ajv = require('ajv').default;
const addFormats = require('ajv-formats');
const { ConfigManager } = require('../../config-manager/index.cjs');

class ServiceGroupsManager extends ConfigManager {
  constructor(configPath, schemaPath) {
    super(configPath, schemaPath);
    this.configName = 'service-groups';
    this.defaultConfig = this.getDefaultConfig();
  }

  // Методы getConfig, loadConfig, saveConfig, addWatcher, notifyWatchers, clearCache, getInfo
  // теперь наследуются от ConfigManager. Переопределите, если нужна специфическая логика.

  getDefaultConfig() {
    return {
      groups: [],
      metadata: {
        created: new Date().toISOString(),
        version: '1.0.0',
        description: 'Конфигурация групп сервисов'
      }
    };
  }

  async getAllGroups() {
    const config = await this.getConfig();
    return config.groups;
  }

  async getGroupById(id) {
    const config = await this.getConfig();
    return config.groups.find(group => group.id === id);
  }

  async getServicesInGroup(id) {
    const group = await this.getGroupById(id);
    return group ? group.services : [];
  }

  async isGroupEnabled(id) {
    const group = await this.getGroupById(id);
    return group ? group.enabled : false;
  }

  async doesGroupAutoStart(id) {
    const group = await this.getGroupById(id);
    return group ? group.autoStart : false;
  }
}

const configPath = path.join(__dirname, 'config.json');
const schemaPath = path.join(__dirname, 'schema.json');
const serviceGroupsManager = new ServiceGroupsManager(configPath, schemaPath);

module.exports = serviceGroupsManager;
