/**
 * AI Actions Session Panel - атомарный компонент для управления сессиями AI actions
 * 
 * Особенности:
 * - Отображение списка сессий с их статусами
 * - Поддержка AI actions (form, message, script, rag-search, read-file, write-file, execute-command)
 * - Интеграция с FloatingPanel для управления состоянием
 * - Возможность переключения между сессиями
 * - Отображение истории действий в каждой сессии
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
         * Интеграция с Web API для отправки результатов
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
            }

            // Также слушаем глобальные события от aiActionsPanel
            if (global.aiActionsPanel) {
                global.aiActionsPanel.on('choiceSelected', async (data) => {
                    if (data?.sessionId && data?.result) {
                        await this._sendResultToServer(data.sessionId, data.result);
                    }
                });
            }
        }

        /**
         * Отправить результат на сервер
         * @private
         * @param {string} sessionId - ID сессии
         * @param {Object} result - Результат для отправки
         */
        async _sendResultToServer(sessionId, result) {
            try {
                // Используем формат для /result endpoint
                const response = await this._request('POST', `/sessions/${sessionId}/result`, result);
                
                // Обрабатываем ответ сервера
                if (response?.execute) {
                    this.processExecute(response.execute, response.context);
                }
                
                this.emit('resultSent', { sessionId, response });
                console.log('[AIActionsSessionPanel] Result sent to server:', result);
            } catch (error) {
                console.error('[AIActionsSessionPanel] Failed to send result to server:', error);
                this.emit('error', error);
            }
        }

        /**
         * Выполнить HTTP запрос
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
                return data.data || data;
            } catch (error) {
                console.error('[AIActionsSessionPanel] Request error:', error);
                throw error;
            }
        }

        /**
         * Рендер содержимого панели
         * @private
         */
        _render() {
            const contentEl = this.container.querySelector('.pui-panel-content');
            if (!contentEl) return;

            contentEl.innerHTML = `
                <div class="ai-actions-panel">
                    <div class="ai-actions-header">
                        <h3>AI Actions Sessions</h3>
                        <div class="ai-actions-controls">
                            <button class="btn-new-session" title="New Session">+ New</button>
                            <button class="btn-refresh" title="Refresh">⟳</button>
                        </div>
                    </div>
                    <div class="ai-actions-body">
                        <div class="session-list-container">
                            <div class="session-list-header">
                                <h4>Sessions</h4>
                                <span class="session-count">0</span>
                            </div>
                            <div class="session-list" id="sessionList">
                                <!-- Сессии будут добавляться здесь -->
                            </div>
                        </div>
                        <div class="session-content-container">
                            <div class="session-content-header">
                                <div class="session-info">
                                    <span class="session-id">No session selected</span>
                                    <span class="session-status">-</span>
                                </div>
                                <div class="session-actions">
                                    <button class="btn-clear-actions" title="Clear Actions">Clear</button>
                                    <button class="btn-export" title="Export">Export</button>
                                </div>
                            </div>
                            <div class="session-content" id="sessionContent">
                                <div class="empty-state">
                                    <p>Select a session to view its actions</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        /**
         * Привязка обработчиков событий
         * @private
         */
        _bindEvents() {
            const contentEl = this.container.querySelector('.pui-panel-content');
            
            // Новая сессия
            contentEl.querySelector('.btn-new-session')?.addEventListener('click', () => {
                this.createSession();
            });
            
            // Обновление
            contentEl.querySelector('.btn-refresh')?.addEventListener('click', () => {
                this.refreshSessions();
            });
            
            // Очистка действий
            contentEl.querySelector('.btn-clear-actions')?.addEventListener('click', () => {
                if (this.currentSessionId) {
                    this.clearSessionActions(this.currentSessionId);
                }
            });
            
            // Экспорт
            contentEl.querySelector('.btn-export')?.addEventListener('click', () => {
                if (this.currentSessionId) {
                    this.exportSession(this.currentSessionId);
                }
            });
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
         * Рендер списка сессий
         * @private
         */
        _renderSessionList() {
            const sessionListEl = this.container.querySelector('#sessionList');
            if (!sessionListEl) return;

            const sessions = Array.from(this.sessions.values()).sort((a, b) => 
                new Date(b.updatedAt) - new Date(a.updatedAt)
            );

            sessionListEl.innerHTML = sessions.map(session => `
                <div class="session-item ${session.id === this.currentSessionId ? 'active' : ''}" 
                     data-session-id="${session.id}"
                     onclick="window.aiActionsPanel?.switchToSession('${session.id}')">
                    <div class="session-item-header">
                        <span class="session-item-id">${session.id}</span>
                        <span class="session-item-status ${session.status}">${session.status}</span>
                    </div>
                    <div class="session-item-meta">
                        <span class="session-item-time">${this._formatTime(session.updatedAt)}</span>
                        <span class="session-item-count">${session.actions.length} actions</span>
                    </div>
                </div>
            `).join('');

            // Добавляем обработчики кликов
            sessionListEl.querySelectorAll('.session-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const sessionId = item.dataset.sessionId;
                    this.switchToSession(sessionId);
                });
            });
        }

        /**
         * Рендер содержимого сессии
         * @param {string} sessionId
         * @private
         */
        _renderSessionContent(sessionId) {
            const session = this.sessions.get(sessionId);
            if (!session) {
                this._renderEmptyContent();
                return;
            }

            const contentEl = this.container.querySelector('#sessionContent');
            const infoEl = this.container.querySelector('.session-info');
            const statusEl = this.container.querySelector('.session-status');

            if (infoEl) {
                infoEl.querySelector('.session-id').textContent = session.id;
                infoEl.querySelector('.session-status').textContent = session.status;
            }

            if (statusEl) {
                statusEl.textContent = session.status;
            }

            if (!contentEl) return;

            if (session.actions.length === 0) {
                contentEl.innerHTML = `
                    <div class="empty-state">
                        <p>No actions in this session yet</p>
                        <button class="btn-add-action" onclick="window.aiActionsPanel?.showAddActionForm('${sessionId}')">Add Action</button>
                    </div>
                `;
                return;
            }

            contentEl.innerHTML = `
                <div class="actions-list">
                    ${session.actions.map(action => this._renderAction(action)).join('')}
                </div>
            `;
        }

        /**
         * Рендер пустого содержимого
         * @private
         */
        _renderEmptyContent() {
            const contentEl = this.container.querySelector('#sessionContent');
            const infoEl = this.container.querySelector('.session-info');
            const statusEl = this.container.querySelector('.session-status');

            if (infoEl) {
                infoEl.querySelector('.session-id').textContent = 'No session selected';
                infoEl.querySelector('.session-status').textContent = '-';
            }

            if (statusEl) {
                statusEl.textContent = '-';
            }

            if (contentEl) {
                contentEl.innerHTML = `
                    <div class="empty-state">
                        <p>Select a session to view its actions</p>
                        <button class="btn-new-session-inline" onclick="window.aiActionsPanel?.createSession()">Create New Session</button>
                    </div>
                `;
            }
        }

        /**
         * Рендер отдельного действия
         * @param {Object} action
         * @returns {string}
         * @private
         */
        _renderAction(action) {
            const actionType = this._getActionType(action);
            const statusClass = action.status || 'completed';
            const timestamp = this._formatTime(action.timestamp);

            return `
                <div class="action-item ${statusClass}">
                    <div class="action-header">
                        <span class="action-type">${actionType}</span>
                        <span class="action-timestamp">${timestamp}</span>
                        <span class="action-status ${statusClass}">${statusClass}</span>
                    </div>
                    <div class="action-content">
                        ${this._renderActionContent(action)}
                    </div>
                </div>
            `;
        }

        /**
         * Рендер содержимого действия в зависимости от типа
         * @param {Object} action
         * @returns {string}
         * @private
         */
        _renderActionContent(action) {
            switch (action.type) {
                case 'form':
                    // Support both direct form and nested execute.form structure
                    const formData = action.form || action;
                    const choices = formData.choices || action.choices || [];
                    const title = formData.title || action.title || 'Form';
                    const inputFields = formData.input || action.input || [];
                    
                    return `
                        <div class="action-form">
                            <div class="form-title">${escapeHtml(title)}</div>
                            ${choices.length > 0 ? `
                                <div class="form-choices">
                                    ${choices.map((choice, idx) => `
                                        <button class="choice-button" 
                                                data-choice-id="${escapeHtml(String(choice.id))}"
                                                data-choice-index="${idx}"
                                                onclick="window.aiActionsPanel?.selectChoice('${this.currentSessionId}', '${escapeHtml(String(choice.id))}', this)">
                                            ${escapeHtml(String(choice.label || choice.id))}
                                        </button>
                                    `).join('')}
                                </div>
                            ` : ''}
                            ${inputFields.length > 0 ? `
                                <div class="form-inputs">
                                    ${inputFields.map(field => `
                                        <div class="input-field">
                                            <label>${escapeHtml(String(field.label || field.name || ''))}</label>
                                            <input type="${field.type || 'text'}" 
                                                   name="${escapeHtml(String(field.name || ''))}" 
                                                   placeholder="${escapeHtml(String(field.placeholder || ''))}" />
                                        </div>
                                    `).join('')}
                                    <button class="submit-form-btn" onclick="window.aiActionsPanel?.submitFormInput('${this.currentSessionId}', this)">Submit</button>
                                </div>
                            ` : ''}
                        </div>
                    `;

                case 'message':
                    // Support both direct message and nested execute.message structure
                    const msgData = action.message || action;
                    const msgContent = msgData.content || msgData.text || msgData.message || action.content || action.text || 'No content';
                    return `
                        <div class="action-message">
                            <div class="message-content">${escapeHtml(String(msgContent))}</div>
                            ${msgData.type ? `<div class="message-type">${escapeHtml(String(msgData.type))}</div>` : ''}
                        </div>
                    `;

                case 'script':
                    return `
                        <div class="action-script">
                            <div class="script-input">Input: ${JSON.stringify(action.input || {}, null, 2)}</div>
                            <div class="script-output">Output: ${action.output || 'No output'}</div>
                            <div class="script-code">Code: ${action.code || 'No code'}</div>
                        </div>
                    `;

                case 'rag-search':
                    return `
                        <div class="action-rag">
                            <div class="rag-query">Query: ${action.query || 'No query'}</div>
                            <div class="rag-results">Results: ${action.results ? action.results.length : 0} items</div>
                        </div>
                    `;

                case 'read-file':
                    return `
                        <div class="action-file">
                            <div class="file-path">Path: ${action.path || 'Unknown'}</div>
                            <div class="file-content">Content: ${action.content ? action.content.substring(0, 200) + '...' : 'No content'}</div>
                        </div>
                    `;

                case 'write-file':
                    return `
                        <div class="action-file">
                            <div class="file-path">Path: ${action.path || 'Unknown'}</div>
                            <div class="file-content">Content: ${action.content ? action.content.substring(0, 200) + '...' : 'No content'}</div>
                        </div>
                    `;

                case 'execute-command':
                    return `
                        <div class="action-command">
                            <div class="command-text">Command: ${action.command || 'No command'}</div>
                            <div class="command-output">Output: ${action.output || 'No output'}</div>
                            <div class="command-error">Error: ${action.error || 'No error'}</div>
                        </div>
                    `;

                default:
                    return `
                        <div class="action-unknown">
                            <div class="unknown-type">Unknown action type: ${action.type}</div>
                            <div class="action-data">${JSON.stringify(action, null, 2)}</div>
                        </div>
                    `;
            }
        }

        /**
         * Получить тип действия
         * @param {Object} action
         * @returns {string}
         * @private
         */
        _getActionType(action) {
            // Check direct type first
            if (action.type) return action.type;
            
            // Check execute object structure (new protocol v2.0)
            if (action.execute) {
                if (action.execute.form) return 'form';
                if (action.execute.message) return 'message';
                if (action.execute.script) return 'script';
                if (action.execute['rag-search']) return 'rag-search';
                if (action.execute['read-file']) return 'read-file';
                if (action.execute['write-file']) return 'write-file';
                if (action.execute['execute-command']) return 'execute-command';
            }
            
            // Legacy format check
            if (action.form) return 'form';
            if (action.message) return 'message';
            if (action.script) return 'script';
            if (action['rag-search']) return 'rag-search';
            if (action['read-file']) return 'read-file';
            if (action['write-file']) return 'write-file';
            if (action['execute-command']) return 'execute-command';
            return 'unknown';
        }

        /**
         * Выбрать вариант из формы выбора (execute.form.choices)
         * @param {string} sessionId - ID сессии
         * @param {string} choiceId - ID выбранного варианта
         * @param {HTMLElement} buttonElement - Кнопка (опционально)
         */
        selectChoice(sessionId, choiceId, buttonElement = null) {
            const session = this.sessions.get(sessionId);
            if (!session) {
                console.warn(`[AIActionsSessionPanel] Session ${sessionId} not found`);
                return;
            }

            // Mark button as selected if provided
            if (buttonElement) {
                const allButtons = this.container.querySelectorAll('.choice-button');
                allButtons.forEach(btn => btn.classList.remove('selected'));
                buttonElement.classList.add('selected');
            }

            // Создаем result в формате action-key shape: { form: { choice: "..." } }
            // Это соответствует протоколу new-request-flow
            const result = { form: { choice: choiceId } };

            // Add action to session
            this.addActionToSession(sessionId, {
                type: 'choice-selection',
                choiceId: choiceId,
                result: result,
                status: 'completed',
                timestamp: new Date().toISOString()
            });

            // Emit event for external handlers (e.g., SessionManager)
            this.emit('choiceSelected', {
                sessionId,
                choiceId,
                result,
                action: session.metadata?.selectedAction
            });

            // Отправляем результат на сервер
            this._sendResultToServer(sessionId, result);

            console.log(`[AIActionsSessionPanel] Choice selected: ${choiceId}`);
        }

        /**
         * Отправить данные формы (execute.form.input)
         * @param {string} sessionId - ID сессии
         * @param {HTMLElement} buttonElement - Кнопка Submit
         */
        submitFormInput(sessionId, buttonElement = null) {
            const session = this.sessions.get(sessionId);
            if (!session) {
                console.warn(`[AIActionsSessionPanel] Session ${sessionId} not found`);
                return;
            }

            // Collect form data
            const formInputs = this.container.querySelectorAll('.form-inputs input');
            const inputData = {};
            formInputs.forEach(input => {
                inputData[input.name] = input.value;
            });

            // Создаем result в формате action-key shape: { form: { input: {...} } }
            const result = { form: { input: inputData } };

            // Add action to session
            this.addActionToSession(sessionId, {
                type: 'form-submission',
                input: inputData,
                result: result,
                status: 'completed',
                timestamp: new Date().toISOString()
            });

            // Emit event for external handlers
            this.emit('formSubmitted', {
                sessionId,
                input: inputData,
                result
            });

            // Отправляем результат на сервер
            this._sendResultToServer(sessionId, result);

            console.log(`[AIActionsSessionPanel] Form submitted:`, inputData);
        }

        /**
         * Обработать execute объект от сервера (новый протокол v2.0)
         * @param {Object} execute - execute объект от сервера
         * @param {Object} context - context объект (опционально)
         */
        processExecute(execute, context = null) {
            if (!this.currentSessionId) {
                console.warn('[AIActionsSessionPanel] No active session');
                return;
            }

            // Handle execute.form
            if (execute?.form) {
                const form = execute.form;
                this.addActionToSession(this.currentSessionId, {
                    type: 'form',
                    form: form,
                    title: form.title,
                    choices: form.choices,
                    input: form.input,
                    context: context,
                    status: 'pending',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // Handle execute.message
            if (execute?.message) {
                const message = typeof execute.message === 'string'
                    ? { content: execute.message }
                    : execute.message;
                this.addActionToSession(this.currentSessionId, {
                    type: 'message',
                    message: message,
                    context: context,
                    status: 'completed',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // Handle execute.script
            if (execute?.script) {
                this.addActionToSession(this.currentSessionId, {
                    type: 'script',
                    script: execute.script,
                    context: context,
                    status: 'pending',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // Handle execute['rag-search']
            if (execute?.['rag-search']) {
                this.addActionToSession(this.currentSessionId, {
                    type: 'rag-search',
                    'rag-search': execute['rag-search'],
                    context: context,
                    status: 'pending',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // Handle execute['read-file']
            if (execute?.['read-file']) {
                this.addActionToSession(this.currentSessionId, {
                    type: 'read-file',
                    'read-file': execute['read-file'],
                    context: context,
                    status: 'pending',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // Handle execute['write-file']
            if (execute?.['write-file']) {
                this.addActionToSession(this.currentSessionId, {
                    type: 'write-file',
                    'write-file': execute['write-file'],
                    context: context,
                    status: 'pending',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // Handle execute['execute-command']
            if (execute?.['execute-command']) {
                this.addActionToSession(this.currentSessionId, {
                    type: 'execute-command',
                    'execute-command': execute['execute-command'],
                    context: context,
                    status: 'pending',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // Unknown execute type
            console.warn('[AIActionsSessionPanel] Unknown execute type:', execute);
        }

        /**
         * Форматировать время
         * @param {string} isoString
         * @returns {string}
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
         * Интегрировать с SessionManager
         * @param {Object} sessionManager - экземпляр SessionManager
         * @returns {AIActionsSessionPanel} this для чейнинга
         */
        integrateWithSessionManager(sessionManager) {
            if (!sessionManager) {
                console.warn('[AIActionsSessionPanel] SessionManager not provided');
                return this;
            }

            this.sessionManager = sessionManager;
            
            // Подписываемся на события SessionManager
            this._setupSessionManagerListeners();
            
            // Синхронизируем существующие сессии
            this.syncWithSessionManager();
            
            console.log('[AIActionsSessionPanel] Integrated with SessionManager');
            return this;
        }

        /**
         * Настроить слушателей событий SessionManager
         * @private
         */
        _setupSessionManagerListeners() {
            if (!this.sessionManager) return;

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
        }

        /**
         * Синхронизировать сессии с SessionManager
         */
        syncWithSessionManager() {
            if (!this.sessionManager) return;

            // Загружаем сессии из SessionManager
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
         * Сохранить в custom storage
         */
        async saveToStorage() {
            try {
                const data = this.exportAllSessions();
                // Try async storage first, fallback to sync
                try {
                    await StorageAPI.aiActions.setItem('sessions', JSON.stringify(data));
                    await StorageAPI.aiActions.setItem('current-session', this.currentSessionId || '');
                } catch (asyncError) {
                    console.warn('[AIActionsSessionPanel] Async storage failed, using sync fallback:', asyncError);
                    StorageAPI.aiActions.setItemSync('sessions', JSON.stringify(data));
                    StorageAPI.aiActions.setItemSync('current-session', this.currentSessionId || '');
                }
            } catch (e) {
                console.error('[AIActionsSessionPanel] Failed to save to storage:', e);
            }
        }

        /**
         * Загрузить из custom storage
         * @returns {Array} загруженные сессии
         */
        async loadFromStorage() {
            try {
                // Try async storage first, fallback to sync
                let data;
                try {
                    data = await StorageAPI.aiActions.getItem('sessions');
                } catch (asyncError) {
                    console.warn('[AIActionsSessionPanel] Async storage failed, using sync fallback:', asyncError);
                    data = StorageAPI.aiActions.getItemSync('sessions');
                }

                if (data) {
                    const sessions = typeof data === 'string' ? JSON.parse(data) : data;
                    sessions.forEach(session => {
                        this.sessions.set(session.id, session);
                    });
                    this._renderSessionList();
                    this._updateSessionCount();

                    // Восстанавливаем текущую сессию
                    let currentId;
                    try {
                        currentId = await StorageAPI.aiActions.getItem('current-session');
                    } catch (asyncError) {
                        currentId = StorageAPI.aiActions.getItemSync('current-session');
                    }

                    if (currentId && this.sessions.has(currentId)) {
                        this.switchToSession(currentId);
                    }

                    return sessions;
                }
            } catch (e) {
                console.error('[AIActionsSessionPanel] Failed to load from storage:', e);
            }
            return [];
        }

        /**
         * Очистить custom storage
         */
        async clearStorage() {
            try {
                // Try async storage first, fallback to sync
                try {
                    await StorageAPI.aiActions.removeItem('sessions');
                    await StorageAPI.aiActions.removeItem('current-session');
                } catch (asyncError) {
                    console.warn('[AIActionsSessionPanel] Async storage failed, using sync fallback:', asyncError);
                    StorageAPI.aiActions.removeItemSync('sessions');
                    StorageAPI.aiActions.removeItemSync('current-session');
                }
            } catch (e) {
                console.error('[AIActionsSessionPanel] Failed to clear storage:', e);
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
            this.sessionManager = null;
        }
    }

    /**
     * Создать DOM элемент сессионной панели AI actions
     * @param {Object} options
     * @returns {HTMLElement}
     */
    function createAIActionsPanelDOM(options = {}) {
        const id = options.id || 'ai-actions-panel-' + Math.random().toString(36).slice(2, 9);
        const title = options.title != null ? options.title : 'AI Actions';
        const slot = options.slot || 'floating';
        const slotClasses = {
            floating: 'pui-slot-floating',
            left: 'pui-slot-left',
            right: 'pui-slot-right',
            bottom: 'pui-slot-bottom',
            header: 'pui-slot-header'
        };
        const slotClass = slotClasses[slot] || slotClasses.floating;

        const div = document.createElement('div');
        div.className = `pui-panel expanded ${slotClass}`;
        div.dataset.panelId = id;
        if (options.critical) div.classList.add('pui-critical');

        div.innerHTML = `
            <div class="pui-panel-header">
                <span class="pui-panel-title">${escapeHtml(String(title))}</span>
                <div class="pui-panel-controls">
                    <button type="button" class="pui-panel-control-btn" title="Maximize">□</button>
                    <button type="button" class="pui-panel-control-btn" data-action="close" title="Close">×</button>
                </div>
            </div>
            <div class="pui-panel-content">
                <!-- Содержимое будет добавлено при инициализации -->
            </div>
            <div class="pui-panel-resize"></div>`;

        return div;
    }

    /**
     * Экранирование HTML
     * @param {string} s
     * @returns {string}
     */
    function escapeHtml(s) {
        const el = document.createElement('div');
        el.textContent = s;
        return el.innerHTML;
    }

    // Export
    global.AIActionsSessionPanel = AIActionsSessionPanel;
    global.createAIActionsPanelDOM = createAIActionsPanelDOM;
    global.escapeHtml = escapeHtml;

})(typeof window !== 'undefined' ? window : globalThis);