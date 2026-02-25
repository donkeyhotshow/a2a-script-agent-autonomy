/**
 * Базовый класс для всех модулей MCP сервера
 * Обеспечивает единообразный интерфейс и базовую функциональность
 */

// Safe validationUtils import with fallback
let validationUtils;
try {
  const validationModule = require('@libs/validation/validation/validation-utils.cjs');
  validationUtils = validationModule.validationUtils || validationModule;
  if (!validationUtils || typeof validationUtils !== 'object') {
    throw new Error('validation-utils.cjs did not export validationUtils object');
  }
} catch (validationError) {
  // Fallback validation utils
  validationUtils = {
    validate: () => ({ isValid: true, errors: [] }),
    isString: (val) => typeof val === 'string',
    isNumber: (val) => typeof val === 'number',
    isArray: (val) => Array.isArray(val),
    isFunction: (val) => typeof val === 'function',
  };
}

const {errorUtils} = require('@libs/error-management/error-handler/error-utils.js');

class ModuleBase {
    constructor(server, options = {}) {
        this.server = server;
        this.logger = server.logger;
        this.errorHandler = server.errorHandler;
        this.name = options.name || this.constructor.name;
        this.version = options.version || '1.0.0';
        this.description = options.description || 'MCP Module';
        this.enabled = options.enabled !== false;

        // Генерируем уникальный ID для модуля
        this.id = this.generateId();

        this.logger.debug(`Module ${this.name} initialized`, {version: this.version, enabled: this.enabled});
    }

    /**
     * Генерирует уникальный ID для модуля
     */
    generateId() {
        return `${this.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Базовая обработка запроса
     */
    async handleRequest(id, args) {
        try {
            this.logger.debug(`Module ${this.name} handling request`, {id, args});

            if (!this.enabled) {
                throw errorUtils.createError(`Module ${this.name} is disabled`);
            }

            const result = await this.processRequest(id, args);

            this.logger.debug(`Module ${this.name} request completed`, {id, success: true});
            return result;
        } catch (error) {
            this.logger.error(`Module ${this.name} request failed`, {id, error: error.message});
            throw error;
        }
    }

    /**
     * Абстрактный метод для обработки запроса - должен быть реализован в наследниках
     */
    async processRequest(id, args) {
        throw errorUtils.createError(`processRequest method not implemented in ${this.name}`);
    }

    /**
     * Возвращает возможности модуля
     */
    getCapabilities() {
        return {
            name: this.name,
            version: this.version,
            description: this.description,
            enabled: this.enabled,
            tools: this.getTools ? this.getTools() : []
        };
    }

    /**
     * Включение/выключение модуля
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        this.logger.info(`Module ${this.name} ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Получение статуса модуля
     */
    getStatus() {
        return {
            name: this.name,
            enabled: this.enabled,
            version: this.version,
            uptime: process.uptime()
        };
    }

    /**
     * Обработка ошибок модуля
     */
    handleError(error, context = '') {
        const errorMessage = `Module ${this.name} error${context ? ` in ${context}` : ''}: ${error.message}`;
        this.logger.error(errorMessage, {error: error.stack, context});

        return this.errorHandler.handle(error, `${this.name}.${context}`);
    }

    /**
     * Метод для очистки ресурсов модуля
     */
    async cleanup() {
        this.logger.debug(`Module ${this.name} cleanup started`);
        // Переопределяется в наследниках при необходимости
    }

    // === НОВЫЕ МЕТОДЫ ДЛЯ ТЕСТОВ ===

    /**
     * Возвращает имя модуля
     */
    getName() {
        return this.name;
    }

    /**
     * Возвращает версию модуля
     */
    getVersion() {
        return this.version;
    }

    /**
     * Возвращает описание модуля
     */
    getDescription() {
        return this.description;
    }

    /**
     * Логирование через сервер
     */
    log(level, message, data = {}) {
        if (this.logger && this.logger[level]) {
            this.logger[level](message, data);
        }
    }

    /**
     * Валидация схемы данных
     */
    validateSchema(schema, data) {
        try {
            // Простая валидация для базового класса
            if (schema.type === 'object' && schema.properties) {
                for (const [key, propSchema] of Object.entries(schema.properties)) {
                    if (schema.required && schema.required.includes(key)) {
                        if (data[key] === undefined) {
                            return {valid: false, errors: [`Missing required field: ${key}`]};
                        }
                    }

                    if (data[key] !== undefined) {
                        if (propSchema.type === 'string' && typeof data[key] !== 'string') {
                            return {valid: false, errors: [`Field ${key} must be a string`]};
                        }
                        if (propSchema.type === 'number' && typeof data[key] !== 'number') {
                            return {valid: false, errors: [`Field ${key} must be a number`]};
                        }
                        if (propSchema.type === 'boolean' && typeof data[key] !== 'boolean') {
                            return {valid: false, errors: [`Field ${key} must be a boolean`]};
                        }
                        if (propSchema.type === 'array' && !validationUtils.isArray(data[key])) {
                            return {valid: false, errors: [`Field ${key} must be an array`]};
                        }
                    }
                }
            }

            return {valid: true, errors: []};
        } catch (error) {
            this.logger.error(`Schema validation error in module ${this.name}`, {error: error.message});
            return {valid: false, errors: [`Validation error: ${error.message}`]};
        }
    }

    /**
     * Включение модуля
     */
    enable() {
        this.enabled = true;
        this.logger.info(`Module ${this.name} enabled`);
    }

    /**
     * Отключение модуля
     */
    disable() {
        this.enabled = false;
        this.logger.info(`Module ${this.name} disabled`);
    }

    /**
     * Переключение состояния модуля
     */
    toggle() {
        this.enabled = !this.enabled;
        this.logger.info(`Module ${this.name} ${this.enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Проверка, включен ли модуль
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Проверка, активен ли модуль
     */
    isActive() {
        return this.enabled;
    }

    /**
     * Инициализация модуля
     */
    async initialize() {
        this.logger.info(`Module ${this.name} initializing`);
        // Базовая реализация - переопределяется в наследниках
        return true;
    }

    /**
     * Перезапуск модуля
     */
    async restart() {
        this.logger.info(`Module ${this.name} restarting`);
        await this.cleanup();
        await this.initialize();
        return true;
    }

    /**
     * Получение метаданных модуля
     */
    getMetadata() {
        return {
            name: this.name,
            version: this.version,
            description: this.description,
            enabled: this.enabled,
            id: this.id,
            server: this.server ? {
                name: this.server.name || 'Unknown',
                version: this.server.version || 'Unknown'
            } : undefined
        };
    }

    /**
     * Строковое представление модуля
     */
    toString() {
        return `Module: ${this.name} v${this.version} (${this.enabled ? 'enabled' : 'disabled'})`;
    }

    /**
     * JSON представление модуля
     */
    toJSON() {
        return {
            name: this.name,
            version: this.version,
            description: this.description,
            enabled: this.enabled,
            id: this.id
        };
    }
}

module.exports = {ModuleBase};

