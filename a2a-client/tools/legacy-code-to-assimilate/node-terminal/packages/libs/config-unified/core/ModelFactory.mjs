/**
 * Фабрика для создания моделей (ESM версия)
 * Автоматически определяет тип модели и создает соответствующий экземпляр
 */

import { BaseModel } from './BaseModel.mjs';
import { defaultLogger } from '../../logging-monitoring/logging/index.mjs';

class ModelFactory {
  constructor() {
    this.modelTypes = new Map();
    this.schemas = new Map();
  }

  /**
   * Регистрация типа модели
   */
  registerModelType(name, ModelClass, schema = null) {
    this.modelTypes.set(name, ModelClass);
    if (schema) {
      this.schemas.set(name, schema);
    }
  }

  /**
   * Создание модели по имени
   */
  createModel(name, config = {}) {
    const ModelClass = this.modelTypes.get(name);
    if (!ModelClass) {
      throw new Error(`Model type "${name}" is not registered`);
    }

    const schema = this.schemas.get(name);
    const instance = new ModelClass(config, { schema });
    
    return instance;
  }

  /**
   * Создание модели из JSON файла
   */
  async createModelFromFile(name, filePath) {
    try {
      // В браузере этот метод будет no-op, так как fs недоступен
      if (typeof window !== 'undefined') {
        defaultLogger.warn(`createModelFromFile not supported in browser environment for "${filePath}"`);
        return this.createModel(name, {});
      }
      
      const fs = await import('fs');
      const path = await import('path');
      const fullPath = path.resolve(filePath);
      const fileContent = fs.readFileSync(fullPath, 'utf8');
      const config = JSON.parse(fileContent);
      
      return this.createModel(name, config);
    } catch (error) {
      throw new Error(`Failed to create model from file "${filePath}": ${error.message}`);
    }
  }

  /**
   * Создание модели из URL
   */
  async createModelFromURL(name, url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const config = await response.json();
      return this.createModel(name, config);
    } catch (error) {
      throw new Error(`Failed to create model from URL "${url}": ${error.message}`);
    }
  }

  /**
   * Получение списка зарегистрированных типов моделей
   */
  getRegisteredTypes() {
    return Array.from(this.modelTypes.keys());
  }

  /**
   * Проверка зарегистрирован ли тип модели
   */
  isRegistered(name) {
    return this.modelTypes.has(name);
  }

  /**
   * Получение схемы для типа модели
   */
  getSchema(name) {
    return this.schemas.get(name);
  }

  /**
   * Установка схемы для типа модели
   */
  setSchema(name, schema) {
    this.schemas.set(name, schema);
  }

  /**
   * Массовое создание моделей из конфигурации
   */
  createModelsFromConfig(configs) {
    const models = new Map();
    
    for (const [name, config] of Object.entries(configs)) {
      try {
        const model = this.createModel(name, config);
        models.set(name, model);
      } catch (error) {
        defaultLogger.warn(`Failed to create model "${name}":`, error.message);
      }
    }
    
    return models;
  }

  /**
   * Создание модели с автоматическим определением типа
   */
  createModelAuto(config) {
    // Попытка определить тип по структуре данных
    const type = this.detectModelType(config);
    
    if (type && this.isRegistered(type)) {
      return this.createModel(type, config);
    }
    
    // Если тип не определен, создаем базовую модель
    return new BaseModel(config);
  }

  /**
   * Автоматическое определение типа модели по структуре данных
   */
  detectModelType(config) {
    if (!config || typeof config !== 'object') return null;
    
    // Проверка на наличие специфичных полей
    if (config.services && Array.isArray(config.services)) return 'services';
    if (config.servers && Array.isArray(config.servers)) return 'servers';
    if (config.apps && Array.isArray(config.apps)) return 'apps-list';
    if (config.projectTypes && Array.isArray(config.projectTypes)) return 'project-types';
    if (config.groups && typeof config.groups === 'object') return 'service-groups';
    if (config.ports && Array.isArray(config.ports)) return 'ports';
    if (config.settings && typeof config.settings === 'object') return 'settings';
    
    return null;
  }

  /**
   * Очистка всех зарегистрированных типов
   */
  clear() {
    this.modelTypes.clear();
    this.schemas.clear();
  }
}

export { ModelFactory };
