/**
 * Unified Configuration Utilities Library (CommonJS Version)
 * Объединенная библиотека утилит конфигурации
 */

const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const crypto = require('crypto');

class ConfigurationUtils {
  constructor(options = {}) {
    this.configDir = options.configDir || 'config';
    this.defaults = options.defaults || {};
    this.env = options.env || process.env.NODE_ENV || 'development';
    this.autoLoad = options.autoLoad !== false;
    this.sensitiveFields = options.sensitiveFields || [];
    this.validationEnabled = options.validation?.enabled !== false;
    this.validationStrict = options.validation?.strict || false;
    this.defaultOutputCharLimit = options.defaultOutputCharLimit || (1024 * 1024);
    this.logger = options.logger || console;

    // Схемы валидации
    this.schemas = new Map();
    this.customValidators = new Map();

    // Параметры шифрования
    this.encryptionAlgorithm = (options.encryption?.algorithm || 'aes-256-gcm');
    this.encryptionKey = options.encryption?.key || process.env.ENCRYPTION_KEY || '';
    if (!this.encryptionKey) {
      this.logger.warn('ENCRYPTION_KEY не установлен. Используйте случайный ключ для продакшена.');
      this.encryptionKey = crypto.randomBytes(32).toString('hex');
    }
    if (this.encryptionKey.length !== 64) {
      this.encryptionKey = crypto.createHash('sha256').update(this.encryptionKey).digest('hex');
    }

    // Параметры резервного копирования
    this.backupDir = options.backup?.backupDir || 'config-backups';
    this.maxBackups = options.backup?.maxBackups || 10;
    this.compressBackups = options.backup?.compress !== false;
    this.includeBackupMetadata = options.backup?.includeMetadata !== false;

    this.configs = new Map();
    this.watchers = new Map();

    if (this.autoLoad) {
      this.loadAllConfigs();
    }
  }

  /**
   * Автоматическая загрузка конфигураций из директории
   */
  async loadAllConfigs() {
    try {
      const files = await fs.readdir(this.configDir);
      for (const file of files) {
        if (this.isConfigFile(file)) {
          const configName = path.basename(file, path.extname(file));
          await this.load(configName);
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.logger.error('Ошибка автоматической загрузки конфигураций:', error.message);
      }
    }
  }

  /**
   * Загрузка конфигурации
   */
  async load(configName, filePath) {
    try {
      let fullPath = filePath;
      if (!fullPath) {
        const extensions = ['.json', '.js', '.env'];
        for (const ext of extensions) {
          const testPath = path.join(this.configDir, `${configName}${ext}`);
          try {
            await fs.access(testPath);
            fullPath = testPath;
            break;
          } catch (e) {
            // Файл не найден, продолжаем поиск
          }
        }
        if (!fullPath) {
          throw new Error(`Конфигурация ${configName} не найдена`);
        }
      }

      let config;
      const ext = path.extname(fullPath);
      const content = await fs.readFile(fullPath, 'utf8');

      if (ext === '.json') {
        config = JSON.parse(content);
      } else if (ext === '.js') {
        // Безопасная загрузка JS файлов
        const vm = require('vm');
        const context = { module: { exports: {} }, exports: {} };
        vm.runInNewContext(content, context);
        config = context.module.exports || context.exports;
      } else if (ext === '.env') {
        config = this.parseEnvFile(content);
      } else {
        throw new Error(`Неподдерживаемый формат файла: ${ext}`);
      }

      // Применяем значения по умолчанию
      if (this.defaults[configName]) {
        config = { ...this.defaults[configName], ...config };
      }

      // Валидация
      if (this.validationEnabled) {
        await this.validate(configName, config);
      }

      // Сохраняем конфигурацию
      this.configs.set(configName, config);
      return config;

    } catch (error) {
      this.logger.error(`Ошибка загрузки конфигурации ${configName}:`, error.message);
      throw error;
    }
  }

  /**
   * Парсинг .env файла
   */
  parseEnvFile(content) {
    const config = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          config[key.trim()] = valueParts.join('=').trim();
        }
      }
    }
    
    return config;
  }

  /**
   * Проверка, является ли файл конфигурационным
   */
  isConfigFile(filename) {
    const configExtensions = ['.json', '.js', '.env'];
    return configExtensions.some(ext => filename.endsWith(ext));
  }

  /**
   * Получение конфигурации
   */
  get(configName, key, defaultValue) {
    const config = this.configs.get(configName);
    if (!config) {
      return defaultValue;
    }
    
    if (!key) {
      return config;
    }
    
    const keys = key.split('.');
    let value = config;
    
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
   * Установка значения конфигурации
   */
  set(configName, key, value) {
    let config = this.configs.get(configName);
    if (!config) {
      config = {};
      this.configs.set(configName, config);
    }
    
    const keys = key.split('.');
    let current = config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current) || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  /**
   * Валидация конфигурации
   */
  async validate(configName, config) {
    const schema = this.schemas.get(configName);
    if (!schema) {
      return true;
    }
    
    // Простая валидация по схеме
    for (const [key, rules] of Object.entries(schema)) {
      if (rules.required && !(key in config)) {
        throw new Error(`Обязательное поле ${key} отсутствует в конфигурации ${configName}`);
      }
      
      if (key in config && rules.type && typeof config[key] !== rules.type) {
        throw new Error(`Поле ${key} должно быть типа ${rules.type} в конфигурации ${configName}`);
      }
    }
    
    return true;
  }

  /**
   * Добавление схемы валидации
   */
  addSchema(configName, schema) {
    this.schemas.set(configName, schema);
  }

  /**
   * Получение всех конфигураций
   */
  getAll() {
    return Object.fromEntries(this.configs);
  }

  /**
   * Очистка конфигурации
   */
  clear(configName) {
    if (configName) {
      this.configs.delete(configName);
    } else {
      this.configs.clear();
    }
  }
}

// Создаем экземпляр по умолчанию
const defaultConfig = new ConfigurationUtils();

// Экспортируем класс и экземпляр
module.exports = {
  ConfigurationUtils,
  ConfigManager: ConfigurationUtils, // Алиас для совместимости
  default: defaultConfig
};
