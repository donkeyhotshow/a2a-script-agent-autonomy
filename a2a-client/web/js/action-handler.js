/**
 * ActionHandler - Главный модуль для обработки действий пользователя
 * 
 * Упрощенная версия - только submit() для отправки результатов
 * 
 * Зависит от:
 * - action-executor.js
 */

(function (global) {
    'use strict';

    // Референс на подмодуль выполнения
    const Executor = global.ActionExecutor;

    /**
     * Проверяет доступность Executor
     */
    function checkModules() {
        if (!Executor) {
            throw new Error('[ActionHandler] ActionExecutor is required - cannot submit actions');
        }
    }

    /**
     * Основная функция отправки результата
     * Выполняет полный цикл: валидация → отправка → парсинг → обработка
     * 
     * @param {string} sessionId - ID сессии
     * @param {Object} result - результат от пользователя { message?, choice? }
     * @param {Object} options - дополнительные опции
     * @param {Object} options.form - текущая форма для валидации choice
     * @returns {Promise<Object>} обработанный ответ сервера
     */
    async function submit(sessionId, result, options = {}) {
        // Проверяем доступность модулей
        checkModules();
        
        // 1. Валидируем sessionId
        const Validator = global.ActionValidator;
        if (Validator?.validateSessionId) {
            const sessionValidation = Validator.validateSessionId(sessionId);
            if (!sessionValidation.valid) {
                throw new Error(sessionValidation.error);
            }
        }
        
        // 2. Валидируем result (опционально)
        let parsedResult = result;
        if (Validator?.validateResult && options.form) {
            const resultValidation = Validator.validateResult(result, options.form);
            if (!resultValidation.valid) {
                throw new Error(resultValidation.error);
            }
            parsedResult = resultValidation.parsed || result;
        }
        
        // 3. Отправляем на сервер через Executor
        const rawResponse = await Executor.submit(sessionId, parsedResult);
        
        // 4. Парсируем ответ (опционально)
        const Parser = global.ActionParser;
        const response = Parser?.parseResponse 
            ? Parser.parseResponse(rawResponse) 
            : rawResponse;
        
        // 5. Возвращаем обработанный ответ
        return response;
    }

    // Главный объект ActionHandler - точка входа
    const ActionHandler = {
        // Основная функция - отправка результата пользователя
        submit
    };

    // Экспорт в глобальную область видимости
    if (typeof window !== 'undefined') {
        window.ActionHandler = ActionHandler;
    }
    global.ActionHandler = ActionHandler;

})(typeof window !== 'undefined' ? window : globalThis);
