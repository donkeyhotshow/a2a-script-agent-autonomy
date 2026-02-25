/**
 * Фабрика для создания моделей (CommonJS версия)
 * Упрощенная версия для совместимости с CommonJS
 */

const { BaseModel } = require('./BaseModel.cjs');
const { defaultLogger } = require('../../logging-monitoring/logging/index.cjs');

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
   * Создание модели из JSON файла (CommonJS версия)
   */
  async createModelFromFile(name, filePath) {
    try {
      // В CommonJS используем require для загрузки JSON файлов
      const configData = require(filePath);
      return this.createModel(name, configData);
    } catch (error) {
      defaultLogger.warn(`Failed to load config from "${filePath}":`, error.message);
      return this.createModel(name, {});
    }
  }

  /**
   * Получение всех зарегистрированных типов моделей
   */
  getRegisteredTypes() {
    return Array.from(this.modelTypes.keys());
  }

  /**
   * Проверка регистрации типа модели
   */
  isRegistered(name) {
    return this.modelTypes.has(name);
  }

  /**
   * Установка схемы для типа модели
   */
  setSchema(name, schema) {
    this.schemas.set(name, schema);
  }

  /**
   * Получение схемы для типа модели
   */
  getSchema(name) {
    return this.schemas.get(name);
  }
}

module.exports = { ModelFactory };
