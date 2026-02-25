const fs = require('fs').promises;
const path = require('path');
const { readFileSync } = require('fs');

const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const configPath = path.join(__dirname, 'config.json');
const schemaPath = path.join(__dirname, 'schema.json');

class AppsListConfigManager {
  constructor() {
    this.configPath = configPath;
    this.schemaPath = path.join(__dirname, 'schema.json');
    this.cache = null;
    this.lastModified = null;
    this.watchers = new Set();
    this.ajv = new Ajv();
    addFormats(this.ajv);
    const appsListSchema = JSON.parse(readFileSync(this.schemaPath, 'utf8'));
    this.validate = this.ajv.compile(appsListSchema);
  }

  async getConfig(forceReload = false) {
    try {
      if (!forceReload && this.cache) {
        const stats = await fs.stat(this.configPath);
        if (stats.mtime.getTime() === this.lastModified) {
          return this.cache;
        }
      }

      const config = await this.loadConfig();
      this.cache = config;
      this.lastModified = (await fs.stat(this.configPath)).mtime.getTime();

      return config;
    } catch (error) {
      console.error('Ошибка получения конфигурации списка приложений:', error);
      return this.getDefaultConfig();
    }
  }

  async loadConfig() {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      const configData = JSON.parse(content);
      if (this.validate && !this.validate(configData)) {
        const errorMessage = `Apps List Configuration failed validation: ${this.ajv.errorsText(this.validate.errors)}`;
        console.error(errorMessage);
        // throw new Error(errorMessage);
      }
      return configData;
    } catch (error) {
      console.warn('Не удалось загрузить конфигурацию списка приложений, используется по умолчанию');
      return this.getDefaultConfig();
    }
  }

  async saveConfig(config) {
    try {
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
      this.cache = config;
      this.lastModified = (await fs.stat(this.configPath)).mtime.getTime();
      this.notifyWatchers(config);
    } catch (error) {
      console.error('Ошибка сохранения конфигурации списка приложений:', error);
      throw error;
    }
  }

  getDefaultConfig() {
    return {
      apps: [],
      metadata: {
        created: new Date().toISOString(),
        version: '1.0.0',
        description: 'Конфигурация списка приложений'
      }
    };
  }

  async getAllApps() {
    const config = await this.getConfig();
    return config.apps;
  }

  async getAppById(appId) {
    const config = await this.getConfig();
    return config.apps.find(app => app.appId === appId);
  }

  async getAppByTitle(title) {
    const config = await this.getConfig();
    return config.apps.find(app => app.title === title);
  }

  addWatcher(callback) {
    this.watchers.add(callback);
    return () => this.watchers.delete(callback);
  }

  notifyWatchers(config) {
    this.watchers.forEach(callback => {
      try {
        callback(config);
      } catch (error) {
        console.error('Ошибка в наблюдателе конфигурации списка приложений:', error);
      }
    });
  }

  clearCache() {
    this.cache = null;
    this.lastModified = null;
  }

  getInfo() {
    return {
      name: 'apps-list',
      path: this.configPath,
      hasCache: !!this.cache,
      watchersCount: this.watchers.size,
      lastModified: this.lastModified
    };
  }
}

const appsListConfigManager = new AppsListConfigManager();

module.exports = appsListConfigManager;
