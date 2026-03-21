/**
 * ActionValidator - Валидация параметров действий
 * 
 * Проверяет корректность данных перед выполнением действий:
 * - Валидация результатов пользователя (message, choice)
 * - Валидация ответов сервера (execute, context)
 * - Валидация формы и выборов
 * 
 * Используется в action-handler.js для проверки данных перед отправкой
 */

(function (global) {
    'use strict';

    /**
     * Стандартные ошибки валидации
     */
    const ValidationError = {
        EMPTY_MESSAGE: 'Message cannot be empty',
        INVALID_CHOICE: 'Invalid choice selected',
        MISSING_REQUIRED_FIELD: 'Required field is missing',
        INVALID_SESSION: 'Invalid session ID',
        INVALID_RESPONSE: 'Invalid server response',
        NETWORK_ERROR: 'Network request failed'
    };

    /**
     * Проверяет, является ли строка пустой или null/undefined
     * @param {any} value - значение для проверки
     * @returns {boolean} true если пустое
     */
    function isEmpty(value) {
        return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
    }

    /**
     * Валидирует сообщение пользователя
     * @param {string} message - текст сообщения
     * @returns {Object} результат валидации { valid: boolean, error?: string }
     */
    function validateMessage(message) {
        if (isEmpty(message)) {
            return { valid: false, error: ValidationError.EMPTY_MESSAGE };
        }
        
        const messageText = typeof message === 'string' ? message : String(message);
        
        if (messageText.length > 100000) {
            return { valid: false, error: 'Message too long (max 100000 characters)' };
        }
        
        return { valid: true };
    }

    /**
     * Валидирует выбор пользователя
     * @param {string} choiceId - ID выбора
     * @param {Array} validChoices - допустимые выборы
     * @returns {Object} результат валидации { valid: boolean, error?: string }
     */
    function validateChoice(choiceId, validChoices = []) {
        if (isEmpty(choiceId)) {
            return { valid: false, error: ValidationError.INVALID_CHOICE };
        }
        
        // Если есть допустимые выборы, проверяем вхождение
        if (validChoices.length > 0) {
            const validIds = validChoices.map(c => c.id || c.value || c);
            if (!validIds.includes(choiceId) && !validIds.includes(String(choiceId))) {
                return { valid: false, error: ValidationError.INVALID_CHOICE };
            }
        }
        
        return { valid: true };
    }

    /**
     * Валидирует ID сессии
     * @param {string} sessionId - ID сессии
     * @returns {Object} результат валидации { valid: boolean, error?: string }
     */
    function validateSessionId(sessionId) {
        if (isEmpty(sessionId)) {
            return { valid: false, error: ValidationError.INVALID_SESSION };
        }
        
        // Проверяем формат ID сессии
        const sessionIdStr = String(sessionId);
        if (sessionIdStr.length < 5 || sessionIdStr.length > 200) {
            return { valid: false, error: ValidationError.INVALID_SESSION };
        }
        
        return { valid: true };
    }

    /**
     * Валидирует результат пользователя перед отправкой
     * @param {Object} result - результат от пользователя
     * @param {Object} form - текущая форма (если есть)
     * @returns {Object} результат валидации { valid: boolean, error?: string, parsed?: Object }
     */
    function validateResult(result, form = null) {
        if (!result || typeof result !== 'object') {
            return { valid: false, error: 'Invalid result format' };
        }
        
        // Проверяем наличие либо message, либо choice
        const hasMessage = !isEmpty(result.message);
        const hasChoice = !isEmpty(result.choice);
        
        if (!hasMessage && !hasChoice) {
            return { valid: false, error: 'Result must contain either message or choice' };
        }
        
        // Валидируем сообщение если есть
        if (hasMessage) {
            const msgValidation = validateMessage(result.message);
            if (!msgValidation.valid) {
                return msgValidation;
            }
        }
        
        // Валидируем выбор если есть
        if (hasChoice && form && form.choices) {
            const choiceValidation = validateChoice(result.choice, form.choices);
            if (!choiceValidation.valid) {
                return choiceValidation;
            }
        }
        
        return { 
            valid: true, 
            parsed: {
                message: hasMessage ? String(result.message).trim() : null,
                choice: hasChoice ? String(result.choice) : null
            }
        };
    }

    /**
     * Валидирует ответ сервера
     * @param {Object} response - ответ от сервера
     * @returns {Object} результат валидации { valid: boolean, error?: string }
     */
    function validateResponse(response) {
        if (!response) {
            return { valid: false, error: ValidationError.INVALID_RESPONSE };
        }
        
        // Проверяем HTTP статус
        if (response.error) {
            return { 
                valid: false, 
                error: response.error?.message || response.error?.code || 'Server error' 
            };
        }
        
        const hasExecute = response.execute && typeof response.execute === 'object';
        const hasAsync = response.asyncPending === true || !isEmpty(response.promiseId);

        if (!hasExecute && !hasAsync) {
            console.warn('[ActionValidator] Response has no execute, asyncPending, or promiseId');
        }
        
        return { valid: true };
    }

    /**
     * Валидирует форму
     * @param {Object} form - объект формы
     * @returns {Object} результат валидации { valid: boolean, error?: string }
     */
    function validateForm(form) {
        if (!form) {
            return { valid: true }; // Форма опциональна
        }
        
        if (typeof form !== 'object') {
            return { valid: false, error: 'Form must be an object' };
        }
        
        // Проверяем choices если есть
        if (form.choices && !Array.isArray(form.choices)) {
            return { valid: false, error: 'Form choices must be an array' };
        }
        
        // Проверяем input если есть
        if (form.input && typeof form.input !== 'object') {
            return { valid: false, error: 'Form input must be an object' };
        }
        
        return { valid: true };
    }

    /**
     * Валидирует контекст
     * @param {Object} context - контекст сессии
     * @returns {Object} результат валидации { valid: boolean, error?: string }
     */
    function validateContext(context) {
        if (!context) {
            return { valid: true }; // Контекст опционален
        }
        
        if (typeof context !== 'object') {
            return { valid: false, error: 'Context must be an object' };
        }
        
        return { valid: true };
    }

    /**
     * Валидирует promiseId
     * @param {string} promiseId - ID промиса
     * @returns {Object} результат валидации { valid: boolean, error?: string }
     */
    function validatePromiseId(promiseId) {
        if (isEmpty(promiseId)) {
            return { valid: false, error: 'Promise ID is required' };
        }
        
        const pidStr = String(promiseId);
        if (pidStr.length < 5 || pidStr.length > 200) {
            return { valid: false, error: 'Invalid Promise ID format' };
        }
        
        return { valid: true };
    }

    /**
     * Валидирует данные для отправки на сервер
     * @param {Object} data - данные для отправки
     * @returns {Object} результат валидации { valid: boolean, error?: string }
     */
    function validateRequestData(data) {
        if (!data || typeof data !== 'object') {
            return { valid: false, error: 'Request data must be an object' };
        }
        
        if (!data.result && data.result !== null) {
            return { valid: false, error: 'Request must contain result' };
        }
        
        return { valid: true };
    }

    // Экспорт модуля
    const ActionValidator = {
        ValidationError,
        isEmpty,
        validateMessage,
        validateChoice,
        validateSessionId,
        validateResult,
        validateResponse,
        validateForm,
        validateContext,
        validatePromiseId,
        validateRequestData
    };

    if (typeof window !== 'undefined') {
        window.ActionValidator = ActionValidator;
    }
    global.ActionValidator = ActionValidator;

})(typeof window !== 'undefined' ? window : globalThis);
