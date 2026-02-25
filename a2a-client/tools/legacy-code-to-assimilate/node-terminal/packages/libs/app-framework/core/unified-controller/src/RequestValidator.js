
import { ConfigurationUtils } from '@libs/core/configuration'; // Обновлен импорт

/**
 * RequestValidator: Валидация входящих данных запросов с использованием ConfigurationUtils.
 */
export class RequestValidator {
    /**
     * @param {object} options - Опции для валидатора.
     * @param {ConfigurationUtils} options.configManager - Экземпляр ConfigurationUtils для загрузки и валидации схем.
     * @param {object} options.logger - Экземпляр логгера.
     */
    constructor(options = {}) {
        this.configManager = options.configManager || new ConfigurationUtils();
        this.logger = options.logger;
        if (!this.logger) {
            // Если логгер не предоставлен, используем заглушку или ConsoleLogger
            const { LoggingUtils } = require('@libs/logging-monitoring/logging'); // Динамический импорт для заглушки
            this.logger = new LoggingUtils();
            this.logger.warn("RequestValidator инициализирован без логгера. Логирование будет ограничено.");
        }
    }

    /**
     * Валидирует данные по предоставленной схеме.
     * @param {object} data - Данные для валидации.
     * @param {string} schemaName - Имя схемы, зарегистрированной в ConfigurationUtils.
     * @returns {object} - Валидированные и, возможно, преобразованные данные.
     * @throws {Error} - Если валидация не прошла.
     */
    validate(data, schemaName) {
        if (!schemaName) {
            const error = new Error("Имя схемы не указано для валидации.");
            this.logger?.error(error.message, { data, schemaName });
            throw error;
        }

        try {
            // Предполагаем, что ConfigurationUtils имеет метод validateSchema
            const validatedData = this.configManager.validateSchema(data, schemaName);
            this.logger?.debug(`Данные успешно прошли валидацию по схеме ${schemaName}.`, { data });
            return validatedData;
        } catch (error) {
            this.logger?.error(`Ошибка валидации по схеме ${schemaName}: ${error.message}`, { data, error });
            throw new Error(`Ошибка валидации данных: ${error.message}`);
        }
    }

    /**
     * Middleware для валидации запросов.
     * @param {string} schemaName - Имя схемы для валидации.
     * @returns {Function} - Middleware функция.
     */
    validationMiddleware(schemaName) {
        return async (context, next) => {
            try {
                // Валидируем параметры запроса (context.params или context.body в реальном Express)
                // В данном случае, используем context.params, так как executeRequest работает с params
                context.params = this.validate(context.params, schemaName);
                this.logger?.info(`Request validation successful for schema ${schemaName}.`, { requestId: context.requestId });
                return await next();
            } catch (error) {
                // Ошибка валидации должна быть передана в ErrorHandlerIntegration
                this.logger?.warn(`Request validation failed for schema ${schemaName}: ${error.message}`, { requestId: context.requestId, error });
                // Здесь можно сгенерировать более специфичную ошибку, например, 400 Bad Request
                const validationError = new Error(`Некорректные входные данные для маршрута: ${error.message}`);
                validationError.statusCode = 400; // Добавляем статус код для ErrorHandler
                throw validationError;
            }
        };
    }
}

