/**
 * ProjectStore - Управление проектами
 * 
 * Содержит:
 * - ProjectStoreAPI - API для работы с проектами
 * 
 * Примечание: Полный функционал управления проектами доступен в app/project-manager.js
 * Этот модуль предоставляет упрощенный API для совместимости с session-store
 */

(function (global) {
    'use strict';

    const STORAGE_KEY = 'a2a_selected_project';

    /**
     * Получить выбранный проект из storage
     * @returns {string|null} ID проекта
     */
    function getStoredProjectId() {
        try {
            return localStorage.getItem(STORAGE_KEY);
        } catch (e) {
            console.warn('[ProjectStore] localStorage getItem failed:', e);
            return null;
        }
    }

    /**
     * Сохранить выбранный проект в storage
     * @param {string} projectId - ID проекта
     */
    function setStoredProjectId(projectId) {
        try {
            if (projectId) {
                localStorage.setItem(STORAGE_KEY, projectId);
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch (e) {
            console.warn('[ProjectStore] Failed to save project:', e);
        }
    }

    /**
     * Создать API для работы с проектами
     * @returns {Object} API проектов
     */
    function createProjectStore() {
        var selectedProjectId = getStoredProjectId();

        /**
         * Get apiIntegration instance - unified HTTP client
         */
        function getApi() {
            if (!global.apiIntegration) {
                throw new Error('[ProjectStore] apiIntegration not loaded');
            }
            return global.apiIntegration;
        }

        return {
            /**
             * Получить список проектов
             * @returns {Promise<Array>} Массив проектов
             */
            getProjects: function() {
                return getApi().getProjects().then(function(data) {
                    if (Array.isArray(data)) return data;
                    var list = data.projects !== undefined ? data.projects : data.data;
                    if (!Array.isArray(list)) {
                        throw new Error('[ProjectStore] getProjects: expected array or projects/data array');
                    }
                    return list;
                });
            },

            /**
             * Получить проект по ID
             * @param {string} projectId - ID проекта
             * @returns {Promise<Object>} Данные проекта
             */
            getProject: function(projectId) {
                return getApi().request('GET', 'projects/' + encodeURIComponent(projectId));
            },

            /**
             * Создать проект
             * @param {Object|string} params - Параметры проекта или имя
             * @returns {Promise<Object>} Созданный проект
             */
            createProject: function(params) {
                var body;
                if (typeof params === 'string') {
                    if (!String(params).trim()) {
                        throw new Error('[ProjectStore] createProject: non-empty name string required');
                    }
                    body = { name: params };
                } else {
                    if (!params || typeof params !== 'object') {
                        throw new Error('[ProjectStore] createProject: params object or name string required');
                    }
                    body = params;
                }
                return getApi().request('POST', 'projects', body);
            },

            /**
             * Удалить проект
             * @param {string} projectId - ID проекта
             * @returns {Promise<void>}
             */
            deleteProject: function(projectId) {
                return getApi().request('DELETE', 'projects/' + encodeURIComponent(projectId));
            },

            /**
             * Получить ID выбранного проекта
             * @returns {string|null} ID проекта
             */
            getSelectedProjectId: function() {
                return selectedProjectId;
            },

            /**
             * Установить выбранный проект
             * @param {string|null} projectId - ID проекта
             */
            setSelectedProjectId: function(projectId) {
                selectedProjectId = projectId;
                setStoredProjectId(projectId);
            },

            /**
             * Проверить, есть ли выбранный проект
             * @returns {boolean}
             */
            hasSelectedProject: function() {
                return !!selectedProjectId;
            }
        };
    }

    // Экспорт
    global.ProjectStore = createProjectStore();

})(typeof window !== 'undefined' ? window : globalThis);
