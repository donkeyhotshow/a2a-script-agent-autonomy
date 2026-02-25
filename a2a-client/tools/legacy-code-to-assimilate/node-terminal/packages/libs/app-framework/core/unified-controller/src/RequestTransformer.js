
/**
 * RequestTransformer: Преобразование входящих данных запросов.
 */
export class RequestTransformer {
    /**
     * @param {object} options - Опции для трансформера.
     * @param {object} options.logger - Экземпляр логгера.
     */
    constructor(options = {}) {
        this.logger = options.logger;
        if (!this.logger) {
            console.warn("RequestTransformer инициализирован без логгера. Логирование будет ограничено.");
        }
    }

    /**
     * Применяет трансформацию к данным запроса.
     * @param {object} data - Входящие данные запроса.
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
            this.logger?.debug('Данные запроса успешно трансформированы.', { original: data, transformed: transformedData });
            return transformedData;
        } catch (error) {
            this.logger?.error(`Ошибка трансформации данных запроса: ${error.message}`, { data, error });
            throw new Error(`Ошибка трансформации запроса: ${error.message}`);
        }
    }

    /**
     * Middleware для трансформации запросов.
     * @param {Function} transformFn - Функция, применяемая к контексту запроса (context.params).
     * @returns {Function} - Middleware функция.
     */
    transformationMiddleware(transformFn) {
        return async (context, next) => {
            try {
                context.params = this.transform(context.params, transformFn);
                this.logger?.info('Request transformation successful.', { requestId: context.requestId });
                return await next();
            } catch (error) {
                this.logger?.warn(`Request transformation failed: ${error.message}`, { requestId: context.requestId, error });
                // Ошибка трансформации должна быть передана в ErrorHandlerIntegration
                const transformationError = new Error(`Ошибка преобразования входных данных: ${error.message}`);
                transformationError.statusCode = 400; // Bad Request
                throw transformationError;
            }
        };
    }
}
