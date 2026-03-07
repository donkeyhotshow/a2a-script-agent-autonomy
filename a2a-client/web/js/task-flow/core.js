/**
 * TaskFlow Core Module
 * Основной объект TaskFlow для управления потоком задач
 */

(function (global) {
    'use strict';

    // Get modules
    const API = global.TaskFlowAPI;
    const Render = global.TaskFlowRender;
    const request = API?.request;
    const getInputAreaHtml = Render?.getInputAreaHtml;
    const setPanelContent = Render?.setPanelContent;
    const updateStatus = Render?.updateStatus;
    const getChoiceLabel = API?.getChoiceLabel;

    // Note: No localStorage keys - all state managed server-side or in app state

    /**
     * Получить ID проекта
     */
    function getProjectId() {
        const sel = document.getElementById('projectSelect');
        if (sel?.value) return sel.value;
        const proj = window.appState?.get?.('project');
        if (proj?.id) return proj.id;
        const pm = window.ProjectManager;
        if (pm?.getLastSelectedProjectId) return pm.getLastSelectedProjectId() || null;
        return null;
    }

    /**
     * Ожидать первый ответ от сервера
     * @param {number} timeoutMs - таймаут в мс
     */
    function waitForFirstResponse(timeoutMs = 120000) {
        return new Promise((resolve, reject) => {
            const store = global.SessionStore;
            if (!store) {
                reject(new Error('SessionStore not available'));
                return;
            }

            let resolved = false;

            // Handler for execute received
            const unsubscribe = store.on('execute', (execute) => {
                if (resolved) return;
                resolved = true;
                unsubscribe();
                errorUnsub();
                resolve(execute);
            });

            // Also listen for error
            const errorUnsub = store.on('error', (error) => {
                if (resolved) return;
                resolved = true;
                unsubscribe();
                errorUnsub();
                reject(error);
            });

            // Timeout
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    unsubscribe();
                    errorUnsub();
                    reject(new Error('Timeout waiting for response'));
                }
            }, timeoutMs);
        });
    }

    /**
     * Применить ответ execute к представлению
     * @param {Object} resultData - данные результата
     * @param {HTMLElement} contentEl - элемент контента
     * @param {string} stateName - название состояния
     */
    function applyExecuteResponse(resultData, contentEl, stateName = 'response') {
        const TaskFlow = global.TaskFlow;
        const sessionId = TaskFlow._sessionId;
        const projectId = TaskFlow._projectId;
        const ctx = resultData?.context ?? resultData?.data?.context;
        const exec = resultData?.execute ?? resultData?.data?.execute;
        TaskFlow._lastContext = ctx != null ? (typeof ctx === 'object' ? ctx : {}) : {};
        const responseData = { context: ctx, execute: exec, sessionId, projectId };
        TaskFlow._lastResponse = responseData;

        if (contentEl && exec) {
            Render.renderExecute(contentEl, exec, responseData, TaskFlow);
        }
    }

    /**
     * Обновить SessionViewModel
     * @param {string} sessionId - ID сессии
     * @param {string} projectId - ID проекта
     * @param {Object} context - контекст
     * @param {Object} execute - execute объект
     */
    function updateSessionViewModel(sessionId, projectId, context, execute) {
        const vm = global.SessionViewModel;
        if (!vm) return;
        vm.sessionId = sessionId;
        vm.projectId = projectId;
        if (context) vm.context = context;
        if (execute) vm.execute = execute;
    }

    /**
     * Основной объект TaskFlow
     */
    const TaskFlow = {
        panelId: null,
        panel: null,
        fixed: false,
        _sessionId: null,
        _projectId: null,
        _lastContext: null,
        _lastResponse: null,

        /**
         * Инициализация
         * Task entry is via TaskCreator modal (header-task-form replaced by task-creator-modal).
         */
        init() {
            const sel = document.getElementById('projectSelect');
            if (sel) {
                this._ensureProjectSelect();
                this._restoreProjectSelection();
            }
            this._setupPanelAutoOpen();
        },

        /**
         * Убедиться что есть выбор проекта
         */
        async _ensureProjectSelect() {
            const sel = document.getElementById('projectSelect');
            if (!sel || sel.options.length > 1) return;
            try {
                const list = await request('GET', '/projects');
                const projects = Array.isArray(list) ? list : (list?.projects || []);
                projects.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id;
                    opt.textContent = p.name || p.id;
                    sel.appendChild(opt);
                });
            } catch (e) {
                console.warn('[TaskFlow] Could not load projects:', e);
            }
        },

        /**
         * Восстановить выбор проекта
         */
        _restoreProjectSelection() {
            const sel = document.getElementById('projectSelect');
            if (!sel) return;

            // Note: Project selection from app state only, no localStorage
            // Selection restored via app initialization, not browser storage

            // Listen for changes - no persistence needed (server-side)
            sel.addEventListener('change', () => {
                // Project change handled via app state, not localStorage
            });
        },

        /**
         * Запустить задачу
         * @param {string} task - текст задачи
         * @param {string} projectId - ID проекта
         */
        async run(task, projectId) {
            this._sessionId = null;
            this._projectId = projectId;

            // Note: No localStorage persistence - server handles session state

            // Update the select if it exists
            const sel = document.getElementById('projectSelect');
            if (sel && sel.value !== projectId) {
                sel.value = projectId;
            }

            // Use SessionStore instead of legacy SessionViewModel
            const store = global.SessionStore;
            store?.reset();

            // Check if task panel already exists
            const pm = global.PanelManager;
            if (this.panelId && pm?.get(this.panelId)) {
                pm.bringToFront(this.panelId);
                const panel = pm.get(this.panelId);
                if (panel) {
                    this.panel = panel;
                    const content = panel.getContentEl();
                    if (content) {
                        setPanelContent(content, 'loading', { task, projectId }, this);
                    }
                }
            } else {
                // Create task panel using PanelManager
                const contentHTML = '<div class="task-flow-preloader"><div class="task-flow-spinner"></div><p>Creating session…</p></div>';
                this.panel = pm?.open('task', {
                    title: 'Task Flow',
                    content: contentHTML,
                    fixed: this.fixed
                });

                if (this.panel) {
                    this.fixed = false;
                    const content = this.panel.getContentEl();
                    this._doRun(task, projectId, content);
                } else {
                    // Fallback: manual DOM creation if PanelManager not available
                    const el = document.createElement('div');
                    el.className = 'task-flow-panel-fallback';
                    el.innerHTML = `
                        <div class="task-flow-header">
                            <h3>Task Flow</h3>
                            <button class="task-flow-close">×</button>
                        </div>
                        <div class="task-flow-content"></div>
                    `;
                    document.body.appendChild(el);
                    const content = el.querySelector('.task-flow-content');
                    setPanelContent(content, 'loading', null, this);
                    el.querySelector('.task-flow-close')?.addEventListener('click', () => el.remove());
                    this._doRun(task, projectId, content);
                }
            }
        },

        /**
         * Выполнить запуск задачи
         * @param {string} task - текст задачи
         * @param {string} projectId - ID проекта
         * @param {HTMLElement} contentEl - элемент контента
         */
        async _doRun(task, projectId, contentEl) {
            if (!contentEl) return;

            try {
                // New protocol: send task directly in session creation
                const sessionRes = await request('POST', '/sessions', { projectId, task, title: task.slice(0, 50) });

                // Extract session ID - handle both { session: {...}, serverResponse: {...} } and { id: ... }
                const sessionData = sessionRes?.session || sessionRes;
                const sessionId = sessionData?.id;
                const serverResponse = sessionRes?.serverResponse;

                if (!sessionId) {
                    throw new Error('No session ID returned');
                }

                this._sessionId = sessionId;

                // Initialize SessionStore for this session
                const store = global.SessionStore;
                if (store) {
                    store.sessionId = sessionId;
                    store.projectId = projectId;
                }

                // Connect transport (SSE primary, WebSocket fallback)
                const transport = global.TransportManager;
                if (transport) {
                    transport.connect(sessionId, projectId);
                }

                // Handle sync response: serverResponse.data.execute
                const normalizedResponse = serverResponse?.data ?? serverResponse;
                const syncExecute = normalizedResponse?.execute;

                if (syncExecute) {
                    // Render sync response immediately
                    setPanelContent(contentEl, 'execute', { execute: syncExecute, context: normalizedResponse?.context, sessionId, projectId }, this);
                    updateStatus(contentEl, 'Received response');
                } else {
                    // Wait for async response via SSE
                    updateStatus(contentEl, 'Waiting for response...');
                }

                // Listen for execute events from SessionStore
                if (store && typeof store.on === 'function') {
                    store.on('execute', (execute) => {
                        if (this.panelId) {
                            const pm = global.PanelManager;
                            const panel = pm?.get(this.panelId);
                            if (panel) {
                                const content = panel.getContentEl();
                                if (content) {
                                    setPanelContent(content, 'execute', { execute, sessionId: this._sessionId, projectId: this._projectId }, this);
                                }
                            }
                        }
                    });
                }

                // For backward compatibility also update SessionViewModel
                updateSessionViewModel(sessionId, projectId, null, syncExecute);

            } catch (error) {
                console.error('[TaskFlow] Error:', error);
                setPanelContent(contentEl, 'error', { error: error.message, task, projectId }, this);
            }
        },

        /**
         * Отправить выбор
         * @param {string} choiceId - ID выбора
         * @param {HTMLElement} contentEl - элемент контента
         */
        async sendChoice(choiceId, contentEl) {
            const sessionId = this._sessionId;
            const projectId = this._projectId;
            if (!sessionId || !projectId) {
                console.warn('[TaskFlow] No active session');
                return;
            }

            // Show sending state with choice label
            const choiceLabel = getChoiceLabel(choiceId);
            contentEl.innerHTML = `
                <div class="task-flow-sending">
                    <p>Sending choice: <strong>${escapeHtml(choiceLabel)}</strong></p>
                    <div class="task-flow-spinner"></div>
                </div>
            `;

            try {
                const handler = global.ActionHandler;
                let result;

                if (handler?.submit) {
                    result = await handler.submit(sessionId, projectId, { choice: choiceId }, this._buildContext());
                } else {
                    // Fallback: manual submission
                    const context = this._buildContext();
                    result = await request('POST', `/sessions/${encodeURIComponent(sessionId)}/result`, {
                        result: { choice: choiceId },
                        context
                    });
                }

                // Wait for response via SSE
                const outcome = await waitForFirstResponse(60000);
                if (outcome.execute) {
                    setPanelContent(contentEl, 'execute', { execute: outcome.execute, sessionId, projectId }, this);
                    updateStatus(contentEl, 'Received response');
                }

            } catch (error) {
                console.error('[TaskFlow] Error sending choice:', error);
                contentEl.innerHTML = `
                    <div class="task-flow-error">
                        <p>Error: ${escapeHtml(error.message)}</p>
                        <button class="task-flow-retry-btn">Retry</button>
                    </div>
                `;
            }
        },

        /**
         * Отправить результат сообщения
         * @param {string} messageText - текст сообщения
         * @param {HTMLElement} contentEl - элемент контента
         */
        async sendMessageResult(messageText, contentEl) {
            const sessionId = this._sessionId;
            const projectId = this._projectId;
            if (!sessionId || !projectId) {
                console.warn('[TaskFlow] No active session');
                return;
            }

            const displayText = (messageText || '').trim() || 'continue';

            // Add message to history and show waiting state
            const store = global.SessionStore;
            if (store?.pushMessage) {
                store.pushMessage({ content: displayText }, 'user');
            }

            // Replace only input area with waiting indicator, preserve history
            const inputArea = contentEl.querySelector('.task-flow-input-area');
            if (inputArea) {
                inputArea.outerHTML = `
                    <div class="task-flow-input-area waiting">
                        <div class="task-flow-waiting-indicator">
                            <span class="loading-spinner"></span>
                            <span>Waiting for response...</span>
                        </div>
                    </div>
                `;
            }

            try {
                const handler = global.ActionHandler;
                let result;

                if (handler?.submit) {
                    result = await handler.submit(sessionId, projectId, { message: messageText }, this._buildContext());
                } else {
                    // Fallback: manual submission
                    const context = this._buildContext();
                    result = await request('POST', `/sessions/${encodeURIComponent(sessionId)}/result`, {
                        result: { message: messageText },
                        context
                    });
                }

                // Wait for response via SSE
                const outcome = await waitForFirstResponse(60000);
                if (outcome.execute) {
                    setPanelContent(contentEl, 'execute', { execute: outcome.execute, sessionId, projectId }, this);
                    updateStatus(contentEl, 'Received response');
                }

            } catch (error) {
                console.error('[TaskFlow] Error sending message:', error);
                contentEl.innerHTML = `
                    <div class="task-flow-error">
                        <p>Error: ${escapeHtml(error.message)}</p>
                    </div>
                `;
            }
        },

        /**
         * Построить контекст
         * @param {Object} overrides - переопределения
         */
        _buildContext(overrides = {}) {
            const base = TaskFlow._lastContext && typeof TaskFlow._lastContext === 'object'
                ? { ...TaskFlow._lastContext }
                : {};
            const context = { ...base };
            if (overrides.task) {
                context.task = overrides.task;
            }
            const executionBase = context.execution && typeof context.execution === 'object'
                ? { ...context.execution }
                : {};
            const executionOverrides = { ...(overrides.execution || {}) };
            if (overrides.action) executionOverrides.action = overrides.action;
            if (overrides.step) executionOverrides.step = overrides.step;
            const storeExecution = (() => {
                const store = global.SessionStore;
                return store?.getExecution ? store.getExecution() : null;
            })();
            const execution = {
                ...executionBase,
                ...executionOverrides,
                ...(storeExecution || {})
            };
            context.execution = execution;
            return context;
        },

        /**
         * Настроить автоматическое открытие панели
         */
        _setupPanelAutoOpen() {
            // Check if auto-open is needed
            const pm = global.PanelManager;
            if (!pm) return;

            // Check if panel already exists
            let panel = pm.get('task-flow-panel');
            if (!panel) {
                // Don't auto-create, wait for user action
                return;
            }

            this.panelId = 'task-flow-panel';
            this.panel = panel;

            // Render the execute state
            const contentEl = panel.getContentEl();
            if (contentEl && this._lastResponse) {
                Render.setPanelContent(contentEl, 'execute', this._lastResponse, this);
            }

            // Integrate with SessionStore events (replaces SessionManager events)
            const store = global.SessionStore;
            if (store && typeof store.on === 'function') {
                store.on('execute', (execute) => {
                    if (TaskFlow.panelId) {
                        const pm = global.PanelManager;
                        const panel = pm?.get(TaskFlow.panelId);
                        if (panel && TaskFlow._lastResponse) {
                            const content = panel.getContentEl();
                            if (content) {
                                // Merge any finalResult from execute
                                const response = {
                                    ...TaskFlow._lastResponse,
                                    execute
                                };
                                TaskFlow._lastResponse = response;
                                Render.setPanelContent(content, 'execute', response, TaskFlow);
                            }
                        }
                    }
                });
            }
        }
    };

    // Helper function
    function escapeHtml(s) {
        const el = document.createElement('div');
        el.textContent = s;
        return el.innerHTML;
    }

    // Export
    global.TaskFlow = TaskFlow;
    global.getProjectId = getProjectId;
    global.waitForFirstResponse = waitForFirstResponse;
    global.applyExecuteResponse = applyExecuteResponse;
    global.updateSessionViewModel = updateSessionViewModel;

})(typeof window !== 'undefined' ? window : global);
