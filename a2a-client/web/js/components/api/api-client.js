/**
 * API Client Module - базовый HTTP клиент для выполнения запросов
 */

(function (global) {
    'use strict';

    /**
     * Создать базовый API клиент
     * @returns {Object} API клиент с методами request, get, post, put, delete
     */
    function createApiClient() {
        return {
            /**
             * Выполнить HTTP запрос
             * @param {string} method - HTTP метод
             * @param {string} path - Путь запроса
             * @param {Object|null} body - Тело запроса
             * @returns {Promise<Object>} Ответ сервера
             */
            request: async function(method, path, body = null) {
                const apiBase = global.apiIntegration?.apiBase || '/api';
                const url = `${apiBase}${path}`;
                const options = { method, headers: { 'Content-Type': 'application/json' } };
                if (body) options.body = JSON.stringify(body);

                try {
                    const response = await fetch(url, options);
                    const data = await response.json().catch(() => ({}));
                    if (!response.ok) {
                        throw new Error(data?.error?.message || `Request failed: ${response.status}`);
                    }
                    return data.data || data;
                } catch (error) {
                    console.error('[ApiClient] Request error:', error);
                    throw error;
                }
            },

            /**
             * GET запрос
             * @param {string} path - Путь запроса
             * @returns {Promise<Object>} Ответ сервера
             */
            get: function(path) {
                return this.request('GET', path);
            },

            /**
             * POST запрос
             * @param {string} path - Путь запроса
             * @param {Object} body - Тело запроса
             * @returns {Promise<Object>} Ответ сервера
             */
            post: function(path, body) {
                return this.request('POST', path, body);
            },

            /**
             * PUT запрос
             * @param {string} path - Путь запроса
             * @param {Object} body - Тело запроса
             * @returns {Promise<Object>} Ответ сервера
             */
            put: function(path, body) {
                return this.request('PUT', path, body);
            },

            /**
             * DELETE запрос
             * @param {string} path - Путь запроса
             * @returns {Promise<Object>} Ответ сервера
             */
            delete: function(path) {
                return this.request('DELETE', path);
            }
        };
    }

    // Export
    global.createApiClient = createApiClient;

})(typeof window !== 'undefined' ? window : globalThis);
