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

    const SELECTED_PROJECT_KEY = 'a2a_selected_project';

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

    function saveSelectedProject(projectId) {
        if (!projectId) return;
        try {
            localStorage.setItem(SELECTED_PROJECT_KEY, projectId);
        } catch (e) {}
    }

    function renderExecute(contentEl, execute, data, taskFlowRef) {
        if (!contentEl || !execute) return;
        
        // Use ActionHandler for uniform processing
        const handler = global.ActionHandler;
        const processed = handler?.processExecute?.(execute) || { type: 'unknown', data: execute };
        
        const context = data?.context;
        const execution = context?.execution;
        
        // Build execution step display
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

        // Build progress bar display
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

        // Build finalResult display
        let finalResultHtml = '';
        if (execution?.status === 'completed' || execute.finalResult) {
            const finalResult = execute.finalResult || {};
            const summary = finalResult.summary || {};
            const actionName = finalResult.action || execution?.action || 'unknown';
            
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
        
        // Uniform rendering based on action type
        switch (processed.type) {
            case 'form':
                renderForm(contentEl, processed.data, executionStepHtml, progressBarHtml, finalResultHtml, taskFlowRef);
                return;
                
            case 'message':
                renderMessage(contentEl, processed.data, executionStepHtml, progressBarHtml, finalResultHtml, taskFlowRef);
                return;
                
            case 'script':
            case 'rag-search':
            case 'read-file':
            case 'write-file':
            case 'execute-command':
                renderClientAction(contentEl, processed.type, processed.data, executionStepHtml, progressBarHtml, finalResultHtml, taskFlowRef);
                return;
                
            default:
                // Debug view for unknown types
                renderDebug(contentEl, data, executionStepHtml, progressBarHtml, finalResultHtml, taskFlowRef);
        }
    }

    function renderForm(contentEl, form, executionStepHtml, progressBarHtml, finalResultHtml, taskFlowRef) {
        const hasChoices = form?.choices?.length > 0;
        const hasInput = form?.input?.length > 0;

        if (!hasChoices && !hasInput) {
            renderDebug(contentEl, { execute: { form } }, executionStepHtml, progressBarHtml, finalResultHtml, taskFlowRef);
            return;
        }

        let formContent = '';

        // Render choices (buttons)
        if (hasChoices) {
            const title = form.title ? `<p class="task-flow-form-title">${escapeHtml(form.title)}</p>` : '';
            const buttons = form.choices.map((c) =>
                `<button type="button" class="task-flow-choice-btn" data-choice-id="${escapeHtml(c.id)}">${escapeHtml(c.label || c.id)}</button>`
            ).join('');
            formContent += `${title}<div class="task-flow-choices">${buttons}</div>`;
        }

        // Render input fields (only when server explicitly sends form.input)
        let inputAreaHtml = '';
        if (hasInput) {
            const inputs = form.input.map((field) => {
                if (field.type === 'text' || field.type === 'string') {
                    return `<input type="text" name="${escapeHtml(field.name)}" class="task-flow-form-input" placeholder="${escapeHtml(field.label || field.name)}" ${field.required ? 'required' : ''}>`;
                }
                return '';
            }).join('');
            formContent += `<div class="task-flow-form-inputs">${inputs}</div>`;
            inputAreaHtml = getInputAreaHtml();
        }

        contentEl.innerHTML = `
        <div class="task-flow-response task-flow-form-wrap">
          ${executionStepHtml}
          ${progressBarHtml}
          ${formContent}
          ${finalResultHtml}
        </div>
        ${inputAreaHtml}`;

        // Bind choice buttons
        if (hasChoices) {
            contentEl.querySelectorAll('.task-flow-choice-btn').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const choiceId = btn.getAttribute('data-choice-id');
                    if (choiceId && taskFlowRef?.sendChoice) {
                        taskFlowRef.sendChoice(choiceId, contentEl);
                    }
                });
            });
        }

        // Bind input handlers only if input area exists
        if (hasInput) {
            bindInputHandlers(contentEl, taskFlowRef);
        }
    }

    function renderMessage(contentEl, message, executionStepHtml, progressBarHtml, finalResultHtml, taskFlowRef) {
        const messageContent = typeof message === 'string' ? message : (message.content || message.text || '');
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
                taskFlowRef.sendMessageResult(decoded || 'continue', contentEl);
            }
        });
    }

    function renderClientAction(contentEl, actionType, data, executionStepHtml, progressBarHtml, finalResultHtml, taskFlowRef) {
        // Client-side actions (script, rag-search, file ops, commands)
        const typeLabels = {
            'script': 'Script Execution',
            'rag-search': 'RAG Search',
            'read-file': 'File Read',
            'write-file': 'File Write',
            'execute-command': 'Command Execution'
        };

        contentEl.innerHTML = `
        <div class="task-flow-response task-flow-client-action">
          ${executionStepHtml}
          ${progressBarHtml}
          <div class="client-action-header">${typeLabels[actionType] || actionType}</div>
          <pre class="client-action-data">${escapeHtml(JSON.stringify(data, null, 2))}</pre>
          <div class="client-action-status">Waiting for client execution...</div>
          ${finalResultHtml}
        </div>`;
    }

    function renderDebug(contentEl, data, executionStepHtml, progressBarHtml, finalResultHtml, taskFlowRef) {
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

    function bindInputHandlers(contentEl, taskFlowRef) {
        const input = contentEl.querySelector('#taskMessageInput');
        const sendBtn = contentEl.querySelector('#taskSendMessage');

        if (!input || !sendBtn || !taskFlowRef) return;

        const sendHandler = () => {
            const text = input.value.trim();
            if (!text) return;
            input.value = '';
            if (taskFlowRef.sendMessageResult) {
                taskFlowRef.sendMessageResult(text, contentEl);
            }
        };

        sendBtn.addEventListener('click', sendHandler);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendHandler();
        });
    }

    function getInputAreaHtml() {
        return `
        <div class="task-flow-input-area">
            <div class="message-input-container">
                <input type="text" id="taskMessageInput" class="message-input-field" placeholder="Type your message…" autocomplete="off">
                <button type="button" id="taskSendMessage" class="message-send-btn">Send</button>
            </div>
        </div>`;
    }

    function setPanelContent(contentEl, state, data, taskFlowRef) {
        if (!contentEl) return;
        if (state === 'loading') {
            contentEl.innerHTML = `<div class="task-flow-preloader"><div class="task-flow-spinner"></div><p>Creating session…</p></div>`;
            return;
        }
        if (state === 'sending') {
            contentEl.innerHTML = `<div class="task-flow-preloader"><div class="task-flow-spinner"></div><p>Sending…</p></div>`;
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
            const sel = document.getElementById('projectSelect');
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

            // Save project selection when manually changed
            if (sel) {
                sel.addEventListener('change', () => {
                    if (sel.value) {
                        saveSelectedProject(sel.value);
                    }
                });
            }

            this._ensureProjectSelect();
            // Also try to restore selection immediately in case projects are already loaded
            this._restoreProjectSelection();
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

                // Restore saved project selection after projects are loaded
                this._restoreProjectSelection();
            } catch (e) {
                console.warn('[TaskFlow] Failed to load projects:', e);
            }
        },

        _restoreProjectSelection() {
            const sel = document.getElementById('projectSelect');
            if (!sel) return;

            const savedProjectId = localStorage.getItem(SELECTED_PROJECT_KEY);
            if (savedProjectId) {
                const option = Array.from(sel.options).find(opt => opt.value === savedProjectId);
                if (option) {
                    sel.value = savedProjectId;
                    console.log('[TaskFlow] Restored selected project:', savedProjectId);
                } else {
                    console.log('[TaskFlow] Saved project not found in options:', savedProjectId);
                }
            }
        },

        run(task, projectId) {
            if (task) this._currentTask = task;

            // Save selected project
            if (projectId) {
                saveSelectedProject(projectId);
                // Also update the select if it exists
                const sel = document.getElementById('projectSelect');
                if (sel && sel.value !== projectId) {
                    sel.value = projectId;
                }
            }

            // Use SessionStore instead of legacy SessionViewModel
            const store = global.SessionStore;
            store?.reset();
            store?.setProject(projectId);
            if (task) {
                store?.pushMessage({ content: task }, 'user');
            }
            
            // Check if task panel already exists
            const pm = global.PanelManager;
            if (this.panelId && pm?.get(this.panelId)) {
                pm.bringToFront(this.panelId);
                const panel = pm.get(this.panelId);
                if (panel) {
                    setPanelContent(panel.getContentEl(), 'loading', null, this);
                    this._doRun(task, projectId, panel.getContentEl());
                }
                return;
            }

            // Create task panel using PanelManager
            const contentHTML = '<div class="task-flow-preloader"><div class="task-flow-spinner"></div><p>Creating session…</p></div>';
            this.panel = pm?.open('task', {
                id: 'task-flow-panel',
                title: 'Task',
                critical: true,  // Critical so it minimizes instead of closes
                onClose: () => {
                    if (this.fixed) return;
                    pm?.close('task-flow-panel');
                    this.panelId = null;
                    this.panel = null;
                    // Panel closed callback
                }
            });
            
            if (this.panel) {
                this.panel.setContent(contentHTML);
                this.panelId = 'task-flow-panel';
                this.fixed = false;
                const content = this.panel.getContentEl();
                this._doRun(task, projectId, content);
            } else {
                // Fallback: manual DOM creation if PanelManager not available
                const el = document.createElement('div');
                el.className = 'task-flow-panel-fallback';
                el.style.cssText = 'position:fixed;width:420px;height:320px;left:50px;top:80px;z-index:9999;background:#1e1e2e;border:1px solid #313244;border-radius:8px;';
                el.innerHTML = `
          <div style="padding:8px 12px;background:#252536;border-bottom:1px solid #313244;"><span style="font-weight:500;">Task</span></div>
          <div class="task-flow-content"></div>`;
                document.body.appendChild(el);
                const content = el.querySelector('.task-flow-content');
                setPanelContent(content, 'loading', null, this);
                this._doRunFallback(task, projectId, content, el);
            }
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
                
                setPanelContent(contentEl, 'fixated', { sessionId, projectId }, TaskFlow);
                // Panel is already created as critical, no need to update

                // Connect transport (SSE primary, WebSocket fallback)
                const transport = global.TransportManager;
                if (transport) {
                    updateStatus(contentEl, 'Connecting to real-time stream…');
                    await transport.connect(sessionId);
                } else if (global.SSEClient) {
                    global.SSEClient.connect(sessionId, getApiBase());
                }

                // Handle sync response: serverResponse.data.execute
                const normalizedResponse = serverResponse?.data ?? serverResponse;
                const syncExecute = normalizedResponse?.execute;

                // DEBUG: Log what server returned
                console.log('[TaskFlow] Session created:', { sessionId, serverResponse, normalizedResponse, syncExecute });

                // If server returns immediate execute (sync response), use it
                if (syncExecute) {
                    console.log('[TaskFlow] Immediate execute received (sync):', syncExecute);
                    applyExecuteResponse({
                        execute: syncExecute,
                        context: normalizedResponse?.context,
                        sessionId,
                        projectId
                    }, contentEl, 'firstResponse');
                    return;
                }

                // Otherwise wait for first response via SSE (no HTTP polling)
                console.log('[TaskFlow] No immediate execute, waiting for SSE...');
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

            // Show sending state with choice label
            const choiceLabel = getChoiceLabel(choiceId);
            contentEl.innerHTML = `
                <div class="task-flow-response">
                    <div class="task-flow-user-message">
                        <strong>Вы выбрали:</strong> ${escapeHtml(choiceLabel)}
                    </div>
                    <div class="task-flow-preloader" style="margin-top: 16px;">
                        <div class="task-flow-spinner"></div>
                        <p>Отправка...</p>
                    </div>
                </div>`;

            try {
                const handler = global.ActionHandler;
                let result;

                if (handler) {
                    result = await handler.sendChoice(sessionId, projectId, choiceId);
                } else {
                    // Fallback: manual submission
                    const context = this._buildContext();
                    result = await request('POST', `/sessions/${encodeURIComponent(sessionId)}/result`, {
                        projectId,
                        context,
                        result: { choice: choiceId }
                    });
                }

                // Check for immediate execute in response (sync)
                if (result?.execute) {
                    applyExecuteResponse(result, contentEl, 'response');
                    return;
                }

                // Wait for response via SSE
                const outcome = await waitForFirstResponse(60000);
                if (outcome.execute) {
                    applyExecuteResponse(outcome, contentEl, 'response');
                } else if (outcome.status === 'timeout') {
                    contentEl.innerHTML = '<div class="task-flow-error">Timeout waiting for response</div>';
                }
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

            const displayText = (messageText || '').trim() || 'continue';

            // Show sending state with user message
            contentEl.innerHTML = `
                <div class="task-flow-response">
                    <div class="task-flow-user-message">
                        <strong>Вы:</strong> ${escapeHtml(displayText)}
                    </div>
                    <div class="task-flow-preloader" style="margin-top: 16px;">
                        <div class="task-flow-spinner"></div>
                        <p>Отправка...</p>
                    </div>
                </div>`;

            try {
                const handler = global.ActionHandler;
                let result;

                if (handler) {
                    result = await handler.sendMessage(sessionId, projectId, displayText);
                } else {
                    // Fallback: manual submission
                    const context = this._buildContext();
                    result = await request('POST', `/sessions/${encodeURIComponent(sessionId)}/result`, {
                        projectId,
                        context,
                        result: { message: displayText }
                    });
                }

                // Check for immediate execute in response (sync)
                if (result?.execute) {
                    applyExecuteResponse(result, contentEl, 'response');
                    return;
                }

                // Wait for response via SSE
                const outcome = await waitForFirstResponse(60000);
                if (outcome.execute) {
                    applyExecuteResponse(outcome, contentEl, 'response');
                } else if (outcome.status === 'timeout') {
                    contentEl.innerHTML = '<div class="task-flow-error">Timeout waiting for response</div>';
                }
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
            if (overrides.task) {
                context.task = overrides.task;
            } else if (!context.task && TaskFlow._currentTask) {
                context.task = TaskFlow._currentTask;
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
                ...executionOverrides
            };
            if (!execution.action && storeExecution?.action) {
                execution.action = storeExecution.action;
            }
            if (!execution.step && storeExecution?.step) {
                execution.step = storeExecution.step;
            }
            if (Object.keys(execution).length) {
                context.execution = execution;
            } else if (storeExecution) {
                context.execution = storeExecution;
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
                
                setPanelContent(contentEl, 'fixated', { sessionId, projectId }, TaskFlow);
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
        
        // Integrate with SessionStore events (replaces SessionManager events)
        const store = global.SessionStore;
        if (store && typeof store.on === 'function') {
            // Listen for execute updates (includes step, progress, finalResult)
            store.on('execute', (execute) => {
                console.log('[TaskFlow] Execute updated:', execute);
                
                // Re-render panel if active
                if (TaskFlow.panelId) {
                    const pm = global.PanelManager;
                    const panel = pm?.get(TaskFlow.panelId);
                    if (panel && TaskFlow._lastResponse) {
                        const content = panel.getContentEl();
                        if (content) {
                            // Merge any finalResult from execute
                            const response = {
                                ...TaskFlow._lastResponse,
                                execute: execute
                            };
                            renderExecute(content, execute, response, TaskFlow);
                        }
                    }
                }
                
                // Update progress indicators
                if (global.ProgressIndicators && execute?.execution?.progress !== undefined) {
                    global.ProgressIndicators.handleExecutionProgress({
                        progress: execute.execution.progress,
                        step: execute.execution.step,
                        action: execute.execution.action
                    });
                }
            });
        }
        /**
         * Restore panel UI from saved session state
         */
        restorePanel(state) {
            if (!state?.sessionId || !state?.execute) return false;

            const pm = global.PanelManager;
            if (!pm) return false;

            // Check if panel already exists
            let panel = pm.get('task-flow-panel');
            if (!panel) {
                panel = pm.open('task', {
                    id: 'task-flow-panel',
                    title: 'Task',
                    critical: true,
                    onClose: () => {
                        if (this.fixed) return;
                        pm?.close('task-flow-panel');
                        this.panelId = null;
                        this.panel = null;
                    }
                });
            } else {
                panel.restore();
                pm.bringToFront('task-flow-panel');
            }

            if (!panel) return false;

            this.panelId = 'task-flow-panel';
            this.panel = panel;
            this.fixed = true;
            this._sessionId = state.sessionId;
            this._projectId = state.projectId;
            this._lastResponse = {
                sessionId: state.sessionId,
                projectId: state.projectId,
                execute: state.execute,
                context: state.context
            };
            this._lastContext = state.context;

            // Render the execute state
            const contentEl = panel.getContentEl();
            if (contentEl) {
                renderExecute(contentEl, state.execute, this._lastResponse, this);
            }

            return true;
        }
    };

    // Expose renderExecute globally for session restore
    global.renderTaskExecute = renderExecute;

    // Initialize on page load
    if (typeof window !== 'undefined') {
        window.TaskFlow = TaskFlow;

        // Integrate with SessionStore events (replaces SessionManager events)
        const store = global.SessionStore;
        if (store && typeof store.on === 'function') {
            // Listen for execute updates (includes step, progress, finalResult)
            store.on('execute', (execute) => {
                console.log('[TaskFlow] Execute updated:', execute);

                // Re-render panel if active
                if (TaskFlow.panelId) {
                    const pm = global.PanelManager;
                    const panel = pm?.get(TaskFlow.panelId);
                    if (panel && TaskFlow._lastResponse) {
                        const content = panel.getContentEl();
                        if (content) {
                            // Merge any finalResult from execute
                            const response = {
                                ...TaskFlow._lastResponse,
                                execute: execute
                            };
                            renderExecute(content, execute, response, TaskFlow);
                        }
                    }
                }

                // Update progress indicators
                if (global.ProgressIndicators && execute?.execution?.progress !== undefined) {
                    global.ProgressIndicators.handleExecutionProgress({
                        progress: execute.execution.progress,
                        step: execute.execution.step,
                        action: execute.execution.action
                    });
                }
            });

            // Handle session restore event
            store.on('restore', (state) => {
                console.log('[TaskFlow] Restoring session:', state);
                if (state?.execute) {
                    TaskFlow.restorePanel(state);
                }
            });
        }
    }
})(typeof window !== 'undefined' ? window : globalThis);
