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
        const base = global.apiIntegration?.apiBase || '/api';
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

    // Fetch with timeout and retry logic
    const DEFAULT_TIMEOUT = 15000; // 15 seconds for API calls
    const MAX_RETRIES = 3;
    const BASE_DELAY = 1000;

    /**
     * Выполнить запрос с повторными попытками
     * @param {string} url - URL для запроса
     * @param {Object} options - параметры fetch
     * @param {number} retryCount - номер попытки
     */
    async function fetchWithRetry(url, options = {}, retryCount = 0) {
        const controller = new AbortController();
        const timeout = options.timeout || DEFAULT_TIMEOUT;
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers: { ...getHeaders(), ...options.headers }
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            // Retry on network error or timeout
            if (retryCount < MAX_RETRIES && (error.name === 'AbortError' || error.message.includes('network'))) {
                const delay = BASE_DELAY * Math.pow(2, retryCount);
                console.warn(`[TaskFlow] Retry ${retryCount + 1}/${MAX_RETRIES} after ${delay}ms: ${url}`);
                await new Promise(r => setTimeout(r, delay));
                return fetchWithRetry(url, options, retryCount + 1);
            }
            throw error;
        }
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
            const res = await fetchWithRetry(url, options);
            const data = await res.json().catch(() => ({}));
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
        const execute = TaskFlow?._lastResponse?.execute;
        const choices = execute?.form?.choices || [];
        const match = choices.find(choice => choice.id === choiceId || choice.value === choiceId);
        return String(match?.label || match?.value || match?.id || choiceId);
    }

    // Export
    global.TaskFlowAPI = {
        getApiBase,
        getHeaders,
        fetchWithRetry,
        request,
        getChoiceLabel,
        DEFAULT_TIMEOUT,
        MAX_RETRIES
    };

})(typeof window !== 'undefined' ? window : global);
