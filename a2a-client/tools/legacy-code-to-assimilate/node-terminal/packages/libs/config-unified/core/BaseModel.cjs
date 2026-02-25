/**
 * Базовая модель для всех конфигурационных моделей (CommonJS версия)
 * Упрощенная версия для совместимости с CommonJS
 */

const { defaultLogger } = require('../../logging-monitoring/logging/index.cjs');

class BaseModel {
  constructor(config = {}, options = {}) {
    this.config = config;
    this.schema = options.schema || null;
    this.validators = [];
    this.cacheMap = new Map();
    this.events = new Map();
    this.isLoaded = false;
    this.lastModified = null;
    
    // Регистрация базовых валидаторов
    this.registerDefaultValidators();
  }

  /**
   * Регистрация базовых валидаторов
   */
  registerDefaultValidators() {
    this.validators.push({
      name: 'required',
      validate: (data) => {
        if (this.schema && this.schema.required) {
          return this.schema.required.every(field => 
            data.hasOwnProperty(field) && data[field] !== null && data[field] !== undefined
          );
        }
        return true;
      }
    });
  }

  /**
   * Валидация данных по схеме
   */
  validate(data) {
    if (!this.schema) return { valid: true, errors: [] };
    
    const errors = [];
    
    // Проверка обязательных полей
    for (const validator of this.validators) {
      if (!validator.validate(data)) {
        errors.push(`Validation failed for ${validator.name}`);
      }
    }
    
    return { valid: errors.length === 0, errors };
  }

  /**
   * Получение конфигурации
   */
  getConfig() {
    return this.config;
  }

  /**
   * Установка конфигурации
   */
  setConfig(config) {
    this.config = config;
    this.lastModified = new Date();
  }

  /**
   * Обновление конфигурации
   */
  updateConfig(updates) {
    this.config = { ...this.config, ...updates };
    this.lastModified = new Date();
  }

  /**
   * Сохранение конфигурации
   */
  async saveConfig() {
    // В CommonJS версии это заглушка
    defaultLogger.info('BaseModel.saveConfig called (CommonJS version)');
    return Promise.resolve();
  }

  /**
   * Загрузка конфигурации
   */
  async loadConfig() {
    this.isLoaded = true;
    return this.config;
  }

  /**
   * Получение имени модели
   */
  getModelName() {
    return this.constructor.name;
  }

  /**
   * Подписка на события
   */
  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(callback);
  }

  /**
   * Отписка от событий
   */
  off(event, callback) {
    if (this.events.has(event)) {
      const callbacks = this.events.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Эмиссия событий
   */
  emit(event, data) {
    if (this.events.has(event)) {
      this.events.get(event).forEach(callback => callback(data));
    }
  }

  /**
   * Очистка кэша
   */
  clearCache() {
    this.cacheMap.clear();
  }

  /**
   * Получение информации о модели
   */
  getInfo() {
    return {
      name: this.getModelName(),
      isLoaded: this.isLoaded,
      lastModified: this.lastModified,
      cacheSize: this.cacheMap.size,
      eventsCount: this.events.size
    };
  }
}

module.exports = { BaseModel };
