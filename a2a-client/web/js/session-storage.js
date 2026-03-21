/**
 * SessionStorage - API для работы с хранилищем сессий
 * 
 * Содержит:
 * - SessionStorageAPI - API для создания и управления сессиями
 * 
 * Использует:
 * - Fetch API для HTTP запросов
 */

(function (global) {
    'use strict';

    /**
     * Создать API для работы с хранилищем сессий
     * @param {string} storageBase - Базовый URL API
     * @param {string} storageMode - Режим хранилища ('storage' или 'project')
     * @returns {Object} API для работы с сессиями
     */
    function createSessionStorageAPI(storageBase, storageMode) {
        
        /**
         * Выполнить fetch запрос
         * @param {string} url - URL
         * @param {Object} options - Опции fetch
         * @returns {Promise} Promise с результатом
         */
        function _fetch(url, options) {
            return fetch(url, options).then(function(resp) {
                if (!resp.ok) {
                    throw new Error('Request failed: ' + resp.status);
                }
                return resp.json();
            });
        }

        return {
            /**
             * Создать сессию с формой
             * @param {string} title - Название сессии
             * @returns {Promise<Object>} Созданная сессия
             */
            createSessionWithForm: function(title) {
                if (title == null || String(title).trim() === '') {
                    throw new Error('[SessionStorageAPI] createSessionWithForm requires non-empty title');
                }
                var headers = { 
                    'Content-Type': 'application/json', 
                    'X-Storage-Mode': storageMode 
                };
                return _fetch(storageBase, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({ title: String(title) })
                }).then(function(data) {
                    if (!data.session) throw new Error('No session data');
                    return data.session;
                });
            },

            /**
             * Получить сессию по ID
             * @param {string} sessionId - ID сессии
             * @param {string} [projectId] - ID проекта
             * @returns {Promise<Object>} Данные сессии
             */
            getSession: function(sessionId, projectId) {
                var url = storageBase + '/' + sessionId;
                var headers = { 
                    'X-Storage-Mode': storageMode 
                };
                if (projectId) {
                    headers['X-Project-Id'] = projectId;
                }
                return _fetch(url, { headers: headers });
            },

            /**
             * Получить все сессии
             * @param {string} [projectId] - ID проекта (опционально)
             * @returns {Promise<Array>} Массив сессий
             */
            getSessions: function(projectId) {
                var url = storageBase;
                if (projectId) {
                    url += '?projectId=' + encodeURIComponent(projectId);
                }
                var headers = { 
                    'X-Storage-Mode': storageMode 
                };
                return _fetch(url, { headers: headers }).then(function(data) {
                    var sessions = data.sessions !== undefined ? data.sessions : data.data;
                    if (!Array.isArray(sessions)) {
                        throw new Error('[SessionStorageAPI] getSessions: expected sessions or data array');
                    }
                    return sessions;
                });
            },

            /**
             * Обновить сессию
             * @param {string} sessionId - ID сессии
             * @param {Object} data - Данные для обновления
             * @returns {Promise<Object>} Обновленная сессия
             */
            updateSession: function(sessionId, data) {
                var url = storageBase + '/' + sessionId;
                var headers = { 
                    'Content-Type': 'application/json',
                    'X-Storage-Mode': storageMode 
                };
                return _fetch(url, {
                    method: 'PUT',
                    headers: headers,
                    body: JSON.stringify(data)
                });
            },

            /**
             * Удалить сессию
             * @param {string} sessionId - ID сессии
             * @returns {Promise<void>}
             */
            deleteSession: function(sessionId) {
                var url = storageBase + '/' + sessionId;
                var headers = { 
                    'X-Storage-Mode': storageMode 
                };
                return _fetch(url, {
                    method: 'DELETE',
                    headers: headers
                });
            },

            /**
             * Отправить следующее сообщение в сессии
             * @param {string} sessionId - ID сессии
             * @param {Object} message - Сообщение
             * @returns {Promise<Object>} Ответ сервера
             */
            sendNext: function(sessionId, message) {
                var url = storageBase + '/' + sessionId + '/next';
                var headers = { 
                    'Content-Type': 'application/json',
                    'X-Storage-Mode': storageMode 
                };
                return _fetch(url, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(message)
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
            },

            /**
             * Получить базовый URL
             * @returns {string} Базовый URL
             */
            getBaseUrl: function() {
                return storageBase;
            }
        };
    }

    // Экспорт
    global.SessionStorageAPI = {
        create: createSessionStorageAPI
    };

})(typeof window !== 'undefined' ? window : globalThis);
