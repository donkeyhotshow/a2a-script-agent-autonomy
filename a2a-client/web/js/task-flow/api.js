/**
 * TaskFlow API Module
 * Минимальная реализация API для совместимости
 * Ранее этот файл отсутствовал, что вызывало ошибки
 */

(function (global) {
    'use strict';

    /**
     * Получить метку выбора по ID
     * @param {string} choiceId - ID выбора
     * @returns {string} Метка выбора
     */
    function getChoiceLabel(choiceId) {
        return choiceId || 'Unknown';
    }

    /**
     * Выполнить запрос к API (заглушка)
     */
    function request(method, url, data) {
        console.warn('[TaskFlowAPI] request not implemented, using fetch directly');
        return fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: data ? JSON.stringify(data) : undefined
        }).then(r => r.json());
    }

    // Экспорт
    global.TaskFlowAPI = {
        getChoiceLabel,
        request
    };

})(typeof window !== 'undefined' ? window : globalThis);
