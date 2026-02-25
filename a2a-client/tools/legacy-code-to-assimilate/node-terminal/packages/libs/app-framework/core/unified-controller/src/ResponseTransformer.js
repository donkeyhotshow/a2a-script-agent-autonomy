
/**
 * ResponseTransformer: Преобразование исходящих данных ответов.
 */
export class ResponseTransformer {
    /**
     * @param {object} options - Опции для трансформера.
     * @param {object} options.logger - Экземпляр логгера.
     */
    constructor(options = {}) {
        this.logger = options.logger;
        if (!this.logger) {
            console.warn("ResponseTransformer инициализирован без логгера. Логирование будет ограничено.");
        }
    }

    /**
     * Применяет трансформацию к данным ответа.
     * @param {object} data - Входящие данные ответа.
     * @param {Function} transformFn - Функция трансформации данных.
     * @returns {object} - Трансформированные данные.
     */
    transform(data, transformFn) {
        if (typeof transformFn !== 'function') {
            this.logger?.warn("transformFn не является функцией. Данные будут возвращены без изменений.");
            return data;
        }
        try {
            const transformedData = transformFn(data);
            this.logger?.debug('Данные ответа успешно трансформированы.', { original: data, transformed: transformedData });
            return transformedData;
        } catch (error) {
            this.logger?.error(`Ошибка трансформации данных ответа: ${error.message}`, { data, error });
            throw new Error(`Ошибка трансформации ответа: ${error.message}`);
        }
    }

    /**
     * Middleware для трансформации ответов.
     * @param {Function} transformFn - Функция, применяемая к результату запроса.
     * @returns {Function} - Middleware функция.
     */
    transformationMiddleware(transformFn) {
        return async (context, next) => {
            try {
                const result = await next();
                // Применяем трансформацию к результату перед его возвратом
                return this.transform(result, transformFn);
            } catch (error) {
                this.logger?.warn(`Response transformation failed: ${error.message}`, { requestId: context.requestId, error });
                // Ошибка трансформации должна быть передана в ErrorHandlerIntegration
                const transformationError = new Error(`Ошибка преобразования исходящих данных: ${error.message}`);
                transformationError.statusCode = 500; // Internal Server Error
                throw transformationError;
            }
        };
    }
}
