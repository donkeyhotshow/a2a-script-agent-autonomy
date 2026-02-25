/**
 * ErrorCollector - Сборщик ошибок для глобального обработчика
 */
class ErrorCollector {
    constructor(options = {}) {
        this.errors = [];
        this.maxErrors = options.maxErrors || 1000;
        this.logger = options.logger;
    }

    /**
     * Инициализация ErrorCollector
     */
    async initialize() {
        // Здесь может быть логика асинхронной инициализации, если она потребуется в будущем.
        if (this.logger) {
            this.logger.debug('[ErrorCollector] Initialized');
        }
    }

    /**
     * Собирает ошибку
     * @param {Error} error - Объект ошибки
     * @param {Object} context - Контекст ошибки
     */
    collect(error, context = {}) {
        const errorEntry = {
            error: error.message || error,
            stack: error.stack,
            context: context,
            timestamp: new Date().toISOString(),
            source: context.source || 'unknown'
        };

        this.errors.push(errorEntry);

        // Ограничиваем количество ошибок
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }

        if (this.logger) {
            this.logger.error(`[ErrorCollector] ${error.message}`, error.stack);
        }

        return errorEntry;
    }

    /**
     * Получить все собранные ошибки
     */
    getErrors() {
        return this.errors;
    }

    /**
     * Очистить все ошибки
     */
    clear() {
        this.errors = [];
    }

    /**
     * Получить количество ошибок
     */
    getCount() {
        return this.errors.length;
    }
}

export { ErrorCollector };
