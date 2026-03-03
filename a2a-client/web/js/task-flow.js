/**
 * Task flow: input + Send → create session (api-server) → fixate IDs → invoke server → first response.
 * Panel: preloader → then non-closable plasticine with session id + first response.
 */

(function (global) {
    function getApiBase() {
        const base = (global.apiIntegration && global.apiIntegration.serverUrl) || (global.AppBoot && global.AppBoot.config && global.AppBoot.config.serverUrl) || '/api/v1';
        return String(base).replace(/\/?$/, '');
    }
    const POLL_INTERVAL_MS = 800;
    const POLL_MAX_ATTEMPTS = 120;

    function getHeaders() {
        const h = { 'Content-Type': 'application/json' };
        const cfg = window.apiIntegration?.token;
        if (cfg) h['Authorization'] = 'Bearer ' + cfg;
        return h;
    }

    async function request(method, path, body = null) {
        const base = getApiBase();
        const url = path.startsWith('http') ? path : (path.startsWith('/') ? base + path : base + '/' + path);
        const res = await fetch(url, { method, headers: getHeaders(), body: body ? JSON.stringify(body) : undefined });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error?.message || data?.error || 'Request failed');
        return data?.data ?? data;
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
        const form = execute.form;
        const message = execute.message;
        if (form && Array.isArray(form.choices) && form.choices.length > 0) {
            const title = form.title ? `<p class="task-flow-form-title">${escapeHtml(form.title)}</p>` : '';
            const buttons = form.choices.map((c) =>
                `<button type="button" class="task-flow-choice-btn" data-choice-id="${escapeHtml(c.id)}">${escapeHtml(c.label || c.id)}</button>`
            ).join('');
            contentEl.innerHTML = `
        <div class="task-flow-response task-flow-form-wrap">
          ${title}
          <div class="task-flow-choices">${buttons}</div>
        </div>`;
            contentEl.querySelectorAll('.task-flow-choice-btn').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const choiceId = btn.getAttribute('data-choice-id');
                    if (choiceId && taskFlowRef && taskFlowRef.sendChoice) taskFlowRef.sendChoice(choiceId, contentEl);
                });
            });
            return;
        }
        if (message != null && typeof message === 'string') {
            contentEl.innerHTML = `
        <div class="task-flow-response task-flow-message-wrap">
          <p class="task-flow-message">${escapeHtml(message)}</p>
        </div>`;
            return;
        }
        const ctx = data?.context ? JSON.stringify(data.context, null, 2) : '';
        const exec = data?.execute ? JSON.stringify(data.execute, null, 2) : '';
        contentEl.innerHTML = `
        <div class="task-flow-response">
          <div class="task-flow-response-section"><strong>Context</strong><pre>${escapeHtml(ctx || '{}')}</pre></div>
          <div class="task-flow-response-section"><strong>Execute</strong><pre>${escapeHtml(exec || '{}')}</pre></div>
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

    async function pollResult(promiseId) {
        for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
            const statusRes = await request('GET', `/requests/${encodeURIComponent(promiseId)}/status`);
            const data = statusRes?.data ?? statusRes;
            const st = (typeof data === 'object' && data !== null) ? data.status : statusRes?.status ?? statusRes;
            if (st === 'completed' || st === 'failed') {
                const resultRes = await request('GET', `/requests/${encodeURIComponent(promiseId)}/result`);
                const resData = resultRes?.data ?? resultRes;
                const d = resData?.result ?? resData;
                return { status: st, result: d };
            }
            await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
        }
        return { status: 'timeout', result: null };
    }

    const TaskFlow = {
        panelId: null,
        panel: null,
        pui: null,
        fixed: false,
        _sessionId: null,
        _projectId: null,
        _lastContext: null,

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
                }
            });
            this.panelId = 'task-flow-panel';
            this.fixed = false;
            const content = this.pui.getContentEl(this.panelId);
            this._doRun(task, projectId, content);
        },

        async _doRun(task, projectId, contentEl) {
            try {
                const sessionRes = await request('POST', '/sessions', { projectId, task, title: task.slice(0, 50) });
                const sessionId = sessionRes?.id ?? sessionRes?.sessionId;
                if (!sessionId) throw new Error('No session id returned');

                this.fixed = true;
                setPanelContent(contentEl, 'fixated', { sessionId, projectId });
                if (this.panel) {
                    this.panel.setCritical?.(true);
                    const closeBtn = this.panel.container?.querySelector('[data-action="close"]');
                    if (closeBtn) closeBtn.style.display = 'none';
                }

                updateStatus(contentEl, 'Calling server…');
                const invokeRes = await request('POST', '/invoke', { task, sessionId, projectId });
                const promiseId = invokeRes?.promiseId ?? invokeRes?.data?.promiseId;
                if (!promiseId) throw new Error('No promiseId');

                updateStatus(contentEl, 'Waiting for first response…');
                const { status, result } = await pollResult(promiseId);
                if (status === 'timeout') {
                    updateStatus(contentEl, 'Timeout waiting for response');
                    return;
                }
                if (status === 'failed') {
                    updateStatus(contentEl, 'Request failed');
                    return;
                }

                const ctx = result?.context ?? result?.data?.context;
                const exec = result?.execute ?? result?.data?.execute;
                this._sessionId = sessionId;
                this._projectId = projectId;
                this._lastContext = ctx != null ? (typeof ctx === 'object' ? ctx : {}) : {};
                setPanelContent(contentEl, 'firstResponse', { context: ctx, execute: exec, sessionId, projectId }, this);
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
            const prevContext = this._lastContext;
            if (!sessionId || !projectId || !prevContext) {
                window.addNotification?.('Session or context missing', 'error');
                return;
            }
            const context = {
                ...prevContext,
                session_id: sessionId,
                action: 'approve_action',
                selectedAction: { actionId: choiceId },
            };
            setPanelContent(contentEl, 'sending', null);
            try {
                const invokeRes = await request('POST', '/invoke', { context, sessionId, projectId });
                const promiseId = invokeRes?.promiseId ?? invokeRes?.data?.promiseId;
                if (!promiseId) throw new Error('No promiseId');
                const { status, result: res } = await pollResult(promiseId);
                if (status === 'timeout') {
                    setPanelContent(contentEl, 'response', { execute: {} }, this);
                    contentEl.innerHTML = '<div class="task-flow-error">Timeout</div>';
                    return;
                }
                if (status === 'failed') {
                    setPanelContent(contentEl, 'response', { execute: {} }, this);
                    contentEl.innerHTML = '<div class="task-flow-error">Request failed</div>';
                    return;
                }
                const ctx = res?.context ?? res?.data?.context;
                const exec = res?.execute ?? res?.data?.execute;
                this._lastContext = ctx != null ? (typeof ctx === 'object' ? ctx : {}) : {};
                setPanelContent(contentEl, 'response', { context: ctx, execute: exec, sessionId, projectId }, this);
            } catch (err) {
                contentEl.innerHTML = '<div class="task-flow-error">' + escapeHtml(String(err?.message || err)) + '</div>';
                window.addNotification?.(String(err?.message || err), 'error');
            }
        },

        async _doRunFallback(task, projectId, contentEl, panelEl) {
            try {
                const sessionRes = await request('POST', '/sessions', { projectId, task, title: task.slice(0, 50) });
                const sessionId = sessionRes?.id ?? sessionRes?.sessionId;
                if (!sessionId) throw new Error('No session id returned');

                this.fixed = true;
                setPanelContent(contentEl, 'fixated', { sessionId, projectId });
                const statusEl = contentEl?.querySelector('.task-flow-status');
                if (statusEl) statusEl.textContent = 'Calling server…';

                const invokeRes = await request('POST', '/invoke', { task, sessionId, projectId });
                const promiseId = invokeRes?.promiseId ?? invokeRes?.data?.promiseId;
                if (!promiseId) throw new Error('No promiseId');

                if (statusEl) statusEl.textContent = 'Waiting for first response…';
                const { status, result } = await pollResult(promiseId);
                if (status === 'timeout') {
                    if (statusEl) statusEl.textContent = 'Timeout';
                    return;
                }
                if (status === 'failed') {
                    if (statusEl) statusEl.textContent = 'Failed';
                    return;
                }

                const ctx = result?.context ?? result?.data?.context;
                const exec = result?.execute ?? result?.data?.execute;
                this._sessionId = sessionId;
                this._projectId = projectId;
                this._lastContext = ctx != null ? (typeof ctx === 'object' ? ctx : {}) : {};
                setPanelContent(contentEl, 'firstResponse', { context: ctx, execute: exec, sessionId, projectId }, this);
            } catch (err) {
                if (contentEl) contentEl.innerHTML = '<div class="task-flow-error">' + escapeHtml(String(err?.message || err)) + '</div>';
                window.addNotification?.(String(err?.message || err), 'error');
            }
        }
    };

    if (typeof window !== 'undefined') {
        window.TaskFlow = TaskFlow;
    }
})(typeof window !== 'undefined' ? window : globalThis);
