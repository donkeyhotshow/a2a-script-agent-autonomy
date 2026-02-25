const ErrorCoreManager = require('../../core/error-core');
// const { LoggingUtils } = require('../logging');

//  Удаляем заглушку для LoggingUtils, так как она теперь управляется ErrorCoreManager
// class LoggingUtils {
//   constructor(options = {}) {
//     this.level = options.level || 'info';
//   }
//   info(message) { console.log(`[INFO] ${message}`); }
//   error(message, stack) { console.error(`[ERROR] ${message}`, stack); }
//   warn(message) { console.warn(`[WARN] ${message}`); }
//   debug(message) { console.log(`[DEBUG] ${message}`); }
// }

/**
 * Глобальный обработчик ошибок для интеграции с ErrorCoreManager
 * Глобальный обработчик ошибок для интеграции с ErrorCoreManager
 */
class GlobalErrorHandler {
    constructor(options = {}) {
        this.errorCoreManager = null; // Изменено на errorCoreManager
        this.isInitialized = false;
        this.options = {
            captureUnhandledRejections: true,
            captureUncaughtExceptions: true,
            errorCoreManagerOptions: {  // Default ErrorCoreManager options
                maxErrorsPerPattern: 10,
                errorCooldown: 60000 // 1 minute
            },
            ...options
        };
        this.logger = options.logger; // Логгер будет передан в ErrorCoreManager
    }

    /**
     * Инициализация глобального обработчика
     */
    async initialize(options = {}) {
        try {
            this.logger = options.logger || this.logger; // Если логгер передан в initialize
            this.errorCoreManager = new ErrorCoreManager({
                projectRoot: process.cwd(),
                ...this.options.errorCoreManagerOptions,
                logger: this.logger // Передаем логгер в ErrorCoreManager
            });
            
            await this.errorCoreManager.initialize();
            
            // Устанавливаем глобальные обработчики
            this._setupGlobalHandlers();
            
            this.isInitialized = true;
            this.logger.info('[GlobalErrorHandler] Initialized successfully with ErrorCoreManager');
            
        } catch (error) {
            this.logger.error('[GlobalErrorHandler] Failed to initialize ErrorCoreManager:', error.message);
            throw error;
        }
    }

    /**
     * Настройка глобальных обработчиков ошибок
     */
    _setupGlobalHandlers() {
        if (this.options.captureUncaughtExceptions) {
            process.on('uncaughtException', async (error) => {
                await this._handleUncaughtException(error);
            });
        }

        if (this.options.captureUnhandledRejections) {
            process.on('unhandledRejection', async (reason, promise) => {
                await this._handleUnhandledRejection(reason, promise);
            });
        }

        // Обработчик ошибок в Express
        this._setupExpressErrorHandler();
    }

    /**
     * Обработка необработанных исключений
     */
    async _handleUncaughtException(error) {
        this.logger.error('[GlobalErrorHandler] Uncaught Exception:', error.message, { stack: error.stack });
        
        if (this.errorCoreManager) {
            await this.errorCoreManager.handleError( // Изменено на handleError
                error,
                {
                    type: 'uncaughtException',
                    timestamp: new Date().toISOString()
                },
                'process',
                'critical',
                null,
                'system' // appId
            );
        }

        // Даем время на обработку ошибки перед завершением
        setTimeout(() => {
            process.exit(1);
        }, 1000);
    }

    /**
     * Обработка необработанных промисов
     */
    async _handleUnhandledRejection(reason, promise) {
        this.logger.error('[GlobalErrorHandler] Unhandled Rejection:', reason);
        
        if (this.errorCoreManager) {
            await this.errorCoreManager.handleError( // Изменено на handleError
                reason instanceof Error ? reason : new Error(String(reason)),
                {
                    type: 'unhandledRejection',
                    promise: promise.toString(),
                    timestamp: new Date().toISOString()
                },
                'process',
                'high',
                null,
                'system' // appId
            );
        }
    }

    /**
     * Настройка обработчика ошибок для Express
     */
    _setupExpressErrorHandler() {
        // Этот метод будет вызван из Express приложения
        this.expressErrorHandler = async (error, req, res, next) => {
            this.logger.error('[GlobalErrorHandler] Express Error:', error.message, { 
                url: req.url, 
                method: req.method,
                stack: error.stack 
            });

            if (this.errorCoreManager) {
                await this.errorCoreManager.handleError( // Изменено на handleError
                    error,
                    {
                        type: 'express',
                        url: req.url,
                        method: req.method,
                        userAgent: req.get('User-Agent'),
                        ip: req.ip,
                        timestamp: new Date().toISOString()
                    },
                    'api',
                    'medium',
                    null,
                    'api' // appId
                );
            }

            // Передаем ошибку дальше для стандартной обработки
            next(error);
        };
    }

    /**
     * Получение middleware для Express
     */
    getExpressMiddleware() {
        return this.expressErrorHandler;
    }

    /**
     * Ручной сбор ошибки
     */
    async collectError(options) {
        if (!this.errorCoreManager) {
            this.logger.warn('[GlobalErrorHandler] ErrorCoreManager not initialized, logging error only');
            this.logger.error('[GlobalErrorHandler] Error:', options.error?.message || options.error);
            return null;
        }

        // Теперь collectError будет вызывать handleError новой библиотеки
        return await this.errorCoreManager.handleError(
            options.error,
            options.context,
            options.source,
            options.severity,
            options.customCode,
            options.appId
        );
    }

    /**
     * Получение статистики ошибок
     */
    getErrorStats() {
        if (!this.errorCoreManager) {
            return { totalErrors: 0, byCategory: {}, byPriority: {}, byPattern: {} };
        }

        return this.errorCoreManager.getErrorStats();
    }

    /**
     * Получение открытых задач
     */
    async getOpenTasks(options = {}) {
        if (!this.errorCoreManager) {
            return [];
        }

        return await this.errorCoreManager.getOpenTasks(options);
    }

    /**
     * Очистка старых задач
     */
    async cleanupOldTasks(options = {}) {
        if (!this.errorCoreManager) {
            return { removedTasks: 0, remainingTasks: 0 };
        }

        return await this.errorCoreManager.cleanupOldTasks(options);
    }

    /**
     * Сброс счетчиков ошибок
     */
    resetErrorCounts() {
        if (this.errorCoreManager) {
            this.errorCoreManager.resetErrorCounts();
        }
    }

    /**
     * Добавление пользовательского паттерна ошибки
     */
    addErrorPattern(code, pattern, options = {}) {
        if (this.errorCoreManager) {
            this.errorCoreManager.addPattern(code, pattern, options); // Изменено на addPattern
        }
    }
}

// Создаем глобальный экземпляр
const globalErrorHandler = new GlobalErrorHandler();

// Экспортируем экземпляр и класс
export default globalErrorHandler;
module.exports.GlobalErrorHandler = GlobalErrorHandler;
