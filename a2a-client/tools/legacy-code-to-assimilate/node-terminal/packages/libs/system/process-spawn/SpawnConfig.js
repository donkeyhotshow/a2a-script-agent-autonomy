/**
 * SpawnConfig - Валидация конфигурации spawn
 * Функции:
 * - Валидация конфигурации перед запуском
 * - Вывод ошибок и их обработка
 * - Установка значений по умолчанию
 */

const { RESOURCE_LIMITS, SPAWN_TYPES, SpawnConfigStructure } = require('./types/SpawnTypes');
const { consoleUtils } = require('@libs/logging-monitoring/logging/console-utils');

class SpawnConfig {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Валидация конфигурации spawn
   */
  validate(config) {
    this.errors = [];
    this.warnings = [];

    try {
      // Проверяем обязательные поля
      this.validateRequiredFields(config);
      
      // Проверяем типы данных
      this.validateDataTypes(config);
      
      // Проверяем значения
      this.validateValues(config);
      
      // Устанавливаем значения по умолчанию
      const validatedConfig = this.setDefaults(config);

      if (this.errors.length > 0) {
        throw new Error(`Ошибки валидации: ${this.errors.join(', ')}`);
      }

      if (this.warnings.length > 0) {
        consoleUtils.warn(`Предупреждения валидации: ${this.warnings.join(', ')}`);
      }

      return validatedConfig;
    } catch (error) {
      consoleUtils.error('❌ Ошибка валидации конфигурации spawn:', error);
      throw error;
    }
  }

  /**
   * Валидация обязательных полей
   */
  validateRequiredFields(config) {
    if (!config) {
      this.errors.push('Конфигурация не предоставлена');
      return;
    }

    if (!config.command) {
      this.errors.push('Поле "command" обязательно');
    }

    if (!config.daemonId) {
      this.errors.push('Поле "daemonId" обязательно');
    }
  }

  /**
   * Валидация типов данных
   */
  validateDataTypes(config) {
    if (config.command && typeof config.command !== 'string') {
      this.errors.push('Поле "command" должно быть строкой');
    }

    if (config.args && !Array.isArray(config.args)) {
      this.errors.push('Поле "args" должно быть массивом');
    }

    if (config.cwd && typeof config.cwd !== 'string') {
      this.errors.push('Поле "cwd" должно быть строкой');
    }

    if (config.env && typeof config.env !== 'object') {
      this.errors.push('Поле "env" должно быть объектом');
    }

    if (config.type && !Object.values(SPAWN_TYPES).includes(config.type)) {
      this.errors.push(`Поле "type" должно быть одним из: ${Object.values(SPAWN_TYPES).join(', ')}`);
    }

    if (config.options && typeof config.options !== 'object') {
      this.errors.push('Поле "options" должно быть объектом');
    }

    if (config.limits && typeof config.limits !== 'object') {
      this.errors.push('Поле "limits" должно быть объектом');
    }
  }

  /**
   * Валидация значений
   */
  validateValues(config) {
    // Проверка команды
    if (config.command && config.command.trim() === '') {
      this.errors.push('Команда не может быть пустой');
    }

    // Проверка рабочей директории
    if (config.cwd && config.cwd.trim() === '') {
      this.errors.push('Рабочая директория не может быть пустой');
    }

    // Проверка типа запуска
    if (config.type && !Object.values(SPAWN_TYPES).includes(config.type)) {
      this.errors.push(`Неизвестный тип запуска: ${config.type}`);
    }

    // Проверка лимитов ресурсов
    if (config.limits) {
      this.validateResourceLimits(config.limits);
    }

    // Проверка опций
    if (config.options) {
      this.validateOptions(config.options);
    }
  }

  /**
   * Валидация лимитов ресурсов
   */
  validateResourceLimits(limits) {
    if (limits.cpuPercent !== undefined) {
      if (typeof limits.cpuPercent !== 'number') {
        this.errors.push('cpuPercent должен быть числом');
      } else if (limits.cpuPercent < 1 || limits.cpuPercent > 100) {
        this.errors.push('cpuPercent должен быть от 1 до 100');
      }
    }

    if (limits.memoryMB !== undefined) {
      if (typeof limits.memoryMB !== 'number') {
        this.errors.push('memoryMB должен быть числом');
      } else if (limits.memoryMB < 1) {
        this.errors.push('memoryMB должен быть больше 0');
      }
    }

    if (limits.timeoutMs !== undefined) {
      if (typeof limits.timeoutMs !== 'number') {
        this.errors.push('timeoutMs должен быть числом');
      } else if (limits.timeoutMs < 1000) {
        this.errors.push('timeoutMs должен быть не менее 1000 мс');
      }
    }
  }

  /**
   * Валидация опций
   */
  validateOptions(options) {
    if (options.autoKill !== undefined && typeof options.autoKill !== 'boolean') {
      this.errors.push('autoKill должен быть boolean');
    }

    if (options.monitorResources !== undefined && typeof options.monitorResources !== 'boolean') {
      this.errors.push('monitorResources должен быть boolean');
    }

    if (options.logOutput !== undefined && typeof options.logOutput !== 'boolean') {
      this.errors.push('logOutput должен быть boolean');
    }

    if (options.timeout !== undefined) {
      if (typeof options.timeout !== 'number') {
        this.errors.push('timeout должен быть числом');
      } else if (options.timeout < 1000) {
        this.errors.push('timeout должен быть не менее 1000 мс');
      }
    }

    if (options.gracefulTimeout !== undefined) {
      if (typeof options.gracefulTimeout !== 'number') {
        this.errors.push('gracefulTimeout должен быть числом');
      } else if (options.gracefulTimeout < 1000) {
        this.errors.push('gracefulTimeout должен быть не менее 1000 мс');
      }
    }
  }

  /**
   * Установка значений по умолчанию
   */
  setDefaults(config) {
    const defaultConfig = {
      ...config,
      args: config.args || [],
      cwd: config.cwd || process.cwd(),
      env: config.env || {},
      type: config.type || SPAWN_TYPES.SPAWN,
      options: {
        autoKill: true,
        monitorResources: true,
        logOutput: true,
        timeout: RESOURCE_LIMITS.TIMEOUT_MS,
        gracefulTimeout: RESOURCE_LIMITS.GRACEFUL_TIMEOUT_MS,
        ...config.options
      },
      limits: {
        cpuPercent: RESOURCE_LIMITS.CPU_PERCENT,
        memoryMB: RESOURCE_LIMITS.MEMORY_MB,
        timeoutMs: RESOURCE_LIMITS.TIMEOUT_MS,
        ...config.limits
      }
    };

    return defaultConfig;
  }

  /**
   * Создание конфигурации для spawn
   */
  static createSpawnConfig(command, options = {}) {
    const config = {
      command,
      daemonId: options.daemonId || 'unknown',
      ...options
    };

    const validator = new SpawnConfig();
    return validator.validate(config);
  }

  /**
   * Создание конфигурации для exec
   */
  static createExecConfig(command, options = {}) {
    const config = {
      command,
      daemonId: options.daemonId || 'unknown',
      type: SPAWN_TYPES.EXEC,
      ...options
    };

    const validator = new SpawnConfig();
    return validator.validate(config);
  }

  /**
   * Создание конфигурации для execFile
   */
  static createExecFileConfig(file, args = [], options = {}) {
    const config = {
      command: file,
      args,
      daemonId: options.daemonId || 'unknown',
      type: SPAWN_TYPES.EXEC_FILE,
      ...options
    };

    const validator = new SpawnConfig();
    return validator.validate(config);
  }

  /**
   * Получение ошибок валидации
   */
  getErrors() {
    return this.errors;
  }

  /**
   * Получение предупреждений валидации
   */
  getWarnings() {
    return this.warnings;
  }

  /**
   * Проверка наличия ошибок
   */
  hasErrors() {
    return this.errors.length > 0;
  }

  /**
   * Проверка наличия предупреждений
   */
  hasWarnings() {
    return this.warnings.length > 0;
  }
}

export { SpawnConfig };

