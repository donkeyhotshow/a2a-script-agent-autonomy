/**
 * AI Actions SessionManager Integration Module
 */

(function (global) {
    'use strict';

    /**
     * Добавить методы интеграции с SessionManager к классу AIActionsSessionPanel
     * @param {Function} PanelClass - класс AIActionsSessionPanel
     */
    function mixinSessionManager(PanelClass) {

        /**
         * Интегрировать с SessionManager
         * @param {Object} sessionManager - экземпляр SessionManager
         * @returns {AIActionsSessionPanel} this для чейнинга
         */
        PanelClass.prototype.integrateWithSessionManager = function(sessionManager) {
            if (!sessionManager) {
                console.warn('[AIActionsSessionPanel] SessionManager not provided');
                return this;
            }

            this.sessionManager = sessionManager;
            
            // Подписываемся на события SessionManager
            this._setupSessionManagerListeners();
            
            // Синхронизируем существующие сессии (загрузка из API при необходимости)
            this.syncWithSessionManager().catch(() => {});
            
            console.log('[AIActionsSessionPanel] Integrated with SessionManager');
            return this;
        };

        /**
         * Настроить слушателей событий SessionManager
         * @private
         */
        PanelClass.prototype._setupSessionManagerListeners = function() {
            if (!this.sessionManager) return;

            // Проверяем, является ли sessionManager EventEmitter (имеет метод .on)
            if (typeof this.sessionManager.on !== 'function') {
                console.warn('[AIActionsSessionPanel] SessionManager does not support events (.on method missing), skipping event listeners');
                return;
            }

            // Слушаем создание сессий
            this.sessionManager.on('sessionCreated', (session) => {
                const sessionId = session.id || session.sessionId;
                if (sessionId && !this.sessions.has(sessionId)) {
                    this.createSession(sessionId, {
                        title: session.title || session.name,
                        status: session.status || 'active',
                        metadata: {
                            ...session,
                            source: 'session-manager'
                        }
                    });
                }
            });

            // Слушаем загрузку сессий
            this.sessionManager.on('sessionsLoaded', (sessions) => {
                sessions.forEach(session => {
                    const sessionId = session.id || session.sessionId;
                    if (sessionId && !this.sessions.has(sessionId)) {
                        this.createSession(sessionId, {
                            title: session.title || session.name,
                            status: session.status || 'active',
                            metadata: {
                                ...session,
                                source: 'session-manager'
                            }
                        });
                    }
                });
            });

            // Слушаем удаление сессий
            this.sessionManager.on('sessionDeleted', (sessionId) => {
                if (this.sessions.has(sessionId)) {
                    this.removeSession(sessionId);
                }
            });

            // Слушаем изменение активной сессии
            this.sessionManager.on('sessionChanged', (sessionId) => {
                if (this.sessions.has(sessionId)) {
                    this.switchToSession(sessionId);
                }
            });

            // Слушаем загрузку сообщений/действий
            this.sessionManager.on('conversationLoaded', ({ sessionId, messages }) => {
                const session = this.sessions.get(sessionId);
                if (session && messages) {
                    messages.forEach(msg => {
                        this.addActionToSession(sessionId, {
                            type: msg.type || 'message',
                            content: msg.content || msg.text || msg.message,
                            role: msg.role || msg.direction,
                            timestamp: msg.timestamp || msg.createdAt,
                            status: 'completed'
                        });
                    });
                }
            });
        };

        /**
         * Синхронизировать сессии с SessionManager (загружает из API при необходимости)
         */
        PanelClass.prototype.syncWithSessionManager = async function() {
            if (!this.sessionManager) return;

            const projectId = this.sessionManager.currentProjectId
                || (typeof global !== 'undefined' && await global.ProjectManager?.getSelectedProjectId?.());
            if (projectId && typeof this.sessionManager.loadSessions === 'function') {
                await this.sessionManager.loadSessions(projectId).catch(() => {});
            }

            const sessions = this.sessionManager.sessions || [];
            sessions.forEach(session => {
                const sessionId = session.id || session.sessionId;
                if (sessionId && !this.sessions.has(sessionId)) {
                    this.createSession(sessionId, {
                        title: session.title || session.name,
                        status: session.status || 'active',
                        metadata: {
                            ...session,
                            source: 'session-manager'
                        }
                    });
                }
            });

            // Синхронизируем текущую сессию
            if (this.sessionManager.currentSessionId) {
                this.switchToSession(this.sessionManager.currentSessionId);
            }
        };

        return PanelClass;
    }

    // Export mixin
    global.mixinAISessionManager = mixinSessionManager;

})(typeof window !== 'undefined' ? window : globalThis);
