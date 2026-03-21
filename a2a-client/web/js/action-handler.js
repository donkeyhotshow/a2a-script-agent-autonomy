/**
 * ActionHandler - Главный модуль для обработки действий пользователя
 * 
 * Упрощенная версия - только submit() для отправки результатов
 */

(function (global) {
    'use strict';

    /**
     * Основная функция отправки результата
     * Выполняет отправку через ActionExecutor
     * 
     * @param {string} sessionId - ID сессии
     * @param {Object} result - результат от пользователя { message?, choice? }
     * @returns {Promise<Object>} ответ сервера
     */
    async function submit(sessionId, result) {
        const Executor = global.ActionExecutor;
        if (!Executor) {
            throw new Error('[ActionHandler] ActionExecutor is required');
        }
        
        return Executor.submit(sessionId, result);
    }

    // Главный объект ActionHandler - точка входа
    const ActionHandler = {
        submit,
        
        // Удобные методы-алиасы
        sendMessage: async function(sessionId, message) {
            return submit(sessionId, { message });
        },
        
        sendChoice: async function(sessionId, choiceId) {
            return submit(sessionId, { choice: choiceId });
        }
    };

    // Экспорт в глобальную область видимости
    if (typeof window !== 'undefined') {
        window.ActionHandler = ActionHandler;
    }
    global.ActionHandler = ActionHandler;

})(typeof window !== 'undefined' ? window : globalThis);
