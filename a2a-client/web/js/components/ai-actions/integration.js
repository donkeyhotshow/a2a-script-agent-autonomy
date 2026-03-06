/**
 * AI Actions Session Panel - Integration Module
 * Интеграция с SessionManager и persistence
 */

(function (global) {
    'use strict';

    /**
     * Модуль интеграции
     */
    const Integration = {
        /**
         * Интегрировать с SessionManager
         * @param {Object} sessionManager - менеджер сессий
         */
        integrateWithSessionManager(sessionManager) {
            if (!sessionManager) {
                console.warn('[AIActionsSessionPanel] SessionManager not provided');
                return;
            }

            this.sessionManager = sessionManager;
            this._setupSessionManagerListeners();
        },

        /**
         * Настроить слушатели SessionManager
         * @private
         */
        _setupSessionManagerListeners() {
            if (!this.sessionManager) return;

            // Слушаем создание новой сессии
            this.sessionManager.on('sessionCreated', (session) => {
                const sessionId = session.id || session.sessionId;
                if (sessionId && !this.sessions.has(sessionId)) {
                    this.createSession(sessionId);
                }
            });

            // Слушаем удаление сессии
            this.sessionManager.on('sessionDeleted', (sessionId) => {
                if (this.sessions.has(sessionId)) {
                    this.removeSession(sessionId);
                }
            });

            // Слушаем обновление списка сессий
            this.sessionManager.on('sessionsLoaded', (sessions) => {
                sessions.forEach(session => {
                    const sessionId = session.id || session.sessionId;
                    if (sessionId && !this.sessions.has(sessionId)) {
                        this.createSession(sessionId);
                    }
                });
            });

            // Слушаем загрузку истории сообщений
            this.sessionManager.on('conversationLoaded', ({ sessionId, messages }) => {
                const session = this.sessions.get(sessionId);
                if (session && messages) {
                    messages.forEach(msg => {
                        // Convert message to action if it has relevant data
                        if (msg.execute) {
                            this.processExecute(msg.execute, msg.context);
                        }
                    });
                }
            });
        },

        /**
         * Синхронизировать с SessionManager
         */
        syncWithSessionManager() {
            if (!this.sessionManager) return;

            // Загружаем сессии из SessionManager
            const sessions = this.sessionManager.sessions || [];
            sessions.forEach(session => {
                const sessionId = session.id || session.sessionId;
                if (sessionId && !this.sessions.has(sessionId)) {
                    this.createSession(sessionId);
                }
            });

            // Синхронизируем текущую сессию
            if (this.sessionManager.currentSessionId) {
                this.switchToSession(this.sessionManager.currentSessionId);
            }
        },

        // ==================== Persistence ====================

        /**
         * Экспортировать сессию
         * @param {string} sessionId - ID сессии
         */
        exportSession(sessionId) {
            const session = this.sessions.get(sessionId);
            if (!session) return;

            const dataStr = JSON.stringify(session, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            const url = URL.createObjectURL(dataBlob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `session-${sessionId}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },

        /**
         * Импортировать сессию
         * @param {Object} data - данные сессии
         */
        importSession(data) {
            if (!data || !data.id) {
                console.warn('[AIActionsSessionPanel] Invalid session data for import');
                return;
            }

            const sessionId = data.id;
            this.sessions.set(sessionId, {
                ...data,
                importedAt: new Date().toISOString()
            });

            if (!this.currentSessionId) {
                this.currentSessionId = sessionId;
            }

            this._renderSessionList();
            this._renderSessionContent(sessionId);
            this._updateSessionCount();

            this.emit('sessionImported', data);
        },

        /**
         * Экспортировать все сессии
         * @returns {Array} массив сессий
         */
        exportAllSessions() {
            return Array.from(this.sessions.values());
        },

        /**
         * Сохранить все сессии
         * Note: Sessions are now server-side only, no local persistence
         */
        async save() {
            // No-op: sessions persisted on server only
            console.log('[AIActionsSessionPanel] Sessions server-side only');
        },

        /**
         * Загрузить сессии
         * Note: Sessions loaded from server via API, no local loading
         */
        async load() {
            // Sessions loaded via SessionManager/API, not from local storage
            console.log('[AIActionsSessionPanel] Sessions loaded via API');
        },

        /**
         * Сохранить текущую сессию
         * Note: Current session tracked in memory only
         */
        async saveCurrentSession() {
            // No-op: current session tracked in memory, server handles persistence
        }
    };

    // Export
    global.AIActionsSessionPanelIntegration = Integration;

})(typeof window !== 'undefined' ? window : global);
