/**
 * AI Actions Session Panel - Core Module
 * Основной класс и событийная система
 * 
 * Особенности:
 * - Управление сессиями с их статусами
 * - Поддержка AI actions (form, message, script, rag-search, read-file, write-file, execute-command)
 * - Интеграция с FloatingPanel для управления состоянием
 * 
 * Поддержка нового протокола (v2.0):
 * - execute.form.choices - выбор действия из списка
 * - execute.message - UI-only сообщения
 * - result: { choice: "..." } - отправка выбора
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
            
            this._init();
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
            // Создаем FloatingPanel для управления состоянием
            this.floatingPanel = new FloatingPanel(this.container, {
                id: this.id,
                slot: this.slot,
                critical: this.critical,
                onClose: () => this.onClose(),
                onStateChange: (state) => {
                    this.state = state;
                    this.onStateChange(state);
                },
                zonesContainer: this.zonesContainer
            });

            this._render();
            this._bindEvents();
            this._setupWebAPIIntegration();
        }

        /**
         * Настройка интеграции с WebAPI
         * @private
         */
        _setupWebAPIIntegration() {
            // Подписка на глобальные события от WebApiClient
            if (global.webApiClient) {
                // Слушаем события выбора choice
                global.webApiClient.on('choiceSelected', async (data) => {
                    if (data?.sessionId && data?.result) {
                        await this._sendResultToServer(data.sessionId, data.result);
                    }
                });

                // Слушаем события формы
                global.webApiClient.on('formSubmitted', async (data) => {
                    if (data?.sessionId && data?.result) {
                        await this._sendResultToServer(data.sessionId, data.result);
                    }
                });
            }

            // Также слушаем глобальные события от aiActionsPanel
            if (global.aiActionsPanel) {
                global.aiActionsPanel.on('choiceSelected', async (data) => {
                    if (data?.sessionId && data?.result) {
                        await this._sendResultToServer(data.sessionId, data.result);
                    }
                });

                global.aiActionsPanel.on('formSubmitted', async (data) => {
                    if (data?.sessionId && data?.result) {
                        await this._sendResultToServer(data.sessionId, data.result);
                    }
                });
            }

            // Слушаем события завершения задачи
            global.apiIntegration?.on?.('taskCompleted', async (data) => {
                if (data?.sessionId && data?.response) {
                    const sessionId = data.sessionId;
                    const response = data.response;

                    // Обрабатываем ответ сервера - поддержка execute и finalResult
                    if (response?.execute) {
                        this.processExecute(response.execute, response.context);
                    }

                    // Handle direct finalResult in response (task completion)
                    if (response?.finalResult) {
                        this.processExecute({ finalResult: response.finalResult }, response.context);
                    }

                    // Check for completed status in context
                    if (response?.context?.execution?.status === 'completed') {
                        this.updateSessionStatus(sessionId, 'completed');
                    }
                }
            });
        }

        /**
         * Отправить результат на сервер
         * @param {string} sessionId - ID сессии
         * @param {Object} result - результат
         * @private
         */
        async _sendResultToServer(sessionId, result) {
            // Используем формат для /result endpoint
            const response = await this._request('POST', `/sessions/${sessionId}/result`, result);
            return response;
        }

        /**
         * Выполнить HTTP запрос
         * @param {string} method - HTTP метод
         * @param {string} path - путь
         * @param {Object} body - тело запроса
         * @private
         */
        async _request(method, path, body = null) {
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
                return data;
            } catch (error) {
                console.error('[AIActionsSessionPanel] Request error:', error);
                throw error;
            }
        }

        /**
         * Рендеринг панели
         * @private
         */
        _render() {
            const contentEl = this.container.querySelector('.pui-panel-content');
            if (!contentEl) return;
            
            contentEl.innerHTML = `
                <div class="ai-actions-panel">
                    <div class="session-header">
                        <span class="session-count">0</span> sessions
                        <button class="btn-add-session" title="Create new session">+</button>
                        <button class="btn-clear-actions" title="Clear all actions">🗑</button>
                        <button class="btn-export" title="Export session">📤</button>
                    </div>
                    <div id="sessionList" class="session-list"></div>
                    <div class="session-details">
                        <div class="session-info">
                            <span class="session-id">No session selected</span>
                            <span class="session-status">-</span>
                        </div>
                        <div id="sessionContent" class="session-content"></div>
                    </div>
                </div>
            `;
        }

        /**
         * Привязка событий
         * @private
         */
        _bindEvents() {
            const contentEl = this.container.querySelector('.pui-panel-content');
            if (!contentEl) return;

            // Клик по кнопке создания сессии
            contentEl.querySelector('.btn-add-session')?.addEventListener('click', () => {
                this.createSession();
            });

            // Клик по кнопке очистки действий
            contentEl.querySelector('.btn-clear-actions')?.addEventListener('click', () => {
                if (this.currentSessionId) {
                    this.clearSessionActions(this.currentSessionId);
                }
            });

            // Клик по кнопке экспорта
            contentEl.querySelector('.btn-export')?.addEventListener('click', () => {
                if (this.currentSessionId) {
                    this.exportSession(this.currentSessionId);
                }
            });
        }

        // ==================== State Management ====================

        /**
         * Установить состояние панели
         * @param {string} state - состояние
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
         * Свернуть в футер
         */
        minimizeToFooter() {
            this.floatingPanel.minimizeToFooter();
        }

        /**
         * Развернуть из футера
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
         * Закрепить слева
         */
        dockLeft() {
            this.floatingPanel.dockLeft();
        }

        /**
         * Закрепить справа
         */
        dockRight() {
            this.floatingPanel.dockRight();
        }

        /**
         * Закрепить снизу
         */
        dockBottom() {
            this.floatingPanel.dockBottom();
        }

        /**
         * Установить критичность
         * @param {boolean} critical - критична ли панель
         */
        setCritical(critical) {
            this.critical = critical;
            this.floatingPanel?.setCritical(critical);
        }

        // ==================== Utility Methods ====================

        /**
         * Форматировать время
         * @param {string} isoString - ISO строка даты
         * @private
         */
        _formatTime(isoString) {
            const date = new Date(isoString);
            return date.toLocaleString();
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
         * Обновить сессии
         */
        refreshSessions() {
            this._renderSessionList();
            if (this.currentSessionId) {
                this._renderSessionContent(this.currentSessionId);
            }
        }

        /**
         * Уничтожить панель
         */
        destroy() {
            if (this.floatingPanel) {
                this.floatingPanel.destroy();
            }
            this.sessions.clear();
            this._listeners.clear();
        }
    }

    // Export to global
    global.AIActionsSessionPanel = AIActionsSessionPanel;

})(typeof window !== 'undefined' ? window : global);
