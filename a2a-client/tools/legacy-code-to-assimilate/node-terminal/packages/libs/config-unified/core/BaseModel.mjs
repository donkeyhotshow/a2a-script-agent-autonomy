/**
 * Базовая модель для всех конфигурационных моделей (ESM версия)
 * Предоставляет CRUD операции, валидацию, систему событий и кэширование
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { defaultLogger } from '../../logging-monitoring/logging/index.mjs';

class BaseModel {
  constructor(config = {}, options = {}) {
    this.config = config;
    this.schema = options.schema || null;
    this.validators = [];
    this.cacheMap = new Map();
    this.events = new Map();
    this.isLoaded = false;
    this.lastModified = null;
    
    // Инициализация Ajv для валидации
    this.ajv = new Ajv({ allErrors: true });
    addFormats(this.ajv);
    
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
    
    const validate = this.ajv.compile(this.schema);
    const valid = validate(data);
    
    return {
      valid,
      errors: validate.errors || []
    };
  }

  /**
   * Безопасное получение значения по ключу
   */
  get(key, defaultValue = null) {
    if (!key) return this.config;
    
    const keys = key.split('.');
    let value = this.config;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  }

  /**
   * Установка значения с валидацией
   */
  set(key, value) {
    // Валидируем только переданное значение, а не весь объект
    const validation = this.validateValue(key, value);
    if (!validation.valid) {
      throw new Error(`Validation failed for key "${key}": ${validation.errors.map(e => e.message).join(', ')}`);
    }
    
    const keys = key.split('.');
    let target = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!target[k] || typeof target[k] !== 'object') {
        target[k] = {};
      }
      target = target[k];
    }
    
    target[keys[keys.length - 1]] = value;
    this.lastModified = new Date();
    this.clearCache();
    this.emit('change', { key, value, config: this.config });
    
    return this;
  }

  /**
   * Валидация конкретного значения по ключу
   */
  validateValue(key, value) {
    if (!this.schema) return { valid: true, errors: [] };
    
    // Если это вложенное свойство, валидируем только его
    if (key.includes('.')) {
      const keys = key.split('.');
      const propertySchema = this.getPropertySchema(keys);
      if (propertySchema) {
        const validate = this.ajv.compile(propertySchema);
        const valid = validate(value);
        return { valid, errors: validate.errors || [] };
      }
    }
    
    // Для корневых свойств валидируем как обычно
    return this.validate({ [key]: value });
  }

  /**
   * Получение схемы для конкретного свойства
   */
  getPropertySchema(keys) {
    let schema = this.schema;
    for (const key of keys) {
      if (schema && schema.properties && schema.properties[key]) {
        schema = schema.properties[key];
      } else if (schema && schema.patternProperties) {
        // Проверяем patternProperties для динамических ключей
        for (const pattern in schema.patternProperties) {
          const regex = new RegExp(pattern);
          if (regex.test(key)) {
            schema = schema.patternProperties[pattern];
            break;
          }
        }
      } else {
        return null;
      }
    }
    return schema;
  }

  /**
   * Получение всех данных
   */
  getAll() {
    return { ...this.config };
  }

  /**
   * Обновление всех данных
   */
  updateAll(data) {
    const validation = this.validate(data);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }
    
    this.config = { ...data };
    this.lastModified = new Date();
    this.clearCache();
    this.emit('update', { config: this.config });
    
    return this;
  }

  /**
   * Экспорт в JSON
   */
  toJSON() {
    return {
      config: this.config,
      schema: this.schema,
      lastModified: this.lastModified,
      version: this.getVersion()
    };
  }

  /**
   * Импорт из JSON
   */
  static fromJSON(json) {
    const instance = new this(json.config);
    instance.schema = json.schema;
    instance.lastModified = json.lastModified;
    instance.isLoaded = true;
    return instance;
  }

  /**
   * Получение версии модели
   */
  getVersion() {
    return this.get('version', '1.0.0');
  }

  /**
   * Кэширование результатов
   */
  cache(key, value, ttl = 300000) { // 5 минут по умолчанию
    this.cacheMap.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Получение из кэша
   */
  getCached(key) {
    const cached = this.cacheMap.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expiresAt) {
      this.cacheMap.delete(key);
      return null;
    }
    
    return cached.value;
  }

  /**
   * Очистка кэша
   */
  clearCache() {
    this.cacheMap.clear();
  }

  /**
   * Система событий
   */
  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.events.has(event)) return;
    
    const callbacks = this.events.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  emit(event, data) {
    if (!this.events.has(event)) return;
    
    this.events.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        defaultLogger.error(`Error in event handler for "${event}":`, error);
      }
    });
  }

  /**
   * Загрузка модели (переопределяется в наследниках)
   */
  async load() {
    this.isLoaded = true;
    this.emit('loaded', { config: this.config });
    return this;
  }

  /**
   * Сохранение модели (переопределяется в наследниках)
   */
  async save() {
    this.emit('saved', { config: this.config });
    return this;
  }

  /**
   * Проверка загружена ли модель
   */
  isModelLoaded() {
    return this.isLoaded;
  }

  /**
   * Получение метаданных модели
   */
  getMetadata() {
    return {
      version: this.getVersion(),
      lastModified: this.lastModified,
      isLoaded: this.isLoaded,
      cacheSize: this.cacheMap.size,
      eventListeners: Array.from(this.events.keys())
    };
  }

  /**
   * Сброс модели к исходному состоянию
   */
  reset() {
    this.config = {};
    this.cacheMap.clear();
    this.events.clear();
    this.isLoaded = false;
    this.lastModified = null;
    this.emit('reset');
  }
}

export { BaseModel };
