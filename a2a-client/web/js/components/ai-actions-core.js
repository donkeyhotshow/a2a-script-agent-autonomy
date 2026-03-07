/**
 * AI Actions Core Module - основной класс панели AI Actions
 * Содержит: конструктор, инициализация, события, управление сессиями
 */

(function (global) {
    'use strict';

    /**
     * AIActionsSessionPanel - класс для управления сессионной панелью AI actions
     */
    class AIActionsSessionPanel {
        /**
         * @param {HTMLElement} container - DOM элемент панели
         * @param {Object} options - настройки
         * @param {string} options.id - ID панели
         * @param {string} options.slot - слот (floating, left, right, bottom)
         * @param {boolean} options.critical - критическая панель
         * @param {Function} options.onClose - колбэк при закрытии
         * @param {Function} options.onStateChange - колбэк при изменении состояния
         * @param {HTMLElement} options.zonesContainer - контейнер зон для dock
         */
        constructor(container, options = {}) {
            this.container = container;
            this.id = options.id || container.dataset.panelId || 'ai-actions-panel-' + Math.random().toString(36).slice(2, 9);
            this.slot = options.slot || 'floating';
            this.critical = !!options.critical;
            this.onClose = options.onClose || (() => {});
            this.onStateChange = options.onStateChange || (() => {});
            this.zonesContainer = options.zonesContainer || null;
            
            // Состояние сессий
            this.sessions = new Map(); // sessionId -> session data
            this.currentSessionId = null;
            this.state = 'expanded';
            
            // FloatingPanel instance
            this.floatingPanel = null;
            
            // Event listeners
            this._listeners = new Map();
            this._deferredInit = false;

            this._init();

            // If deferred, set up retry when FloatingPanel becomes available
            if (this._deferredInit) {
                this._retryInit();
            }
        }

        /**
         * Retry initialization when FloatingPanel becomes available
         * @private
         */
        _retryInit() {
            const checkAndInit = () => {
                if (typeof FloatingPanel !== 'undefined' && this._deferredInit) {
                    console.log('[AIActionsSessionPanel] FloatingPanel now available, completing initialization');
                    this._init();
                    if (!this._deferredInit) {
                        // Successfully initialized
                        if (this.onStateChange) {
                            this.onStateChange(this.state);
                        }
                    }
                }
            };

            // Check immediately and periodically
            checkAndInit();
            const interval = setInterval(() => {
                checkAndInit();
                if (!this._deferredInit) {
                    clearInterval(interval);
                }
            }, 500);

            // Stop trying after 10 seconds
            setTimeout(() => clearInterval(interval), 10000);
        }

        /**
         * Подписаться на событие
         * @param {string} event - Название события
         * @param {Function} callback - Обработчик
         */
        on(event, callback) {
            if (!this._listeners.has(event)) {
                this._listeners.set(event, new Set());
            }
            this._listeners.get(event).add(callback);
            return () => this.off(event, callback);
        }

        /**
         * Отписаться от события
         * @param {string} event - Название события
         * @param {Function} callback - Обработчик
         */
        off(event, callback) {
            this._listeners.get(event)?.delete(callback);
        }

        /**
         * Emit событие
         * @param {string} event - Название события
         * @param {Object} data - Данные
         */
        emit(event, data) {
            this._listeners.get(event)?.forEach(cb => {
                try {
                    cb(data);
                } catch (e) {
                    console.error('[AIActionsSessionPanel] Event handler error:', e);
                }
            });
        }

        /**
         * Инициализация панели
         * @private
         */
        _init() {
            // Check if FloatingPanel is available
            if (typeof FloatingPanel === 'undefined') {
                console.warn('[AIActionsSessionPanel] FloatingPanel not available, deferring initialization');
                this._deferredInit = true;
                return;
            }
            this._deferredInit = false;

            // Создаем FloatingPanel для управления состоянием
            this.floatingPanel = new FloatingPanel(this.container, {
                id: this.id,
                slot: this.slot,
                critical: this.critical,
                onClose: () => this.onClose(this),
                onStateChange: (state) => {
                    this.state = state;
                    this.onStateChange(state);
                },
                zonesContainer: this.zonesContainer
            });

            // Устанавливаем тип панели
            this.floatingPanel.setType('sessions');
            
            // Рендерим содержимое
            this._render();
            
            // Добавляем обработчики событий
            this._bindEvents();
            
            // Подписываемся на события выбора choice из Web API
            this._setupWebAPIIntegration();
        }

        /**
         * Создать новую сессию
         * @param {string} sessionId - ID сессии (если не указан, генерируется автоматически)
         * @returns {string} ID созданной сессии
         */
        createSession(sessionId = null) {
            const id = sessionId || 'session-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
            const session = {
                id: id,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                status: 'active',
                actions: [],
                metadata: {
                    type: 'ai-actions',
                    version: '1.0'
                }
            };

            this.sessions.set(id, session);
            this.currentSessionId = id;
            
            this._renderSessionList();
            this._renderSessionContent(id);
            this._updateSessionCount();
            
            return id;
        }

        /**
         * Переключиться на сессию
         * @param {string} sessionId
         */
        switchToSession(sessionId) {
            if (!this.sessions.has(sessionId)) {
                console.warn(`[AIActionsSessionPanel] Session ${sessionId} not found`);
                return;
            }
            
            this.currentSessionId = sessionId;
            this._renderSessionContent(sessionId);
        }

        /**
         * Добавить действие в сессию
         * @param {string} sessionId
         * @param {Object} action - действие AI action
         */
        addActionToSession(sessionId, action) {
            const session = this.sessions.get(sessionId);
            if (!session) {
                console.warn(`[AIActionsSessionPanel] Session ${sessionId} not found`);
                return;
            }

            const actionWithTimestamp = {
                ...action,
                timestamp: new Date().toISOString(),
                id: 'action-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
            };

            session.actions.push(actionWithTimestamp);
            session.updatedAt = new Date().toISOString();
            
            // Если это текущая сессия, обновляем отображение
            if (this.currentSessionId === sessionId) {
                this._renderSessionContent(sessionId);
            }
        }

        /**
         * Обновить статус сессии
         * @param {string} sessionId
         * @param {string} status - active, completed, failed, cancelled
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
        }

        /**
         * Очистить действия сессии
         * @param {string} sessionId
         */
        clearSessionActions(sessionId) {
            const session = this.sessions.get(sessionId);
            if (!session) return;

            session.actions = [];
            session.updatedAt = new Date().toISOString();
            
            if (this.currentSessionId === sessionId) {
                this._renderSessionContent(sessionId);
            }
        }

        /**
         * Удалить сессию
         * @param {string} sessionId
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
        }

        /**
         * Получить все сессии
         * @returns {Array} массив сессий
         */
        getAllSessions() {
            return Array.from(this.sessions.values());
        }

        /**
         * Получить сессию по ID
         * @param {string} sessionId
         * @returns {Object|null}
         */
        getSession(sessionId) {
            return this.sessions.get(sessionId) || null;
        }

        /**
         * Получить текущую сессию
         * @returns {Object|null}
         */
        getCurrentSession() {
            return this.currentSessionId ? this.sessions.get(this.currentSessionId) : null;
        }

        /**
         * Обновить счетчик сессий
         * @private
         */
        _updateSessionCount() {
            const countEl = this.container.querySelector('.session-count');
            if (countEl) {
                countEl.textContent = this.sessions.size.toString();
            }
        }

        /**
         * Обновить список сессий
         */
        refreshSessions() {
            this._renderSessionList();
            if (this.currentSessionId) {
                this._renderSessionContent(this.currentSessionId);
            }
        }

        /**
         * Экспортировать сессию
         * @param {string} sessionId
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
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 0);
        }

        /**
         * Показать форму добавления действия
         * @param {string} sessionId
         */
        showAddActionForm(sessionId) {
            // Простая реализация - в реальной системе можно использовать модальное окно
            const actionType = prompt('Enter action type (form, message, script, rag-search, read-file, write-file, execute-command):');
            if (!actionType) return;

            const action = { type: actionType, timestamp: new Date().toISOString() };
            this.addActionToSession(sessionId, action);
        }

        /**
         * Установить состояние панели
         * @param {string} state
         */
        setState(state) {
            this.floatingPanel.setState(state);
        }

        /**
         * Развернуть панель
         */
        expand() {
            this.floatingPanel.expand();
        }

        /**
         * Свернуть панель
         */
        minimize() {
            this.floatingPanel.minimize();
        }

        /**
         * Свернуть панель в футер
         */
        minimizeToFooter() {
            this.floatingPanel.minimizeToFooter();
        }

        /**
         * Развернуть панель из футера
         */
        expandFromFooter() {
            this.floatingPanel.expandFromFooter();
        }

        /**
         * Переключить состояние
         */
        toggle() {
            this.floatingPanel.toggle();
        }

        /**
         * Пристыковать слева
         */
        dockLeft() {
            this.floatingPanel.dockLeft();
        }

        /**
         * Пристыковать справа
         */
        dockRight() {
            this.floatingPanel.dockRight();
        }

        /**
         * Пристыковать снизу
         */
        dockBottom() {
            this.floatingPanel.dockBottom();
        }

        /**
         * Установить критичность
         * @param {boolean} critical
         */
        setCritical(critical) {
            this.critical = critical;
            this.floatingPanel.setCritical(critical);
        }

        /**
         * Получить действия из сессии
         * @param {string} sessionId
         * @returns {Array}
         */
        getActionsFromSession(sessionId) {
            const session = this.sessions.get(sessionId);
            return session ? session.actions : [];
        }

        /**
         * Обновить статус действия
         * @param {string} sessionId
         * @param {string} actionId
         * @param {string} status
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
        }

        /**
         * Удалить действие из сессии
         * @param {string} sessionId
         * @param {string} actionId
         */
        removeActionFromSession(sessionId, actionId) {
            const session = this.sessions.get(sessionId);
            if (!session) return;

            session.actions = session.actions.filter(a => a.id !== actionId);
            session.updatedAt = new Date().toISOString();
            
            if (this.currentSessionId === sessionId) {
                this._renderSessionContent(sessionId);
            }
        }

        /**
         * Очистить все действия сессии (алиас для clearSessionActions)
         * @param {string} sessionId
         */
        clearActionsFromSession(sessionId) {
            this.clearSessionActions(sessionId);
        }

        /**
         * Импортировать сессию
         * @param {Object} data
         * @returns {string|null} ID импортированной сессии
         */
        importSession(data) {
            if (!data || !data.id) {
                console.warn('[AIActionsSessionPanel] Invalid session data for import');
                return null;
            }

            const sessionId = data.id;
            this.sessions.set(sessionId, {
                ...data,
                importedAt: new Date().toISOString()
            });

            this._renderSessionList();
            this._updateSessionCount();
            
            return sessionId;
        }

        /**
         * Экспортировать все сессии
         * @returns {Array}
         */
        exportAllSessions() {
            return Array.from(this.sessions.values());
        }

        /**
         * Уничтожить панель
         */
        destroy() {
            if (this.floatingPanel) {
                this.floatingPanel.destroy();
            }
            this.sessions.clear();
            this.sessionManager = null;
        }
    }

    // Export core class
    global.AIActionsSessionPanel = AIActionsSessionPanel;

})(typeof window !== 'undefined' ? window : globalThis);
