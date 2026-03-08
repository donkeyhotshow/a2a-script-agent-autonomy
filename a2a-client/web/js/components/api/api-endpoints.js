/**
 * API Endpoints Module - определения эндпоинтов API
 */

(function (global) {
    'use strict';

    /**
     * API Endpoints - константы для всех доступных эндпоинтов
     */
    var API_ENDPOINTS = {
        // Сессии
        SESSIONS: '/sessions',
        SESSION_BY_ID: function(sessionId) { return `/sessions/${sessionId}`; },
        SESSION_RESULT: function(sessionId) { return `/sessions/${sessionId}/result`; },
        
        // Терминал
        TERMINAL_EXECUTE: '/terminal/execute',
        
        // Проекты
        PROJECTS: '/projects',
        PROJECT_FILES: function(projectId, filePath) { 
            return `/projects/${projectId}/files/${filePath.split('/').map(encodeURIComponent).join('/')}`; 
        },
        
        // RAG поиск
        RAG_SEARCH: '/rag/search',
        SEARCH_ACTIONS: '/actions/search'
    };

    /**
     * Создать URL для эндпоинта
     * @param {string} endpoint - Имя эндпоинта
     * @param {...string|number} params - Параметры для подстановки
     * @returns {string} Полный URL
     */
    function buildEndpointUrl(endpoint, ...params) {
        var endpointDef = API_ENDPOINTS[endpoint];
        if (!endpointDef) {
            console.warn('[ApiEndpoints] Unknown endpoint:', endpoint);
            return endpoint;
        }
        if (typeof endpointDef === 'function') {
            return endpointDef(...params);
        }
        return endpointDef;
    }

    // Export
    global.API_ENDPOINTS = API_ENDPOINTS;
    global.buildEndpointUrl = buildEndpointUrl;

})(typeof window !== 'undefined' ? window : globalThis);
