/**
 * AI Actions API Module - интеграция с API и выполнение действий
 * 
 * Модульная структура:
 * - api-client.js - базовый HTTP клиент
 * - api-endpoints.js - определения эндпоинтов
 * - api-request.js - построение запросов
 * - api-response.js - обработка ответов
 * - api-client-actions.js - выполнение клиентских действий
 */

(function (global) {
    'use strict';

    /**
     * Интеграция с Web API для отправки результатов
     * @private
     */
    function setupWebAPIIntegration(panel) {
        // Подписка на глобальные события от WebApiClient
        if (global.webApiClient) {
            // Слушаем события выбора choice
            global.webApiClient.on('choiceSelected', async (data) => {
                if (data?.sessionId && data?.result) {
                    await panel._sendResultToServer(data.sessionId, data.result);
                }
            });
        }

        // Также слушаем глобальные события от aiActionsPanel
        if (global.aiActionsPanel) {
            global.aiActionsPanel.on('choiceSelected', async (data) => {
                if (data?.sessionId && data?.result) {
                    await panel._sendResultToServer(data.sessionId, data.result);
                }
            });
        }
    }

    /**
     * Добавить методы API к классу AIActionsSessionPanel
     * @param {Function} PanelClass - класс AIActionsSessionPanel
     */
    function mixinAPI(PanelClass) {
        
        // Интеграция с Web API для отправки результатов
        PanelClass.prototype._setupWebAPIIntegration = function() {
            setupWebAPIIntegration(this);
        };

        /**
         * Выполнить HTTP запрос
         * @private
         */
        PanelClass.prototype._request = async function(method, path, body = null) {
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
                console.error('[AIActionsSessionPanel] Request error:', error);
                throw error;
            }
        };

        // Применяем миксины из модулей
        if (typeof global.mixinApiRequest === 'function') {
            PanelClass = global.mixinApiRequest(PanelClass);
        }

        if (typeof global.mixinApiResponse === 'function') {
            PanelClass = global.mixinApiResponse(PanelClass);
        }

        if (typeof global.mixinClientActions === 'function') {
            PanelClass = global.mixinClientActions(PanelClass);
        }

        return PanelClass;
    }

    // Export mixin
    global.mixinAIAPI = mixinAPI;

})(typeof window !== 'undefined' ? window : globalThis);
