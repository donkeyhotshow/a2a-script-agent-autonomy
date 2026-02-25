const fs = require('fs').promises;
const path = require('path');
const { readFileSync } = require('fs');

const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const configPath = path.join(__dirname, 'config.json');
const schemaPath = path.join(__dirname, 'schema.json');
const testSuitesDirPath = path.join(__dirname, 'data', 'test-suites');

class TestingConfigManager {
  constructor() {
    this.configPath = configPath;
    this.schemaPath = schemaPath;
    this.cache = null;
    this.lastModified = null;
    this.watchers = new Set();
    this.testSuites = new Map();

    this.ajv = new Ajv();
    addFormats(this.ajv);
    try {
      const schema = JSON.parse(readFileSync(this.schemaPath, 'utf8'));
      this.validate = this.ajv.compile(schema);
    } catch (error) {
      console.error(`Failed to load or compile schema for testing-manager config: ${error.message}`);
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
      console.error('Ошибка получения конфигурации тестирования:', error);
      return this.getDefaultConfig();
    }
  }

  async loadConfig() {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      const configData = JSON.parse(content);
      if (this.validate && !this.validate(configData)) {
        const errorMessage = `Testing Task Manager Configuration failed validation: ${this.ajv.errorsText(this.validate.errors)}`;
        console.error(errorMessage);
        // throw new Error(errorMessage);
      }
      return configData;
    } catch (error) {
      console.warn('Не удалось загрузить конфигурацию тестирования, используется по умолчанию');
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
      console.error('Ошибка сохранения конфигурации тестирования:', error);
      throw error;
    }
  }

  getDefaultConfig() {
    return {
      generalSettings: {},
      libraryPaths: {},
      testCategories: {},
      systemDefaults: {},
      testSuiteTemplate: {},
      metadata: {
        created: new Date().toISOString(),
        version: '1.0.0',
        description: 'Конфигурация менеджера тестирования'
      }
    };
  }

  async getGeneralSettings() {
    const config = await this.getConfig();
    return config.generalSettings;
  }

  async getLibraryPaths() {
    const config = await this.getConfig();
    return config.libraryPaths;
  }

  async getTestCategories() {
    const config = await this.getConfig();
    return config.testCategories;
  }

  async getSystemDefaults() {
    const config = await this.getConfig();
    return config.systemDefaults;
  }

  async getTestSuiteTemplate() {
    const config = await this.getConfig();
    return config.testSuiteTemplate;
  }

  async loadTestSuite(suiteName) {
    if (this.testSuites.has(suiteName)) {
      return this.testSuites.get(suiteName);
    }
    try {
      const suitePath = path.join(testSuitesDirPath, `${suiteName}.json`);
      const suiteData = JSON.parse(readFileSync(suitePath, 'utf8'));
      // Potentially validate individual test suites against a common schema here
      this.testSuites.set(suiteName, suiteData);
      return suiteData;
    } catch (error) {
      console.error(`Failed to load test suite '${suiteName}': ${error.message}`);
      throw new Error(`Test suite '${suiteName}' not found or invalid.`);
    }
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
        console.error('Ошибка в наблюдателе конфигурации тестирования:', error);
      }
    });
  }

  clearCache() {
    this.cache = null;
    this.lastModified = null;
  }

  getInfo() {
    return {
      name: 'testing-manager',
      path: this.configPath,
      hasCache: !!this.cache,
      watchersCount: this.watchers.size,
      lastModified: this.lastModified
    };
  }
}

const testingConfigManager = new TestingConfigManager();

module.exports = { testingConfigManager };
