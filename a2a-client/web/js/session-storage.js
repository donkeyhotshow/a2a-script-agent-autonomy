/**
 * SessionStorage - API для работы с хранилищем сессий
 * 
 * Теперь использует apiIntegration вместо дублирующей логики fetch
 * Содержит:
 * - SessionStorageAPI - адаптер для совместимости с SessionStore
 */

(function (global) {
    'use strict';

    /**
     * Создать API для работы с хранилищем сессий
     * Делегирует в apiIntegration для избежания дублирования fetch логики
     * @param {string} storageBase - Базовый URL API (игнорируется, используется apiIntegration)
     * @param {string} storageMode - Режим хранилища ('storage' или 'project')
     * @returns {Object} API для работы с сессиями
     */
    function createSessionStorageAPI(storageBase, storageMode) {
        // Получаем apiIntegration (может быть ещё не загружен - будет позже)
        const getApi = () => {
            if (!global.apiIntegration) {
                console.warn('[SessionStorageAPI] apiIntegration not yet available, using fallback');
                return null;
            }
            return global.apiIntegration;
        };

        return {
            /**
             * Создать сессию с формой
             * @param {string} title - Название сессии
             * @returns {Promise<Object>} Созданная сессия
             */
            createSessionWithForm: async function(title) {
                const api = getApi();
                if (api?.createSession) {
                    return api.createSession({ title });
                }
                throw new Error('[SessionStorageAPI] apiIntegration.createSession not available');
            },

            /**
             * Получить сессию по ID
             * @param {string} sessionId - ID сессии
             * @param {string} [projectId] - ID проекта
             * @returns {Promise<Object>} Данные сессии
             */
            getSession: async function(sessionId, projectId) {
                const api = getApi();
                if (api?.getSession) {
                    return api.getSession(sessionId, { projectId });
                }
                throw new Error('[SessionStorageAPI] apiIntegration.getSession not available');
            },

            /**
             * Получить все сессии
             * @param {string} [projectId] - ID проекта (опционально)
             * @returns {Promise<Array>} Массив сессий
             */
            getSessions: async function(projectId) {
                const api = getApi();
                if (api?.getSessions) {
                    return api.getSessions(projectId);
                }
                throw new Error('[SessionStorageAPI] apiIntegration.getSessions not available');
            },

            /**
             * Удалить сессию
             * @param {string} sessionId - ID сессии
             * @returns {Promise<void>}
             */
            deleteSession: async function(sessionId) {
                const api = getApi();
                if (api?.deleteSession) {
                    return api.deleteSession(sessionId);
                }
                throw new Error('[SessionStorageAPI] apiIntegration.deleteSession not available');
            },

            /**
             * Отправить следующее сообщение в сессии
             * @param {string} sessionId - ID сессии
             * @param {Object} message - Сообщение
             * @returns {Promise<Object>} Ответ сервера
             */
            sendNext: async function(sessionId, message) {
                // Use unified apiIntegration client with storage mode header
                const api = getApi();
                return api.request('POST', 'sessions/' + encodeURIComponent(sessionId) + '/next', message, {
                    headers: { 'X-Storage-Mode': storageMode }
                });
            },

            /**
             * Получить текущий режим хранилища
             * @returns {string} Режим хранилища
             */
            getStorageMode: function() {
                return storageMode;
            },

            /**
             * Установить режим хранилища
             * @param {string} mode - Новый режим
             */
            setStorageMode: function(mode) {
                storageMode = mode;
            }
        };
    }

    // Экспорт - фабрика для SessionStore
    global.SessionStorageAPI = {
        create: createSessionStorageAPI
    };

})(typeof window !== 'undefined' ? window : globalThis);
