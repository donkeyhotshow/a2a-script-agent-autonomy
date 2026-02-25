/**
 * Unified Configuration Utilities Library
 * Объединенная библиотека утилит конфигурации
 */

let CurrentLoggingUtilsModule;

if (typeof window !== 'undefined' || process.env.BUILD_TARGET === 'browser') {
  // Browser environment
  CurrentLoggingUtilsModule = require('../../logging-monitoring/logging/index.browser.js');
} else {
  // Node.js environment
  CurrentLoggingUtilsModule = require('../../logging-monitoring/logging/index.js');
}

const { defaultLogger } = CurrentLoggingUtilsModule;

const path = require('path');
const dot = require('dot-object');
const { object } = require('joi'); // Добавлено для валидации схемы

const fs = require('fs').promises; // Corrected import

/**
 * ConfigurationUtils - Утилиты для работы с конфигурацией.
 * Предоставляет методы для загрузки, сохранения и управления конфигурационными данными.
 */
class ConfigurationUtils {
  constructor(options = {}) {
    this.configCache = new Map();
    this.logger = options.logger || defaultLogger; // Use defaultLogger
    this.baseConfigPath = options.baseConfigPath || path.resolve(process.cwd(), 'config');
    this.schemaCache = new Map(); // Кэш для схем валидации
  }

  /**
   * Загружает конфигурационный файл по указанному пути.
   * Если файл уже есть в кэше, возвращает его оттуда.
   * @param {string} configName - Имя конфигурации (без расширения, например, 'database' или 'app.settings').
   * @param {object} [options={}] - Дополнительные опции.
   * @param {boolean} [options.refresh=false] - Принудительно обновить кэш.
   * @param {string} [options.configPath] - Полный путь к файлу конфигурации, если отличается от baseConfigPath.
   * @returns {Promise<object>} Объект конфигурации.
   */
  async load(configName, options = {}) {
    const { refresh = false, configPath } = options;
    const fullPath = configPath || this._resolveConfigPath(configName);

    if (!refresh && this.configCache.has(fullPath)) {
      defaultLogger.debug(`[ConfigUtils] Loading from cache: ${configName}`); // Use defaultLogger
      return this.configCache.get(fullPath);
    }

    try {
      const data = await fs.readFile(fullPath, 'utf8');
      const config = JSON.parse(data);
      this.configCache.set(fullPath, config);
      defaultLogger.debug(`[ConfigUtils] Loaded config: ${configName} from ${fullPath}`); // Use defaultLogger
      return config;
    } catch (error) {
      defaultLogger.error(`[ConfigUtils] Failed to load config ${configName} from ${fullPath}:`, error.message); // Use defaultLogger
      throw new Error(`Failed to load config ${configName}: ${error.message}`);
    }
  }

  /**
   * Сохраняет конфигурационный объект в файл.
   * @param {string} configName - Имя конфигурации.
   * @param {object} config - Объект конфигурации для сохранения.
   * @param {object} [options={}] - Дополнительные опции.
   * @param {string} [options.configPath] - Полный путь к файлу конфигурации.
   * @returns {Promise<void>} Promise, который разрешается после сохранения.
   */
  async save(configName, config, options = {}) {
    const { configPath } = options;
    const fullPath = configPath || this._resolveConfigPath(configName);

    try {
      await fs.writeFile(fullPath, JSON.stringify(config, null, 2), 'utf8');
      this.configCache.set(fullPath, config);
      defaultLogger.debug(`[ConfigUtils] Saved config: ${configName} to ${fullPath}`); // Use defaultLogger
    } catch (error) {
      defaultLogger.error(`[ConfigUtils] Failed to save config ${configName} to ${fullPath}:`, error.message); // Use defaultLogger
      throw new Error(`Failed to save config ${configName}: ${error.message}`);
    }
  }

  /**
   * Получает значение по ключу из конфигурации, используя dot-нотацию.
   * @param {string} configName - Имя конфигурации.
   * @param {string} key - Ключ в dot-нотации (например, 'database.host').
   * @returns {Promise<any>} Значение конфигурации.
   */
  async get(configName, key) {
    const config = await this.load(configName);
    return dot.dot(key, config);
  }

  /**
   * Устанавливает значение по ключу в конфигурации, используя dot-нотацию.
   * @param {string} configName - Имя конфигурации.
   * @param {string} key - Ключ в dot-нотации.
   * @param {any} value - Значение для установки.
   * @returns {Promise<void>} Promise, который разрешается после обновления и сохранения.
   */
  async set(configName, key, value) {
    const config = await this.load(configName);
    dot.set(key, value, config);
    await this.save(configName, config);
  }

  /**
   * Удаляет конфигурацию из кэша.
   * @param {string} configName - Имя конфигурации.
   * @returns {void}
   */
  clearCache(configName) {
    const fullPath = this._resolveConfigPath(configName);
    this.configCache.delete(fullPath);
    defaultLogger.debug(`[ConfigUtils] Cleared cache for: ${configName}`); // Use defaultLogger
  }

  /**
   * STUB: Начинает отслеживание изменений в конфигурационных файлах.
   * Реальная реализация потребует файлового вотчера (например, chokidar).
   */
  startWatchingConfig(configDir, onChange, onDelete) {
    defaultLogger.warn(`[ConfigUtils] Configuration watching is not fully implemented. Stubbing startWatchingConfig for directory: ${configDir}`); // Use defaultLogger
    // Реальная логика вотчера здесь
  }

  /**
   * STUB: Останавливает отслеживание изменений в конфигурационных файлах.
   * @param {string} configDir - Директория, за которой прекращается слежение.
   */
  stopWatchingConfig(configDir) {
    defaultLogger.warn(`[ConfigUtils] Configuration watching is not fully implemented. Stubbing stopWatchingConfig for directory: ${configDir}`); // Use defaultLogger
    // Реальная логика остановки вотчера здесь
  }

  /**
   * Загружает и кэширует схему валидации Joi для данной конфигурации.
   * @param {string} configName - Имя конфигурации для которой загружается схема.
   * @returns {Promise<object>} Объект Joi схемы.
   */
  async loadSchema(configName) {
    const schemaPath = this._resolveSchemaPath(configName);
    if (this.schemaCache.has(schemaPath)) {
      defaultLogger.debug(`[ConfigUtils] Loading schema from cache: ${configName}`); // Use defaultLogger
      return this.schemaCache.get(schemaPath);
    }
    try {
      const schemaModule = require(schemaPath); // Динамический импорт CommonJS модуля
      const schema = schemaModule.default || schemaModule; // Поддержка export default и module.exports
      this.schemaCache.set(schemaPath, schema);
      defaultLogger.debug(`[ConfigUtils] Loaded schema for ${configName} from ${schemaPath}`); // Use defaultLogger
      return schema;
    } catch (error) {
      defaultLogger.warn(`[ConfigUtils] No schema found or error loading schema for ${configName} from ${schemaPath}.`, error.message); // Use defaultLogger
      return object(); // Возвращаем пустую схему Joi по умолчанию, если схема не найдена
    }
  }

  /**
   * Валидирует конфигурацию по схеме Joi.
   * @param {string} configName - Имя конфигурации.
   * @param {object} config - Объект конфигурации для валидации.
   * @param {object} schema - Joi схема для валидации.
   * @returns {object} Валидированный объект конфигурации.
   * @throws {Error} Если валидация не пройдена.
   */
  validate(configName, config, schema) {
    const { error, value } = schema.validate(config, { abortEarly: false, allowUnknown: true });
    if (error) {
      defaultLogger.error(`[ConfigUtils] Validation error for ${configName}:`, error.details.map(d => d.message).join('; ')); // Use defaultLogger
      throw new Error(`Configuration validation failed for ${configName}: ${error.details.map(d => d.message).join('; ')}`);
    }
    defaultLogger.debug(`[ConfigUtils] Configuration ${configName} validated successfully.`); // Use defaultLogger
    return value;
  }

  /**
   * Вспомогательный метод для определения полного пути к файлу конфигурации.
   * @param {string} configName - Имя конфигурации.
   * @returns {string} Полный путь к файлу конфигурации.
   */
  _resolveConfigPath(configName) {
    // Поддержка вложенных путей, например, 'app.settings' -> 'app/settings.json'
    const normalizedName = configName.replace(/\./g, path.sep);
    return path.join(this.baseConfigPath, `${normalizedName}.json`);
  }

  /**
   * Вспомогательный метод для определения полного пути к файлу схемы Joi.
   * @param {string} configName - Имя конфигурации.
   * @returns {string} Полный путь к файлу схемы.
   */
  _resolveSchemaPath(configName) {
    const normalizedName = configName.replace(/\./g, path.sep);
    // Предполагаем, что схемы лежат рядом с конфигами, но с суффиксом .schema.js
    return path.join(this.baseConfigPath, `${normalizedName}.schema.js`);
  }
}

module.exports = { ConfigurationUtils };
