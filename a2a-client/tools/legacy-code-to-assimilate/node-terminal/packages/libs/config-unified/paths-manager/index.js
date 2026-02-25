const fs = require('fs').promises;
const path = require('path');
const { readFileSync } = require('fs');

const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const configPath = path.join(__dirname, 'config.json');
const schemaPath = path.join(__dirname, 'schema.json');

class PathsConfigManager {
  constructor() {
    this.configPath = configPath;
    this.schemaPath = schemaPath;
    this.cache = null;
    this.lastModified = null;
    this.watchers = new Set();

    this.ajv = new Ajv();
    addFormats(this.ajv);
    try {
      const schema = JSON.parse(readFileSync(this.schemaPath, 'utf8'));
      this.validate = this.ajv.compile(schema);
    } catch (error) {
      console.error(`Failed to load or compile schema for paths config: ${error.message}`);
    }
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
      console.error('Ошибка получения конфигурации путей:', error);
      return this.getDefaultConfig();
    }
  }

  async loadConfig() {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      const configData = JSON.parse(content);
      if (this.validate && !this.validate(configData)) {
        const errorMessage = `Paths Configuration failed validation: ${this.ajv.errorsText(this.validate.errors)}`;
        console.error(errorMessage);
        // throw new Error(errorMessage);
      }
      return configData;
    } catch (error) {
      console.warn('Не удалось загрузить конфигурацию путей, используется по умолчанию');
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
      console.error('Ошибка сохранения конфигурации путей:', error);
      throw error;
    }
  }

  getDefaultConfig() {
    return {
      basePath: '/app',
      logBaseDir: '/app/logs',
      reportsBaseDir: '/app/reports',
      systemRun: {},
      testCoverageAnalysis: {},
      testCategories: [],
      metadata: {
        created: new Date().toISOString(),
        version: '1.0.0',
        description: 'Конфигурация путей'
      }
    };
  }

  async getBasePath() {
    const config = await this.getConfig();
    return config.basePath;
  }

  async getLogBaseDir() {
    const config = await this.getConfig();
    return config.logBaseDir;
  }

  async getReportsBaseDir() {
    const config = await this.getConfig();
    return config.reportsBaseDir;
  }

  async getSystemRunPaths() {
    const config = await this.getConfig();
    return config.systemRun;
  }

  async getSystemRunPath(key) {
    const config = await this.getConfig();
    return config.systemRun[key];
  }

  async getTestCoverageAnalysisConfig() {
    const config = await this.getConfig();
    return config.testCoverageAnalysis;
  }

  async getTestCategories() {
    const config = await this.getConfig();
    return config.testCategories;
  }

  async getTestCategory(name) {
    const config = await this.getConfig();
    return config.testCategories.find(cat => cat.name === name);
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
        console.error('Ошибка в наблюдателе конфигурации путей:', error);
      }
    });
  }

  clearCache() {
    this.cache = null;
    this.lastModified = null;
  }

  getInfo() {
    return {
      name: 'paths-manager',
      path: this.configPath,
      hasCache: !!this.cache,
      watchersCount: this.watchers.size,
      lastModified: this.lastModified
    };
  }
}

const pathsConfigManager = new PathsConfigManager();

module.exports = pathsConfigManager;
