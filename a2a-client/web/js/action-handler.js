/**
 * ActionHandler - Главный модуль (делегатор) для обработки действий пользователя
 * 
 * Координирует работу трех подмодулей:
 * - ActionParser - парсинг параметров действий
 * - ActionValidator - валидация данных
 * - ActionExecutor - выполнение действий (взаимодействие с API)
 * 
 * Паттерн: Фасад (Facade) - упрощенный интерфейс для клиентов
 * 
 * Step Flow:
 * 1. Валидация результата (ActionValidator)
 * 2. Отправка на сервер (ActionExecutor)
 * 3. Парсинг ответа (ActionParser)
 * 4. Если async (promiseId) → polling (ActionExecutor)
 * 5. Если sync → возврат execute клиенту
 * 
 * Зависит от:
 * - action-parser.js
 * - action-validator.js
 * - action-executor.js
 */

(function (global) {
    'use strict';

    // Референсы на подмодули
    const Parser = global.ActionParser;
    const Validator = global.ActionValidator;
    const Executor = global.ActionExecutor;

    /**
     * Проверяет доступность подмодулей
     */
    function checkModules() {
        if (!Parser) {
            console.warn('[ActionHandler] ActionParser not loaded - some features may not work');
        }
        if (!Validator) {
            console.warn('[ActionHandler] ActionValidator not loaded - validation will be skipped');
        }
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
        if (Validator?.validateSessionId) {
            const sessionValidation = Validator.validateSessionId(sessionId);
            if (!sessionValidation.valid) {
                throw new Error(sessionValidation.error);
            }
        }
        
        // 2. Валидируем result (опционально, если есть Validator)
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
        
        // 4. Парсируем ответ (опционально, если есть Parser)
        const response = Parser?.parseResponse 
            ? Parser.parseResponse(rawResponse) 
            : rawResponse;
        
        // 5. Возвращаем обработанный ответ
        return response;
    }

    /**
     * Отправляет текстовое сообщение
     * 
     * @param {string} sessionId - ID сессии
     * @param {string|Object} message - текст сообщения или объект
     * @returns {Promise<Object>} обработанный ответ сервера
     */
    async function sendMessage(sessionId, message) {
        // Валидируем message если есть Validator
        if (Validator?.validateMessage) {
            const msgText = typeof message === 'string' ? message : (message?.content ?? String(message));
            const msgValidation = Validator.validateMessage(msgText);
            if (!msgValidation.valid) {
                throw new Error(msgValidation.error);
            }
        }
        
        return Executor.sendMessage(sessionId, message);
    }

    /**
     * Отправляет выбор пользователя
     * 
     * @param {string} sessionId - ID сессии
     * @param {string} choiceId - ID выбора
     * @param {Array} validChoices - допустимые выборы для валидации
     * @returns {Promise<Object>} обработанный ответ сервера
     */
    async function sendChoice(sessionId, choiceId, validChoices = []) {
        // Валидируем choice если есть Validator и допустимые выборы
        if (Validator?.validateChoice && validChoices.length > 0) {
            const choiceValidation = Validator.validateChoice(choiceId, validChoices);
            if (!choiceValidation.valid) {
                throw new Error(choiceValidation.error);
            }
        }
        
        return Executor.sendChoice(sessionId, choiceId);
    }

    /**
     * Проверяет статус асинхронного запроса (promise)
     * 
     * @param {string} sessionId - ID сессии
     * @param {string} promiseId - ID промиса
     * @returns {Promise<Object|null>} статус промиса
     */
    async function checkPromise(sessionId, promiseId) {
        // Валидируем promiseId если есть Validator
        if (Validator?.validatePromiseId) {
            const pidValidation = Validator.validatePromiseId(promiseId);
            if (!pidValidation.valid) {
                console.warn('[ActionHandler] Invalid promiseId:', pidValidation.error);
            }
        }
        
        return Executor.checkPromise(sessionId, promiseId);
    }

    /**
     * Запускает polling для отслеживания выполнения асинхронного запроса
     * 
     * @param {string} sessionId - ID сессии
     * @param {string} promiseId - ID промиса
     */
    function startPromisePolling(sessionId, promiseId) {
        Executor.startPromisePolling(sessionId, promiseId);
    }

    /**
     * Останавливает polling для промисов
     * 
     * @param {string} sessionId - ID сессии
     */
    function stopPromisePolling(sessionId) {
        Executor.stopPromisePolling(sessionId);
    }

    /**
     * Парсирует execute объект от сервера
     * Удобная обертка над ActionParser.parseExecute
     * 
     * @param {Object} execute - объект выполнения от сервера
     * @returns {Object} нормализованный объект
     */
    function parseExecute(execute) {
        if (!Parser?.parseExecute) {
            return execute;
        }
        return Parser.parseExecute(execute);
    }

    /**
     * Парсирует ответ сервера
     * Удобная обертка над ActionParser.parseResponse
     * 
     * @param {Object} response - ответ от сервера
     * @returns {Object} нормализованный ответ
     */
    function parseResponse(response) {
        if (!Parser?.parseResponse) {
            return response;
        }
        return Parser.parseResponse(response);
    }

    /**
     * Парсирует результат пользователя
     * Удобная обертка над ActionParser.parseResult
     * 
     * @param {Object} result - результат от пользователя
     * @returns {Object} нормализованный результат
     */
    function parseResult(result) {
        if (!Parser?.parseResult) {
            return result;
        }
        return Parser.parseResult(result);
    }

    /**
     * Валидирует данные с помощью подмодуля Validator
     * 
     * @param {string} type - тип валидации ('message'|'choice'|'sessionId'|'result'|'response')
     * @param {any} value - значение для валидации
     * @param {any} options - дополнительные опции
     * @returns {Object} результат валидации
     */
    function validate(type, value, options = {}) {
        if (!Validator) {
            return { valid: true };
        }
        
        switch (type) {
            case 'message':
                return Validator.validateMessage(value);
            case 'choice':
                return Validator.validateChoice(value, options.validChoices);
            case 'sessionId':
                return Validator.validateSessionId(value);
            case 'result':
                return Validator.validateResult(value, options.form);
            case 'response':
                return Validator.validateResponse(value);
            case 'form':
                return Validator.validateForm(value);
            case 'context':
                return Validator.validateContext(value);
            case 'promiseId':
                return Validator.validatePromiseId(value);
            default:
                return { valid: true };
        }
    }

    // Главный объект ActionHandler - точка входа
    const ActionHandler = {
        // Основные функции
        submit,
        sendMessage,
        sendChoice,
        
        // Функции для работы с промисами
        checkPromise,
        startPromisePolling,
        stopPromisePolling,
        
        // Функции парсинга
        parseExecute,
        parseResponse,
        parseResult,
        
        // Функция валидации
        validate,
        
        // Версии подмодулей для совместимости
        get Parser() { return Parser; },
        get Validator() { return Validator; },
        get Executor() { return Executor; }
    };

    // Экспорт в глобальную область видимости
    if (typeof window !== 'undefined') {
        window.ActionHandler = ActionHandler;
    }
    global.ActionHandler = ActionHandler;

})(typeof window !== 'undefined' ? window : globalThis);
