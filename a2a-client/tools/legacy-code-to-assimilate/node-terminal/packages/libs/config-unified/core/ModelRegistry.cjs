/**
 * Централизованный реестр моделей (CommonJS версия)
 * Упрощенная версия для совместимости с CommonJS
 */

const { defaultLogger } = require('../../logging-monitoring/logging/index.cjs');

class ModelRegistry {
  constructor(options = {}) {
    this.models = new Map();
    this.isInitialized = false;
    this.apiClient = options.apiClient;
  }

  /**
   * Инициализация реестра
   */
  async initialize() {
    if (this.isInitialized) return this;
    
    try {
      this.isInitialized = true;
      defaultLogger.info('ModelRegistry initialized (CommonJS version)');
      return this;
    } catch (error) {
      defaultLogger.error('Failed to initialize ModelRegistry:', error);
      throw error;
    }
  }

  /**
   * Создание модели по имени
   */
  async createModel(modelName) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    // Возвращаем простую модель для тестирования
    return {
      getConfig: () => ({}),
      setConfig: (config) => {},
      updateConfig: (updates) => {},
      saveConfig: () => Promise.resolve(),
      validate: (data) => ({ valid: true, errors: [] }),
      getModelName: () => modelName
    };
  }

  /**
   * Получение модели по имени
   */
  static getModel(modelName) {
    return {
      getConfig: () => ({}),
      setConfig: (config) => {},
      updateConfig: (updates) => {},
      saveConfig: () => Promise.resolve(),
      validate: (data) => ({ valid: true, errors: [] }),
      getModelName: () => modelName
    };
  }

  /**
   * Регистрация модели
   */
  registerModel(name, model) {
    this.models.set(name, model);
  }

  /**
   * Получение всех моделей
   */
  getAllModels() {
    return Array.from(this.models.values());
  }

  /**
   * Очистка реестра
   */
  clear() {
    this.models.clear();
    this.isInitialized = false;
  }
}

module.exports = { ModelRegistry };
