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
     * Resolve the SessionStore for a given session (falls back to active session or global store)
     * @param {string|null} sessionId
     * @returns {Object|null}
     */
    function resolveStore(sessionId = null) {
        const registry = global.WindowRegistry;
        const resolvedSessionId = sessionId
            || global.SessionManager?.getActiveSessionId?.()
            || null;
        if (resolvedSessionId && registry?.getSessionStore) {
            const windowStore = registry.getSessionStore(resolvedSessionId);
            if (windowStore) {
                return windowStore;
            }
        }
        return global.SessionStore;
    }

    /**
     * Ожидать первый ответ от сервера
     * @param {number} timeoutMs - таймаут в мс
     * @param {Object|null} store - SessionStore instance
     */
    function waitForFirstResponse(timeoutMs = 120000, store = resolveStore()) {
        return new Promise((resolve, reject) => {
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
        const responseData = { context: ctx, execute: exec, sessionId, projectId };
        TaskFlow._lastResponse = responseData;

        if (contentEl && exec) {
            Render.renderExecute(contentEl, exec, responseData, TaskFlow);
        }
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
        _lastResponse: null,

        /**
         * Инициализация
        * Task entry is via the header "+" button which now creates an empty session (handled by AppTask).
         */
        init() {
            const sel = document.getElementById('projectSelect');
            if (sel) {
                this._ensureProjectSelect();
                this._restoreProjectSelection();
            }
            this._setupPanelAutoOpen();
            this._setupLoaderListener();
        },

        /**
         * Setup loader event listener - subscribes to SessionStore 'loader' events
         * and shows/hides the global loader indicator
         * Uses SessionStore for unified loader management
         */
        _setupLoaderListener(sessionId = null) {
            const store = resolveStore(sessionId);
            if (!store || typeof store.on !== 'function') {
                console.log('[TaskFlow] _setupLoaderListener: SessionStore not available');
                return;
            }

            // Subscribe to loader events from SessionStore
            // This ensures UI stays in sync with store state
            const unsubscribe = store.on('loader', (data) => {
                console.log('[TaskFlow] Loader event from store:', data);
                this._updateLoaderUI(data);
            });

            // Store unsubscribe function for cleanup if needed
            this._loaderUnsubscribe = unsubscribe;
            console.log('[TaskFlow] _setupLoaderListener: subscribed to loader events');
        },

        /**
         * Show loader immediately - called before any server request
         * Uses SessionStore for unified loader management
         */
        _showLoader() {
            console.log('[TaskFlow] _showLoader called');
            
            // Try to use SessionStore for loader management
            const store = resolveStore(this._sessionId);
            if (store && typeof store.startLoader === 'function') {
                store.startLoader();
                console.log('[TaskFlow] Loader started via SessionStore');
                return;
            }
            
            // Fallback: Create and show loader DOM element directly
            // This handles cases when SessionStore is not available
            let loaderEl = document.getElementById('global-task-loader');
            if (!loaderEl) {
                loaderEl = document.createElement('div');
                loaderEl.id = 'global-task-loader';
                loaderEl.className = 'task-flow-inline-loader';
                loaderEl.innerHTML = `
                    <div class="task-flow-spinner"></div>
                    <p>Processing...</p>
                `;
                document.body.appendChild(loaderEl);
            }
            
            // Set minimum end time (5 seconds from now)
            const minEndTime = Date.now() + 5000;
            loaderEl.classList.add('active');
            loaderEl.dataset.minEndTime = minEndTime;
            
            // Store in component state for later use
            this._loaderMinEndTime = minEndTime;
            console.log('[TaskFlow] Loader shown (fallback), minEndTime:', minEndTime);
        },

        /**
         * Hide loader - called when server responds
         * Uses SessionStore for unified loader management
         */
        _hideLoader() {
            console.log('[TaskFlow] _hideLoader called');
            
            // Try to use SessionStore for loader management
            const store = resolveStore(this._sessionId);
            if (store && typeof store.stopLoader === 'function') {
                store.stopLoader();
                console.log('[TaskFlow] Loader stopped via SessionStore');
                return;
            }
            
            // Fallback: Handle hiding DOM element directly
            const loaderEl = document.getElementById('global-task-loader');
            if (!loaderEl) return;
            
            // Check if minimum time has passed
            const minEndTime = parseInt(loaderEl.dataset.minEndTime) || 0;
            const now = Date.now();
            
            if (now >= minEndTime) {
                // Minimum time passed, hide immediately
                loaderEl.classList.remove('active');
                this._loaderMinEndTime = null;
                console.log('[TaskFlow] Loader hidden (fallback - min time passed)');
            } else {
                // Wait for minimum time
                const remaining = minEndTime - now;
                console.log('[TaskFlow] Waiting', remaining, 'ms for minimum display time (fallback)');
                setTimeout(() => {
                    loaderEl.classList.remove('active');
                    this._loaderMinEndTime = null;
                    console.log('[TaskFlow] Loader hidden (fallback - after min time wait)');
                }, remaining);
            }
        },

        /**
         * Update loader UI based on loader state
         * @param {Object} data - { active: boolean, minEndTime?: number }
         */
        _updateLoaderUI(data) {
            console.log('[TaskFlow] _updateLoaderUI called:', data);
            if (!data) return;
            
            // Find or create global loader element
            let loaderEl = document.getElementById('global-task-loader');
            if (!loaderEl && data.active) {
                console.log('[TaskFlow] Creating loader element');
                // Create loader element if it doesn't exist
                loaderEl = document.createElement('div');
                loaderEl.id = 'global-task-loader';
                loaderEl.className = 'task-flow-inline-loader';
                loaderEl.innerHTML = `
                    <div class="task-flow-spinner"></div>
                    <p>Processing...</p>
                `;
                document.body.appendChild(loaderEl);
            }
            
            if (loaderEl) {
                if (data.active) {
                    loaderEl.classList.add('active');
                    // Calculate remaining time for minimum display
                    if (data.minEndTime) {
                        const remaining = Math.max(0, data.minEndTime - Date.now());
                        loaderEl.dataset.minRemaining = remaining;
                    }
                } else {
                    loaderEl.classList.remove('active');
                }
            }
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
            const store = resolveStore(this._sessionId);
            console.log('[TaskFlow] Before reset, store messages:', store?.messages?.length, store?.getState?.()?.messages?.length);
            store?.reset();
            console.log('[TaskFlow] After reset, store messages:', store?.messages?.length, store?.getState?.()?.messages?.length);

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

                // Setup loader listener for this specific session store
                this._setupLoaderListener(sessionId);

                // Initialize SessionStore for this session and start loader immediately
                const store = resolveStore(sessionId);
                console.log('[TaskFlow] _doRun: store:', !!store);
                if (store) {
                    store.setSession(sessionId, projectId);
                }

                // Start loader immediately - minimum 5 second display time enforced locally
                this._showLoader();

                // Handle sync response: serverResponse.data.execute
                const normalizedResponse = serverResponse?.data ?? serverResponse;
                const syncExecute = normalizedResponse?.execute;

                if (syncExecute) {
                    // Render sync response immediately
                    setPanelContent(contentEl, 'execute', { execute: syncExecute, context: normalizedResponse?.context, sessionId, projectId }, this);
                    updateStatus(contentEl, 'Received response');
                    // Stop loader - server returned execute, minimum 5s already passed
                    this._hideLoader();
                } else {
                    // Wait for async response (promiseId polling in SDK)
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

                // Removed legacy SessionViewModel update

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

            const store = resolveStore(sessionId);
            
            // Setup loader listener for this session
            this._setupLoaderListener(sessionId);

            // Start loader immediately - minimum 5 second display time
            this._showLoader();

            // Show sending state with choice label
            const choiceLabel = getChoiceLabel(choiceId);
            contentEl.innerHTML = `
                <div class="task-flow-sending">
                    <p>Sending choice: <strong>${escapeHtml(choiceLabel)}</strong></p>
                    <div class="task-flow-spinner"></div>
                </div>
            `;

            try {
                // Start waiting for response BEFORE submitting (prevents race condition)
                const outcomePromise = waitForFirstResponse(60000, store);

                const handler = global.ActionHandler;
                if (!handler?.submit) {
                    throw new Error('ActionHandler is not available for sending choice');
                }

                await handler.submit(sessionId, { choice: choiceId });

                // Wait for response (promiseId polling in SDK)
                const outcome = await outcomePromise;
                if (outcome.execute) {
                    setPanelContent(contentEl, 'execute', { execute: outcome.execute, sessionId, projectId }, this);
                    updateStatus(contentEl, 'Received response');
                }

                // Stop loader - server returned execute or async promise, minimum 5s enforced locally
                this._hideLoader();

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
            const store = resolveStore(sessionId);
            if (store?.pushMessage) {
                store.pushMessage({ content: displayText }, 'user');
            }

            // Setup loader listener for this session
            this._setupLoaderListener(sessionId);

            // Start loader immediately - LLM processing takes time
            this._showLoader();

            // Show sending state with message text
            contentEl.innerHTML = `
                <div class="task-flow-sending">
                    <p>Sending message: <strong>${escapeHtml(displayText)}</strong></p>
                    <div class="task-flow-spinner"></div>
                </div>
            `;

            try {
                // Start waiting for response BEFORE submitting (prevents race condition)
                const outcomePromise = waitForFirstResponse(60000, store);

                const handler = global.ActionHandler;
                if (!handler?.submit) {
                    throw new Error('ActionHandler is not available for sending message');
                }

                await handler.submit(sessionId, { message: messageText });

                // Wait for response (promiseId polling in SDK)
                const outcome = await outcomePromise;
                if (outcome.execute) {
                    setPanelContent(contentEl, 'execute', { execute: outcome.execute, sessionId, projectId }, this);
                    updateStatus(contentEl, 'Received response');
                }

                // Stop loader - server returned execute or async promise, minimum 5s enforced locally
                this._hideLoader();

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
            const store = resolveStore(this._sessionId);
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


})(typeof window !== 'undefined' ? window : global);
