/**
 * TaskFlow API Module
 * Функции для HTTP запросов к серверу
 */

(function (global) {
    'use strict';

    /**
     * Получить базовый URL API
     */
    function getApiBase() {
        const store = (typeof window !== 'undefined' ? window : global).SessionStore;
        if (!store || typeof store.getStorageMode !== 'function') {
            throw new Error('[TaskFlowAPI] SessionStore with getStorageMode() required');
        }
        const storageMode = store.getStorageMode();
        if (storageMode === 'storage') {
            return '/api/a2a';
        }
        const base = global.apiIntegration?.apiBase;
        if (typeof base !== 'string' || base.length === 0) {
            throw new Error('[TaskFlowAPI] apiIntegration.apiBase required when storageMode is not "storage"');
        }
        return String(base).replace(/\/?$/, '');
    }

    /**
     * Получить заголовки для запросов
     */
    function getHeaders() {
        const h = { 'Content-Type': 'application/json' };
        const cfg = window.apiIntegration?.token;
        if (cfg) h['Authorization'] = 'Bearer ' + cfg;
        return h;
    }



    /**
     * Выполнить HTTP запрос
     * @param {string} method - HTTP метод
     * @param {string} path - путь
     * @param {Object} body - тело запроса
     */
    async function request(method, path, body = null) {
        const base = getApiBase();
        const url = path.startsWith('http')
            ? path
            : (path.startsWith('/') ? `${base}${path}` : `${base}/${path}`);
        const options = {
            method,
            headers: getHeaders()
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        try {
            const res = await window.fetchWithRetry(url, options);
            const data = await res.json().catch(e => {
                console.error('[TaskFlow] JSON parse error:', e);
                throw e;
            });
            if (!res.ok) {
                // Try to extract error message
                const errMsg = data?.error?.message || data?.error || data?.message || `HTTP ${res.status}`;
                console.error('[TaskFlow] Request failed:', errMsg, { module: 'TaskFlow', path: url, method });
                const err = new Error(errMsg);
                err.status = res.status;
                err.data = data;
                throw err;
            }
            return data;
        } catch (error) {
            console.error('[TaskFlow] Request error:', error);
            throw error;
        }
    }

    /**
     * Получить ID выбора по ID
     * @param {string} choiceId - ID выбора
     */
    function getChoiceLabel(choiceId) {
        if (!choiceId) return '';
        const TaskFlow = global.TaskFlow;
        if (!TaskFlow?._lastResponse) {
            console.warn('[TaskFlow] getChoiceLabel: no _lastResponse, using choiceId fallback');
            return String(choiceId);
        }
        const execute = TaskFlow._lastResponse.execute;
        const choices = execute?.form?.choices || [];
        const match = choices.find(choice => choice.id === choiceId);
        return String(match?.label || match?.id || choiceId);
    }

    // Export
    global.TaskFlowAPI = {
        getApiBase,
        getHeaders,
        request,
        getChoiceLabel
    };

})(typeof window !== 'undefined' ? window : global);
