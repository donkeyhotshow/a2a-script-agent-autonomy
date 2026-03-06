/**
 * AI Actions Session Panel - Session Management Module
 * Управление сессиями и действиями
 */

(function (global) {
    'use strict';

    /**
     * Добавить методы управления сессиями к классу AIActionsSessionPanel
     */
    const SessionManagement = {
        /**
         * Создать новую сессию
         * @param {string} sessionId - ID сессии (опционально)
         * @returns {string} ID созданной сессии
         */
        createSession(sessionId = null) {
            const id = sessionId || 'session-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
            const session = {
                id: id,
                status: 'active',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                actions: []
            };

            this.sessions.set(id, session);
            this.currentSessionId = id;
            
            this._renderSessionList();
            this._renderSessionContent(id);
            this._updateSessionCount();
            
            this.emit('sessionCreated', session);
            
            return id;
        },

        /**
         * Переключиться на другую сессию
         * @param {string} sessionId - ID сессии
         */
        switchToSession(sessionId) {
            if (!this.sessions.has(sessionId)) {
                console.warn(`[AIActionsSessionPanel] Session ${sessionId} not found`);
                return;
            }

            this.currentSessionId = sessionId;
            this._renderSessionList();
            this._renderSessionContent(sessionId);
            
            this.emit('sessionSwitched', sessionId);
        },

        /**
         * Добавить действие к сессии
         * @param {string} sessionId - ID сессии
         * @param {Object} action - действие
         */
        addActionToSession(sessionId, action) {
            const session = this.sessions.get(sessionId);
            if (!session) {
                console.warn(`[AIActionsSessionPanel] Session ${sessionId} not found`);
                return;
            }

            const actionWithTimestamp = {
                ...action,
                id: action.id || 'action-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
                timestamp: action.timestamp || new Date().toISOString(),
                status: action.status || 'pending'
            };

            session.actions.push(actionWithTimestamp);
            session.updatedAt = new Date().toISOString();

            // Если это текущая сессия, обновляем отображение
            if (this.currentSessionId === sessionId) {
                this._renderSessionContent(sessionId);
            }

            this._renderSessionList();
            this._updateSessionCount();
            
            this.emit('actionAdded', { sessionId, action: actionWithTimestamp });
        },

        /**
         * Обновить статус сессии
         * @param {string} sessionId - ID сессии
         * @param {string} status - статус
         */
        updateSessionStatus(sessionId, status) {
            const session = this.sessions.get(sessionId);
            if (!session) return;

            session.status = status;
            session.updatedAt = new Date().toISOString();

            this._renderSessionList();
            if (this.currentSessionId === sessionId) {
                this._renderSessionContent(sessionId);
            }
            
            this.emit('sessionStatusChanged', { sessionId, status });
        },

        /**
         * Очистить действия сессии
         * @param {string} sessionId - ID сессии
         */
        clearSessionActions(sessionId) {
            const session = this.sessions.get(sessionId);
            if (!session) return;

            session.actions = [];
            session.updatedAt = new Date().toISOString();

            if (this.currentSessionId === sessionId) {
                this._renderSessionContent(sessionId);
            }

            this._renderSessionList();
            
            this.emit('actionsCleared', sessionId);
        },

        /**
         * Удалить сессию
         * @param {string} sessionId - ID сессии
         */
        removeSession(sessionId) {
            if (!this.sessions.has(sessionId)) return;

            this.sessions.delete(sessionId);

            if (this.currentSessionId === sessionId) {
                // Переключаемся на другую сессию или очищаем отображение
                const sessions = Array.from(this.sessions.keys());
                this.currentSessionId = sessions.length > 0 ? sessions[0] : null;
            }

            this._renderSessionList();
            if (this.currentSessionId) {
                this._renderSessionContent(this.currentSessionId);
            } else {
                this._renderEmptyContent();
            }
            this._updateSessionCount();
            
            this.emit('sessionRemoved', sessionId);
        },

        /**
         * Получить все сессии
         * @returns {Array} массив сессий
         */
        getAllSessions() {
            return Array.from(this.sessions.values());
        },

        /**
         * Получить сессию по ID
         * @param {string} sessionId - ID сессии
         * @returns {Object|null} сессия
         */
        getSession(sessionId) {
            return this.sessions.get(sessionId) || null;
        },

        /**
         * Получить текущую сессию
         * @returns {Object|null} текущая сессия
         */
        getCurrentSession() {
            return this.currentSessionId ? this.sessions.get(this.currentSessionId) : null;
        },

        /**
         * Получить действия из сессии
         * @param {string} sessionId - ID сессии
         * @returns {Array} массив действий
         */
        getActionsFromSession(sessionId) {
            const session = this.sessions.get(sessionId);
            return session ? session.actions : [];
        },

        /**
         * Обновить статус действия
         * @param {string} sessionId - ID сессии
         * @param {string} actionId - ID действия
         * @param {string} status - статус
         */
        updateActionStatus(sessionId, actionId, status) {
            const session = this.sessions.get(sessionId);
            if (!session) return;

            const action = session.actions.find(a => a.id === actionId);
            if (action) {
                action.status = status;
                action.updatedAt = new Date().toISOString();
                if (this.currentSessionId === sessionId) {
                    this._renderSessionContent(sessionId);
                }
            }
        },

        /**
         * Удалить действие из сессии
         * @param {string} sessionId - ID сессии
         * @param {string} actionId - ID действия
         */
        removeActionFromSession(sessionId, actionId) {
            const session = this.sessions.get(sessionId);
            if (!session) return;

            session.actions = session.actions.filter(a => a.id !== actionId);
            session.updatedAt = new Date().toISOString();

            if (this.currentSessionId === sessionId) {
                this._renderSessionContent(sessionId);
            }
        },

        /**
         * Очистить действия из сессии
         * @param {string} sessionId - ID сессии
         */
        clearActionsFromSession(sessionId) {
            this.clearSessionActions(sessionId);
        }
    };

    // Export
    global.AIActionsSessionPanelSession = SessionManagement;

})(typeof window !== 'undefined' ? window : global);
