/**
 * Task flow: input + Send → create session (api-server) → fixate IDs → invoke server → first response.
 * Panel: preloader → then non-closable plasticine with session id + first response.
 *
 * Updated: Removed HTTP polling. Uses SSE/Store events for async responses.
 */

(function (global) {
    function getApiBase() {
        const base = global.apiIntegration?.apiBase || '/api';
        return String(base).replace(/\/?$/, '');
    }

    function getHeaders() {
        const h = { 'Content-Type': 'application/json' };
        const cfg = window.apiIntegration?.token;
        if (cfg) h['Authorization'] = 'Bearer ' + cfg;
        return h;
    }

    async function request(method, path, body = null) {
        if (global.apiIntegration?.request) {
            return global.apiIntegration.request(method, path, body, {
                module: 'TaskFlow',
                context: { path, method }
            });
        }

        const base = getApiBase();
        const url = path.startsWith('http')
            ? path
            : (path.startsWith('/') ? `${base}${path}` : `${base}/${path}`);
        const options = {
            method,
            headers: getHeaders()
        };
        if (body) options.body = JSON.stringify(body);

        try {
            const res = await fetch(url, options);
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                global.ErrorHandler?.handleApiError({
                    status: res.status,
                    data,
                    error: data?.error
                }, { module: 'TaskFlow', path: url, method });
                const err = new Error(data?.error?.message || data?.error || 'Request failed');
                err.status = res.status;
                err.response = data;
                throw err;
            }
            return data?.data ?? data;
        } catch (error) {
            global.ErrorHandler?.handleNetworkError(error, { module: 'TaskFlow', path: url, method });
            throw error;
        }
    }

    function getProjectId() {
        const sel = document.getElementById('projectSelect');
        if (sel?.value) return sel.value;
        const proj = window.appState?.get?.('project');
        if (proj?.id) return proj.id;
        const pm = window.ProjectManager;
        if (pm?.currentProject?.id) return pm.currentProject.id;
        if (sel?.options?.length > 1) return sel.options[1].value;
        return null;
    }

    function renderExecute(contentEl, execute, data, taskFlowRef) {
        if (!contentEl || !execute) return;
        
        const context = data?.context;
        const execution = context?.execution;
        
        // Task 3.1: Build execution step display
        let executionStepHtml = '';
        if (execution?.step) {
            const isLlmRequest = execution.step === 'llm-request' || execution.action?.startsWith('ai-');
            const stepLabel = isLlmRequest ? 'llm-request' : execution.step;
            executionStepHtml = `
                <div class="task-flow-execution-step">
                    <span class="execution-step-label">Step:</span>
                    <span class="execution-step-name">${escapeHtml(stepLabel)}</span>
                </div>`;
        }

        // Task 3.2: Build progress bar display
        let progressBarHtml = '';
        if (execution?.progress !== undefined) {
            const progress = Math.max(0, Math.min(100, execution.progress));
            progressBarHtml = `
                <div class="task-flow-progress">
                    <div class="task-flow-progress-bar">
                        <div class="task-flow-progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <span class="task-flow-progress-text">${progress}%</span>
                </div>`;
        }

        // Task 3.3: Build finalResult display (for completed status)
        let finalResultHtml = '';
        if (execution?.status === 'completed' || execute.finalResult) {
            const finalResult = execute.finalResult || {};
            const summary = finalResult.summary || {};
            const actionName = finalResult.action || execution?.action || 'unknown';
            
            // Format summary as key-value pairs
            let summaryHtml = '';
            if (typeof summary === 'object' && summary !== null) {
                summaryHtml = Object.entries(summary)
                    .map(([key, value]) => `<div class="final-result-item"><span class="result-key">${escapeHtml(key)}:</span> <span class="result-value">${escapeHtml(String(value))}</span></div>`)
                    .join('');
            } else {
                summaryHtml = `<div class="final-result-item">${escapeHtml(String(summary))}</div>`;
            }
            
            finalResultHtml = `
                <div class="task-flow-final-result">
                    <div class="final-result-header">✅ Completed: ${escapeHtml(actionName)}</div>
                    <div class="final-result-summary">${summaryHtml}</div>
                </div>`;
        }
        
        const form = execute.form;
        const message = execute.message;
        if (form && Array.isArray(form.choices) && form.choices.length > 0) {
            const title = form.title ? `<p class="task-flow-form-title">${escapeHtml(form.title)}</p>` : '';
            const buttons = form.choices.map((c) =>
                `<button type="button" class="task-flow-choice-btn" data-choice-id="${escapeHtml(c.id)}">${escapeHtml(c.label || c.id)}</button>`
            ).join('');
            contentEl.innerHTML = `
        <div class="task-flow-response task-flow-form-wrap">
          ${executionStepHtml}
          ${progressBarHtml}
          ${title}
          <div class="task-flow-choices">${buttons}</div>
          ${finalResultHtml}
        </div>`;
            contentEl.querySelectorAll('.task-flow-choice-btn').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const choiceId = btn.getAttribute('data-choice-id');
                    if (choiceId && taskFlowRef && taskFlowRef.sendChoice) taskFlowRef.sendChoice(choiceId, contentEl);
                });
            });
            return;
        }
        if (message != null) {
            const messageContent = typeof message === 'string'
                ? message
                : (message.content || message.text || '');
            const encodedMessage = encodeURIComponent(messageContent || '');
            contentEl.innerHTML = `
        <div class="task-flow-response task-flow-message-wrap">
          ${executionStepHtml}
          ${progressBarHtml}
          <p class="task-flow-message">${escapeHtml(messageContent || String(message))}</p>
          <div class="task-flow-message-actions">
            <button type="button" class="task-flow-message-btn" data-message="${encodedMessage}">Continue</button>
          </div>
          ${finalResultHtml}
        </div>`;
            const messageBtn = contentEl.querySelector('.task-flow-message-btn');
            messageBtn?.addEventListener('click', () => {
                const payload = messageBtn.dataset.message;
                const decoded = payload ? decodeURIComponent(payload) : '';
                if (taskFlowRef?.sendMessageResult) {
                    taskFlowRef.sendMessageResult(decoded, contentEl);
                }
            });
            return;
        }
        const ctx = data?.context ? JSON.stringify(data.context, null, 2) : '';
        const exec = data?.execute ? JSON.stringify(data.execute, null, 2) : '';
        contentEl.innerHTML = `
        <div class="task-flow-response">
          ${executionStepHtml}
          ${progressBarHtml}
          <div class="task-flow-response-section"><strong>Context</strong><pre>${escapeHtml(ctx || '{}')}</pre></div>
          <div class="task-flow-response-section"><strong>Execute</strong><pre>${escapeHtml(exec || '{}')}</pre></div>
          ${finalResultHtml}
        </div>`;
    }

    function setPanelContent(contentEl, state, data, taskFlowRef) {
        if (!contentEl) return;
        if (state === 'loading') {
            contentEl.innerHTML = '<div class="task-flow-preloader"><div class="task-flow-spinner"></div><p>Creating session…</p></div>';
            return;
        }
        if (state === 'sending') {
            contentEl.innerHTML = '<div class="task-flow-preloader"><div class="task-flow-spinner"></div><p>Sending…</p></div>';
            return;
        }
        if (state === 'fixated') {
            contentEl.innerHTML = `
        <div class="task-flow-fixated">
          <p><strong>Session</strong> <code>${(data?.sessionId || '').replace(/</g, '&lt;')}</code></p>
          <p><strong>Project</strong> <code>${(data?.projectId || '').replace(/</g, '&lt;')}</code></p>
          <p class="task-flow-status">Sending to server…</p>
        </div>`;
            return;
        }
        if (state === 'firstResponse' || state === 'response') {
            renderExecute(contentEl, data?.execute, data, taskFlowRef || null);
        }
    }

    function escapeHtml(s) {
        const el = document.createElement('div');
        el.textContent = s;
        return el.innerHTML;
    }

    function updateStatus(contentEl, text) {
        const status = contentEl?.querySelector('.task-flow-status');
        if (status) status.textContent = text;
    }

    /**
     * Wait for first response via SessionStore
     * No HTTP polling - uses SSE events through store
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
                if (execute && (execute.form || execute.message || execute.finalResult)) {
                    resolved = true;
                    unsubscribe();
                    resolve({ status: 'completed', execute, context: store.context });
                }
            });

            // Also listen for error
            const errorUnsub = store.on('error', (error) => {
                if (resolved) return;
                resolved = true;
                unsubscribe();
                errorUnsub();
                reject(error);
            });

            // Timeout fallback
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    unsubscribe();
                    errorUnsub();
                    resolve({ status: 'timeout', result: null });
                }
            }, timeoutMs);
        });
    }

    const TaskFlow = {
        panelId: null,
        panel: null,
        pui: null,
        fixed: false,
        _sessionId: null,
        _projectId: null,
        _currentTask: null,
        _lastContext: null,
        _lastResponse: null, // Task 3.1-3.3: Store last response for re-rendering

        init() {
            const form = document.getElementById('taskSendForm');
            const input = document.getElementById('taskInputField');
            if (!form || !input) return;

            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const task = (input?.value || '').trim();
                if (!task) return;
                const projectId = getProjectId();
                if (!projectId) {
                    window.addNotification?.('Select a project first', 'error');
                    return;
                }
                this._currentTask = task;
                this.run(task, projectId);
            });

            this._ensureProjectSelect();
        },

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
            } catch (_) {}
        },

        run(task, projectId) {
            if (task) this._currentTask = task;
            const sessionViewModel = global.SessionViewModel;
            sessionViewModel?.reset();
            sessionViewModel?.setProject(projectId);
            if (task) {
                sessionViewModel?.pushMessage({ content: task }, 'user');
            }
            if (this.panelId && this.pui?.getPanel(this.panelId)) {
                this.pui.bringToFront(this.panelId);
                const content = this.pui.getContentEl(this.panelId);
                if (content) setPanelContent(content, 'loading');
                this._doRun(task, projectId, content);
                return;
            }

            const PUI = global.PlasticineUI;
            if (!PUI) {
                const el = document.createElement('div');
                el.className = 'pui-panel pui-slot-floating';
                el.style.cssText = 'position:fixed;width:420px;height:320px;left:50px;top:80px;z-index:9999;';
                el.innerHTML = `
          <div class="pui-panel-header"><span class="pui-panel-title">Task</span></div>
          <div class="pui-panel-content"></div>`;
                document.body.appendChild(el);
                const content = el.querySelector('.pui-panel-content');
                setPanelContent(content, 'loading');
                this._doRunFallback(task, projectId, content, el);
                return;
            }

            if (!this.pui) this.pui = new PUI({ mount: document.body });
            const contentHTML = '<div class="task-flow-preloader"><div class="task-flow-spinner"></div><p>Creating session…</p></div>';
            this.panel = this.pui.addPanel({
                id: 'task-flow-panel',
                title: 'Task',
                slot: 'floating',
                critical: false,
                contentHTML,
                onClose: () => {
                    if (this.fixed) return;
                    this.pui.removePanel('task-flow-panel');
                    this.panelId = null;
                    this.panel = null;
                    // Hide message input when task panel is closed
                    if (window.hideMessageInput) window.hideMessageInput();
                }
            });
            this.panelId = 'task-flow-panel';
            this.fixed = false;
            const content = this.pui.getContentEl(this.panelId);
            this._doRun(task, projectId, content);
            // Show message input when task panel is created
            if (window.showMessageInput) window.showMessageInput();
        },

        async _doRun(task, projectId, contentEl) {
            try {
                // New protocol: send task directly in session creation
                const sessionRes = await request('POST', '/sessions', { projectId, task, title: task.slice(0, 50) });
                
                // Extract session ID - handle both { session: {...}, serverResponse: {...} } and { id: ... }
                const sessionData = sessionRes?.session || sessionRes;
                const sessionId = sessionData?.id;
                const serverResponse = sessionRes?.serverResponse;
                
                if (!sessionId) throw new Error('No session id returned');

                this.fixed = true;
                this._sessionId = sessionId;
                this._projectId = projectId;
                
                // Initialize SessionStore for this session
                const store = global.SessionStore;
                if (store) {
                    store.reset(sessionId, projectId);
                    store.pushMessage({ content: task }, 'user');
                }
                
                setPanelContent(contentEl, 'fixated', { sessionId, projectId });
                if (this.panel) {
                    this.panel.setCritical?.(true);
                    this.panel.setNonClosable?.(true);
                }

                // Connect transport (SSE primary, WebSocket fallback)
                const transport = global.TransportManager;
                if (transport) {
                    updateStatus(contentEl, 'Connecting to real-time stream…');
                    await transport.connect(sessionId);
                } else if (global.SSEClient) {
                    global.SSEClient.connect(sessionId, getApiBase());
                }

                const normalizedResponse = serverResponse?.data ?? serverResponse;

                // If server returns immediate execute, use it
                if (normalizedResponse?.execute) {
                    applyExecuteResponse(normalizedResponse, contentEl, 'firstResponse');
                    return;
                }

                // Otherwise wait for first response via SSE (no HTTP polling)
                updateStatus(contentEl, 'Waiting for first response via SSE…');
                const { status, result, execute, context } = await waitForFirstResponse();
                
                if (status === 'timeout') {
                    updateStatus(contentEl, 'Timeout waiting for response');
                    return;
                }
                
                if (execute) {
                    applyExecuteResponse({ execute, context, sessionId, projectId }, contentEl, 'firstResponse');
                    return;
                }

                // Fallback: if server requires explicit /next call
                updateStatus(contentEl, 'Initializing session…');
                const invokeRes = await request('POST', `/sessions/${encodeURIComponent(sessionId)}/next`, { task, sessionId, projectId });
                
                if (invokeRes?.execute) {
                    applyExecuteResponse(invokeRes, contentEl, 'firstResponse');
                } else {
                    // Wait for SSE response
                    updateStatus(contentEl, 'Waiting for first response…');
                    const { status: ws, execute: wexec, context: wctx } = await waitForFirstResponse();
                    if (ws === 'timeout') {
                        updateStatus(contentEl, 'Timeout waiting for response');
                        return;
                    }
                    applyExecuteResponse({ execute: wexec, context: wctx, sessionId, projectId }, contentEl, 'firstResponse');
                }
            } catch (err) {
                if (contentEl) {
                    contentEl.innerHTML = '<div class="task-flow-error">' + escapeHtml(String(err?.message || err)) + '</div>';
                }
                window.addNotification?.(String(err?.message || err), 'error');
            }
        },

        async sendChoice(choiceId, contentEl) {
            const sessionId = this._sessionId;
            const projectId = this._projectId;
            if (!sessionId || !projectId) {
                window.addNotification?.('Session or project missing', 'error');
                return;
            }
            const choiceText = getChoiceLabel(choiceId);
            if (choiceText) {
                global.SessionViewModel?.pushMessage({ content: choiceText }, 'user');
            }
            
            // New protocol: send result with action-key shape
            const context = TaskFlow._buildContext({
                execution: {
                    action: choiceId,
                    step: 'action-selection'
                }
            });
            const requestBody = {
                projectId,
                context,
                result: { choice: choiceId }
            };
            
            setPanelContent(contentEl, 'sending', null);
            try {
                const invokeRes = await request('POST', `/sessions/${encodeURIComponent(sessionId)}/next`, requestBody);
                const outcome = await processNextResponse(contentEl, invokeRes);
                if (outcome !== 'ok') return;
            } catch (err) {
                contentEl.innerHTML = '<div class="task-flow-error">' + escapeHtml(String(err?.message || err)) + '</div>';
                window.addNotification?.(String(err?.message || err), 'error');
            }
        },

        async sendMessageResult(messageText, contentEl) {
            const sessionId = this._sessionId;
            const projectId = this._projectId;
            if (!sessionId || !projectId) {
                window.addNotification?.('Session or project missing', 'error');
                return;
            }

            const payload = (messageText || '').trim() || 'continue';
            global.SessionViewModel?.pushMessage({ content: payload }, 'user');

            const context = TaskFlow._buildContext();

            setPanelContent(contentEl, 'sending', null);
            try {
                const requestBody = {
                    projectId,
                    context,
                    result: { message: payload }
                };
                const invokeRes = await request('POST', `/sessions/${encodeURIComponent(sessionId)}/next`, requestBody);
                const outcome = await processNextResponse(contentEl, invokeRes);
                if (outcome !== 'ok') return;
            } catch (err) {
                contentEl.innerHTML = '<div class="task-flow-error">' + escapeHtml(String(err?.message || err)) + '</div>';
                window.addNotification?.(String(err?.message || err), 'error');
            }
        },

        _buildContext(overrides = {}) {
            const base = TaskFlow._lastContext && typeof TaskFlow._lastContext === 'object'
                ? { ...TaskFlow._lastContext }
                : {};
            const context = { ...base };
            if (!context.task && TaskFlow._currentTask) {
                context.task = TaskFlow._currentTask;
            }
            const executionBase = context.execution && typeof context.execution === 'object'
                ? { ...context.execution }
                : {};
            const executionOverrides = overrides.execution || {};
            const execution = { ...executionBase, ...executionOverrides };
            if (overrides.action) execution.action = overrides.action;
            if (overrides.step) execution.step = overrides.step;
            if (Object.keys(execution).length) {
                context.execution = execution;
            }
            if (overrides.task) {
                context.task = overrides.task;
            }
            return context;
        },

        async _doRunFallback(task, projectId, contentEl, panelEl) {
            try {
                const sessionRes = await request('POST', '/sessions', { projectId, task, title: task.slice(0, 50) });
                const sessionId = sessionRes?.id ?? sessionRes?.sessionId;
                if (!sessionId) throw new Error('No session id returned');

                this.fixed = true;
                this._sessionId = sessionId;
                this._projectId = projectId;
                
                // Initialize store
                const store = global.SessionStore;
                if (store) {
                    store.reset(sessionId, projectId);
                    store.pushMessage({ content: task }, 'user');
                }
                
                setPanelContent(contentEl, 'fixated', { sessionId, projectId });
                const statusEl = contentEl?.querySelector('.task-flow-status');
                if (statusEl) statusEl.textContent = 'Connecting…';

                // Connect transport
                const transport = global.TransportManager;
                if (transport) {
                    await transport.connect(sessionId);
                } else if (global.SSEClient) {
                    global.SSEClient.connect(sessionId, getApiBase());
                }

                if (statusEl) statusEl.textContent = 'Waiting for first response via SSE…';
                
                // Wait for response via SSE (no polling)
                const invokeRes = await request('POST', `/sessions/${encodeURIComponent(sessionId)}/next`, { task, sessionId, projectId });
                
                if (invokeRes?.execute) {
                    applyExecuteResponse(invokeRes, contentEl, 'firstResponse');
                } else {
                    const { status, execute, context } = await waitForFirstResponse();
                    if (status === 'timeout') {
                        if (statusEl) statusEl.textContent = 'Timeout';
                        return;
                    }
                    applyExecuteResponse({ execute, context, sessionId, projectId }, contentEl, 'firstResponse');
                }
            } catch (err) {
                if (contentEl) contentEl.innerHTML = '<div class="task-flow-error">' + escapeHtml(String(err?.message || err)) + '</div>';
                window.addNotification?.(String(err?.message || err), 'error');
            }
        }
    };

    /**
     * Process response without polling
     * Uses immediate response or waits for SSE via store
     */
    async function processNextResponse(contentEl, response) {
        // If response has execute immediately, use it
        if (response?.execute) {
            applyExecuteResponse(response, contentEl, 'response');
            return 'ok';
        }
        
        // Otherwise wait for SSE event
        updateStatus(contentEl, 'Waiting for response…');
        const { status, execute, context } = await waitForFirstResponse();
        
        if (status === 'timeout') {
            if (contentEl) contentEl.innerHTML = '<div class="task-flow-error">Timeout</div>';
            return 'timeout';
        }
        
        if (execute) {
            applyExecuteResponse({ execute, context, sessionId: TaskFlow._sessionId, projectId: TaskFlow._projectId }, contentEl, 'response');
            return 'ok';
        }
        
        // Fallback: empty response
        applyExecuteResponse(response ?? {}, contentEl, 'response');
        return 'ok';
    }

    function applyExecuteResponse(resultData, contentEl, stateName = 'response') {
        const sessionId = TaskFlow._sessionId;
        const projectId = TaskFlow._projectId;
        const ctx = resultData?.context ?? resultData?.data?.context;
        const exec = resultData?.execute ?? resultData?.data?.execute;
        TaskFlow._lastContext = ctx != null ? (typeof ctx === 'object' ? ctx : {}) : {};
        const responseData = { context: ctx, execute: exec, sessionId, projectId };
        TaskFlow._lastResponse = responseData;
        setPanelContent(contentEl, stateName, responseData, TaskFlow);
        updateSessionViewModel(sessionId, projectId, ctx, exec);
    }

    function updateSessionViewModel(sessionId, projectId, context, execute) {
        const vm = global.SessionViewModel;
        if (!vm) return;
        if (sessionId) vm.setSession(sessionId);
        if (projectId) vm.setProject(projectId);
        if (Array.isArray(context?.messages)) {
            vm.setMessages(context?.messages);
        }
        if (execute) {
            vm.setExecute(execute);
            if (execute.message) {
                vm.pushMessage(execute.message, 'assistant');
            }
        }
    }

    function getChoiceLabel(choiceId) {
        if (!choiceId) return '';
        const execute = TaskFlow._lastResponse?.execute;
        const choices = execute?.form?.choices || [];
        const match = choices.find(choice => choice.id === choiceId || choice.value === choiceId);
        return String(match?.label || match?.value || match?.id || choiceId);
    }

    if (typeof window !== 'undefined') {
        window.TaskFlow = TaskFlow;
        
        // Task 3.1-3.3: Integrate with SessionManager events
        const sessionMgr = global.SessionManager;
        if (sessionMgr && typeof sessionMgr.on === 'function') {
            // Listen for execution step updates
            sessionMgr.on('executionStep', (data) => {
                console.log('[TaskFlow] Execution step:', data);
                // Re-render panel if active to show step
                if (TaskFlow.panelId && TaskFlow.pui) {
                    const content = TaskFlow.pui.getContentEl(TaskFlow.panelId);
                    if (content && TaskFlow._lastResponse) {
                        renderExecute(content, TaskFlow._lastResponse.execute, TaskFlow._lastResponse, TaskFlow);
                    }
                }
            });
            
            // Listen for execution progress updates
            sessionMgr.on('executionProgress', (data) => {
                console.log('[TaskFlow] Execution progress:', data);
                // Update progress bar
                if (global.ProgressIndicators) {
                    global.ProgressIndicators.handleExecutionProgress(data);
                }
                // Re-render panel to show progress
                if (TaskFlow.panelId && TaskFlow.pui) {
                    const content = TaskFlow.pui.getContentEl(TaskFlow.panelId);
                    if (content && TaskFlow._lastResponse) {
                        renderExecute(content, TaskFlow._lastResponse.execute, TaskFlow._lastResponse, TaskFlow);
                    }
                }
            });
            
            // Listen for final result
            sessionMgr.on('finalResultReceived', (data) => {
                console.log('[TaskFlow] Final result:', data);
                // Re-render panel to show completion
                if (TaskFlow.panelId && TaskFlow.pui) {
                    const content = TaskFlow.pui.getContentEl(TaskFlow.panelId);
                    if (content && TaskFlow._lastResponse) {
                        // Add finalResult to the response
                        const responseWithFinal = {
                            ...TaskFlow._lastResponse,
                            execute: {
                                ...TaskFlow._lastResponse.execute,
                                finalResult: data
                            }
                        };
                        renderExecute(content, responseWithFinal.execute, responseWithFinal, TaskFlow);
                    }
                }
            });
        }
    }
})(typeof window !== 'undefined' ? window : globalThis);
