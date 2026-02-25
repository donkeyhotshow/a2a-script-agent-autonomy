/**
 * Централизованный реестр моделей (ESM версия)
 * Управляет всеми моделями в системе, обеспечивает их загрузку и доступ
 */

import { ModelFactory } from './ModelFactory.mjs';
import { BaseModel } from './BaseModel.mjs';
import { defaultLogger } from '../../logging-monitoring/logging/index.mjs';

class ModelRegistry {
  constructor(options = {}) {
    this.models = new Map();
    this.factory = new ModelFactory();
    this.isInitialized = false;
    this.loadingPromises = new Map();
    this.apiClient = options.apiClient; // Принимаем apiClient
  }

  /**
   * Инициализация реестра - загрузка всех моделей
   */
  async initialize() {
    if (this.isInitialized) return this;
    
    try {
      // Регистрация базовых типов моделей
      await this.registerDefaultModels();
      
      // Загрузка всех конфигураций из config-unified
      await this.loadAllConfigurations();
      
      this.isInitialized = true;
      defaultLogger.info(`ModelRegistry initialized with ${this.models.size} models`);
      
      return this;
    } catch (error) {
      defaultLogger.error('Failed to initialize ModelRegistry:', error);
      throw error;
    }
  }

  /**
   * Регистрация базовых типов моделей
   */
  async registerDefaultModels() {
    // Регистрация базовой модели
    this.factory.registerModelType('base', BaseModel);
    
    // Схемы для валидации (будут расширены в наследниках)
    const baseSchema = {
      type: 'object',
      properties: {
        version: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' }
      }
    };
    
    this.factory.setSchema('base', baseSchema);
  }

  /**
   * Загрузка всех конфигураций из config-unified
   */
  async loadAllConfigurations() {
    const configDirs = [
      'services', 'servers', 'apps-list', 'ports', 'project-types', 
      'service-groups', 'settings', 'system-config', 'task-types',
      'app-architectures', 'audit', 'automation', 'compliance',
      'deployment', 'environments', 'error-handling', 'gateway',
      'infrastructure', 'invalid-config', 'network', 'notifications',
      'package-testing', 'paths-manager', 'testing-manager', 'tests',
      'vulnerabilities', 'config'
    ];

    for (const dir of configDirs) {
      try {
        await this.loadConfiguration(dir);
      } catch (error) {
        defaultLogger.warn(`Failed to load configuration "${dir}":`, error.message);
      }
    }
  }

  /**
   * Загрузка конкретной конфигурации
   */
  async loadConfiguration(name) {
    if (this.loadingPromises.has(name)) {
      return this.loadingPromises.get(name);
    }

    const loadingPromise = this._loadConfigurationInternal(name);
    this.loadingPromises.set(name, loadingPromise);
    
    try {
      const model = await loadingPromise;
      this.models.set(name, model);
      return model;
    } finally {
      this.loadingPromises.delete(name);
    }
  }

  /**
   * Внутренняя загрузка конфигурации
   */
  async _loadConfigurationInternal(name) {
    try {
      let configData = {};

      if (this.apiClient) {
        // If apiClient is available, we will try to load configuration through the API
        try {
          const response = await this.apiClient.get(`/config/${name}`);
          if (response.data) {
            configData = response.data;
            defaultLogger.info(`Loaded model "${name}" from API`);
          } else {
            defaultLogger.warn(`No data received from API for config "${name}", creating empty model`);
          }
        } catch (apiError) {
          defaultLogger.warn(`Failed to load configuration "${name}" from API, falling back:`, apiError.message);
          // Continue to attempt to load from file or create an empty model if the API is unavailable.
          // In the browser, file loading will be stubbed.
        }
      } else {
        defaultLogger.warn(`ModelRegistry: API client not provided. Falling back to file loading (no-op in browser).`);
      }
      
      // В браузере createModelFromFile будет no-op, если apiClient не предоставил данные
      // Для браузерного окружения, если данные не получены через API, создаем пустую модель
      const model = configData ? 
        this.factory.createModel('base', { modelName: name, data: configData }) : 
        this.factory.createModel('base', { modelName: name });
      
      // Устанавливаем имя модели
      model.set('modelName', name);
      
      // Загружаем модель (для пустых моделей это no-op)
      await model.load();
      
      if (configData) {
        // Если данные были загружены через API, мы уже логировали это
      } else {
        defaultLogger.warn(`Config file not found for "${name}", creating empty model`);
      }
      return model;
    } catch (error) {
      // В случае любой ошибки, создаем пустую модель
      defaultLogger.warn(`Error loading configuration "${name}", creating empty model:`, error.message);
      const model = this.factory.createModel('base', { modelName: name });
      await model.load();
      return model;
    }
  }

  /**
   * Получение модели по имени
   */
  get(name) {
    if (!this.models.has(name)) {
      throw new Error(`Model "${name}" is not loaded`);
    }
    return this.models.get(name);
  }

  /**
   * Проверка наличия модели
   */
  has(name) {
    return this.models.has(name);
  }

  /**
   * Получение всех моделей
   */
  getAll() {
    return new Map(this.models);
  }

  /**
   * Получение списка имен моделей
   */
  getModelNames() {
    return Array.from(this.models.keys());
  }

  /**
   * Добавление модели в реестр
   */
  add(name, model) {
    if (!(model instanceof BaseModel)) {
      throw new Error('Model must be an instance of BaseModel');
    }
    
    this.models.set(name, model);
    return this;
  }

  /**
   * Удаление модели из реестра
   */
  remove(name) {
    const model = this.models.get(name);
    if (model) {
      model.reset();
      this.models.delete(name);
    }
    return this;
  }

  /**
   * Перезагрузка модели
   */
  async reload(name) {
    this.remove(name);
    return this.loadConfiguration(name);
  }

  /**
   * Перезагрузка всех моделей
   */
  async reloadAll() {
    const names = this.getModelNames();
    this.models.clear();
    
    for (const name of names) {
      await this.loadConfiguration(name);
    }
    
    return this;
  }

  /**
   * Сохранение всех моделей
   */
  async saveAll() {
    const promises = Array.from(this.models.values()).map(model => model.save());
    await Promise.allSettled(promises);
    return this;
  }

  /**
   * Получение метаданных всех моделей
   */
  getMetadata() {
    const metadata = {};
    
    for (const [name, model] of this.models) {
      metadata[name] = model.getMetadata();
    }
    
    return {
      totalModels: this.models.size,
      isInitialized: this.isInitialized,
      models: metadata
    };
  }

  /**
   * Поиск моделей по критериям
   */
  find(criteria) {
    const results = [];
    
    for (const [name, model] of this.models) {
      let matches = true;
      
      for (const [key, value] of Object.entries(criteria)) {
        if (model.get(key) !== value) {
          matches = false;
          break;
        }
      }
      
      if (matches) {
        results.push({ name, model });
      }
    }
    
    return results;
  }

  /**
   * Очистка реестра
   */
  clear() {
    for (const model of this.models.values()) {
      model.reset();
    }
    
    this.models.clear();
    this.loadingPromises.clear();
    this.isInitialized = false;
    
    return this;
  }

  /**
   * Получение статистики реестра
   */
  getStats() {
    const stats = {
      totalModels: this.models.size,
      loadedModels: 0,
      totalCacheSize: 0,
      totalEventListeners: 0
    };
    
    for (const model of this.models.values()) {
      if (model.isModelLoaded()) {
        stats.loadedModels++;
      }
      
      const metadata = model.getMetadata();
      stats.totalCacheSize += metadata.cacheSize;
      stats.totalEventListeners += metadata.eventListeners.length;
    }
    
    return stats;
  }
}

export { ModelRegistry };
