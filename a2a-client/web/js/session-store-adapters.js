/**
 * Session Store Adapters - Backward compatibility layer
 * Wraps SessionStore to provide legacy SessionManager/SessionViewModel APIs
 * Allows gradual migration without breaking existing code
 */

(function (global) {
    'use strict';

    const store = global.SessionStore;
    if (!store) {
        console.error('[SessionStore Adapters] SessionStore not found');
        return;
    }

    // === SessionViewModel Adapter ===
    // Proxies to SessionStore with identical API

    const SessionViewModelAdapter = {
        sessionId: null,
        projectId: null,
        messages: [],
        execute: null,
        _listeners: new Map(),

        init() {
            // Sync from store
            this.sessionId = store.sessionId;
            this.projectId = store.projectId;
            this.messages = store.messages;
            this.execute = store.execute;

            // Subscribe to store changes
            store.on('reset', () => this._forward('reset', store.getState()));
            store.on('session', (id) => { this.sessionId = id; this._forward('session', id); });
            store.on('project', (id) => { this.projectId = id; this._forward('project', id); });
            store.on('messages', (msgs) => { this.messages = msgs; this._forward('messages', msgs); });
            store.on('message', (msg) => this._forward('message', msg));
            store.on('execute', (exec) => { this.execute = exec; this._forward('execute', exec); });

            return this;
        },

        reset(sessionId = null, projectId = null) {
            store.reset(sessionId, projectId);
            return this;
        },

        setSession(sessionId) {
            store.setSession(sessionId);
            return this;
        },

        setProject(projectId) {
            store.setProject(projectId);
            return this;
        },

        setMessages(messages) {
            store.setMessages(messages);
            return this;
        },

        pushMessage(message, role = 'assistant') {
            store.pushMessage(message, role);
            return this;
        },

        setExecute(execute) {
            store.setExecute(execute);
            return this;
        },

        getState() {
            return store.getState();
        },

        on(event, callback) {
            if (typeof callback !== 'function') return () => {};
            if (!this._listeners.has(event)) {
                this._listeners.set(event, new Set());
            }
            this._listeners.get(event).add(callback);
            return () => this.off(event, callback);
        },

        off(event, callback) {
            this._listeners.get(event)?.delete(callback);
        },

        _forward(event, payload) {
            const handlers = this._listeners.get(event);
            if (!handlers) return;
            handlers.forEach(handler => {
                try {
                    handler(payload);
                } catch (err) {
                    console.error('[SessionViewModelAdapter] Handler failed:', err);
                }
            });
        }
    };

    // === SessionManager Adapter ===
    // Combines store state with API operations

    const SessionManagerAdapter = {
        apiBase: '/api',
        currentSessionId: null,
        currentProjectId: null,
        sessions: [],
        _listeners: new Map(),
        _taskbarContentEl: null,

        getActiveSessionId() {
            return this.currentSessionId;
        },

        setTaskbarContentEl(el) {
            this._taskbarContentEl = el;
        },

        updateActiveSessionUI(sessionId) {
            const el = this._taskbarContentEl;
            if (!el) return;
            const wrapper = el.querySelector('.taskbar-sessions-wrapper') || el;
            el.querySelectorAll('.taskbar-session-btn').forEach(btn => btn.classList.remove('active'));
            if (sessionId) {
                const btn = el.querySelector(`[data-session-id="${sessionId}"]`);
                if (btn) {
                    btn.classList.add('active');
                    this._centerActiveButton(wrapper, btn);
                }
            }
        },

        _centerActiveButton(container, activeBtn) {
            if (!container || !activeBtn) return;
            const rect = container.getBoundingClientRect();
            const btnRect = activeBtn.getBoundingClientRect();
            const scrollLeft = container.scrollLeft;
            const centerOffset = (rect.width - btnRect.width) / 2;
            const targetScroll = scrollLeft + btnRect.left - rect.left - centerOffset;
            container.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
        },

        showContextMenu(e, sessionId, btnEl) {
            e.preventDefault();
            document.querySelectorAll('.session-context-menu').forEach(menu => menu.remove());
            const menu = document.createElement('div');
            menu.className = 'session-context-menu';
            menu.style.cssText = 'position:fixed;left:' + e.clientX + 'px;top:' + e.clientY + 'px;background:var(--surface,#1e1e2e);border:1px solid var(--border,#313244);border-radius:4px;padding:4px 0;z-index:10000;min-width:120px;box-shadow:0 2px 8px rgba(0,0,0,0.3);';
            const items = [{ label: 'Close', action: 'close', icon: '\u2715' }];
            items.forEach(({ label, action, icon }) => {
                const item = document.createElement('div');
                item.className = 'context-menu-item';
                item.style.cssText = 'padding:8px 12px;cursor:pointer;display:flex;align-items:center;gap:8px;color:var(--text-primary,#cdd6f4);';
                item.textContent = icon + ' ' + label;
                item.addEventListener('click', () => {
                    if (action === 'close' && global.confirm('Close this session?')) {
                        global.WindowManager?.closeSessionWindow(sessionId);
                    }
                    menu.remove();
                });
                menu.appendChild(item);
            });
            document.body.appendChild(menu);
            const closeHandler = (ev) => {
                if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('click', closeHandler); }
            };
            setTimeout(() => document.addEventListener('click', closeHandler), 0);
        },

        init(options = {}) {
            this.apiBase = options.apiBase || this.apiBase;
            this.currentProjectId = options.projectId || null;

            // Sync from store
            this.currentSessionId = store.sessionId;
            this.currentProjectId = store.projectId || this.currentProjectId;

            // Restore active session from storage (persistence)
            (async () => {
                try {
                    const stored = await global.StorageAPI?.sessions?.getItem?.('active-session');
                    const sid = stored || null;
                    if (sid && sid !== this.currentSessionId) {
                        this.currentSessionId = sid;
                        store.setSession(sid);
                        this.updateActiveSessionUI(sid);
                        if (global.SSEClient) global.SSEClient.connect(sid, this.apiBase);
                    }
                } catch (e) {}
            })();

            // Subscribe to store
            store.on('session', (id) => { this.currentSessionId = id; this._emit('sessionChanged', id); });
            store.on('execute', (exec) => {
                if (exec?.form) this._emit('formReceived', exec.form);
                if (exec?.message) this._emit('messageReceived', exec.message);
                this._emit('executeReceived', exec);
            });
            store.on('execution', (exec) => {
                if (exec?.step) this._emit('executionStep', { step: exec.step, action: exec.action, progress: exec.progress });
                if (exec?.progress !== undefined) this._emit('executionProgress', { progress: exec.progress, step: exec.step });
            });
            store.on('context', (ctx) => this._emit('contextUpdated', ctx));
            store.on('status', (status) => this._emit('statusChanged', status));
            store.on('error', (err) => this._emit('error', err));

            console.log('[SessionManagerAdapter] Initialized');
            return this;
        },

        configure(options = {}) {
            if (options.apiBase && typeof options.apiBase === 'string' && options.apiBase !== '[object Object]') {
                this.apiBase = options.apiBase.replace(/\/?$/, '');
            }
            if (options.projectId) {
                this.currentProjectId = options.projectId;
                store.setProject(options.projectId);
            }
            return this;
        },

        _getHeaders() {
            const headers = { 'Content-Type': 'application/json' };
            const token = global.apiIntegration?.token;
            if (token) headers['Authorization'] = `Bearer ${token}`;
            return headers;
        },

        async _request(method, path, body = null) {
            const url = `${this.apiBase}${path}`;
            const options = { method, headers: this._getHeaders() };
            if (body) options.body = JSON.stringify(body);

            try {
                const response = await fetch(url, options);
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    // Skip error handling for storage API 404s (expected when key doesn't exist)
                    const isStorage404 = url.includes('/api/storage/') && response.status === 404;
                    if (!isStorage404) {
                        global.ErrorHandler?.handleApiError({
                            status: response.status,
                            data,
                            error: data?.error
                        }, { module: 'SessionManagerAdapter', path: url, method });
                    }
                    throw new Error(data?.error?.message || `Request failed: ${response.status}`);
                }
                return data.data || data;
            } catch (error) {
                console.error('[SessionManagerAdapter] Request error:', error);
                global.ErrorHandler?.handleNetworkError(error, { module: 'SessionManagerAdapter', path: url, method });
                throw error;
            }
        },

        async loadSessions(projectId = null) {
            const pid = projectId || this.currentProjectId;
            if (!pid) {
                console.warn('[SessionManagerAdapter] No project ID');
                return [];
            }
            try {
                this.sessions = await this._request('GET', `/sessions?projectId=${pid}`);
                this._emit('sessionsLoaded', this.sessions);
                return this.sessions;
            } catch (error) {
                this._emit('error', error);
                return [];
            }
        },

        async createSession(options = {}) {
            const { projectId = this.currentProjectId, title = '', task = '' } = options;
            if (!projectId) throw new Error('Project ID required');

            const session = await this._request('POST', '/sessions', {
                projectId,
                title: title || `Session ${new Date().toLocaleString()}`,
                task
            });

            this.sessions.unshift(session);
            this._emit('sessionCreated', session);
            return session;
        },

        async getSession(sessionId) {
            const session = await this._request('GET', `/sessions/${sessionId}`);
            this._emit('sessionLoaded', session);
            return session;
        },

        async deleteSession(sessionId) {
            await this._request('DELETE', `/sessions/${sessionId}`);
            this.sessions = this.sessions.filter(s => s.id !== sessionId && s.sessionId !== sessionId);
            this._emit('sessionDeleted', sessionId);
            return true;
        },

        setActiveSession(sessionId) {
            this.currentSessionId = sessionId;
            store.setSession(sessionId);
            this.updateActiveSessionUI(sessionId);
            this._emit('sessionChanged', sessionId);

            try {
                if (sessionId) {
                    global.StorageAPI?.sessions?.setItem?.('active-session', sessionId).catch(() => {});
                } else {
                    global.StorageAPI?.sessions?.removeItem?.('active-session').catch(() => {});
                }
            } catch (e) {}

            if (global.SSEClient && sessionId) {
                global.SSEClient.connect(sessionId, this.apiBase);
            }
        },

        async getConversation(sessionId) {
            const sid = sessionId || this.currentSessionId;
            const session = await this._request('GET', `/sessions/${sid}`);
            const messages = session?.messages || session?.dialog || [];
            store.setMessages(messages);
            this._emit('conversationLoaded', { sessionId: sid, messages });
            return messages;
        },

        // === Legacy execute processing (now delegates to store) ===

        processExecute(execute, context = null) {
            if (context) store.setContext(context);
            if (execute) store.setExecute(execute);
            return this._classifyExecute(execute);
        },

        _classifyExecute(execute) {
            if (execute?.finalResult) {
                this._emit('finalResultReceived', execute.finalResult);
                return { type: 'finalResult', data: execute.finalResult };
            }
            if (execute?.form) return { type: 'form', data: execute.form };
            if (execute?.message) return { type: 'message', data: execute.message };
            if (execute?.script) return { type: 'script', data: execute.script };
            if (execute?.['rag-search']) return { type: 'rag-search', data: execute['rag-search'] };
            if (execute?.['read-file']) return { type: 'read-file', data: execute['read-file'] };
            if (execute?.['write-file']) return { type: 'write-file', data: execute['write-file'] };
            if (execute?.['execute-command']) return { type: 'execute-command', data: execute['execute-command'] };
            return { type: 'unknown', data: execute };
        },

        // === Result submission (delegates to store helpers) ===

        submitChoice(choiceId) {
            const result = store.buildChoiceResult(choiceId);
            this._emit('choiceSubmitted', { choiceId, result });
            return result;
        },

        submitFormInput(inputData) {
            store.clearPendingForm();
            store.pushMessage({ content: JSON.stringify(inputData) }, 'user');
            const result = { input: inputData };
            this._emit('formInputSubmitted', { input: inputData, result });
            return result;
        },

        submitScriptResult(scriptResult) {
            const result = store.buildActionResult('script', scriptResult);
            this._emit('scriptResultSubmitted', { result });
            return result;
        },

        submitRagSearchResult(searchResult) {
            const result = store.buildActionResult('rag-search', searchResult);
            this._emit('ragSearchResultSubmitted', { result });
            return result;
        },

        submitReadFileResult(fileResult) {
            const result = store.buildActionResult('read-file', fileResult);
            this._emit('readFileResultSubmitted', { result });
            return result;
        },

        submitWriteFileResult(fileResult) {
            const result = store.buildActionResult('write-file', fileResult);
            this._emit('writeFileResultSubmitted', { result });
            return result;
        },

        submitExecuteCommandResult(commandResult) {
            const result = store.buildActionResult('execute-command', commandResult);
            this._emit('executeCommandResultSubmitted', { result });
            return result;
        },

        // === API calls with result ===

        async sendResult(result) {
            if (!this.currentSessionId) throw new Error('No active session');
            const response = await this._request('POST', `/sessions/${this.currentSessionId}/result`, result);
            if (response?.execute) this.processExecute(response.execute, response.context);
            return response;
        },

        async executeNext(mode = 'manual') {
            if (!this.currentSessionId) throw new Error('No active session');
            const response = await this._request('POST', `/sessions/${this.currentSessionId}/next`, { mode });
            if (response?.execute) this.processExecute(response.execute, response.context);
            return response;
        },

        async selectAction(actionId) {
            if (!this.currentSessionId) throw new Error('No active session');
            const response = await this._request('POST', `/sessions/${this.currentSessionId}/action`, {
                selectedAction: actionId
            });
            if (response?.execute) this.processExecute(response.execute, response.context);
            return response;
        },

        // === Legacy SSE handling (now handled by SessionSyncV2) ===

        handleSSEMessage(data) {
            // Forward to store directly
            store.applyServerResponse(data);
        },

        // === Legacy render methods (minimal implementation) ===

        appendMessage(message) {
            store.pushMessage(message, message?.role || 'assistant');
        },

        getPendingForm() {
            return store._state?.pendingForm;
        },

        isProtocolV2() {
            return store.context?.version === '2.0';
        },

        getExecutionState() {
            return store.getExecution();
        },

        // === Event system ===

        on(event, callback) {
            if (!this._listeners.has(event)) {
                this._listeners.set(event, new Set());
            }
            this._listeners.get(event).add(callback);
            return () => this.off(event, callback);
        },

        off(event, callback) {
            this._listeners.get(event)?.delete(callback);
        },

        _emit(event, data) {
            this._listeners.get(event)?.forEach(cb => {
                try { cb(data); } catch (e) { console.error('[SessionManagerAdapter] Event error:', e); }
            });
        },

        // === Legacy render methods (use SessionStore / API) ===

        _escapeHtml(s) {
            if (s == null) return '';
            const div = typeof document !== 'undefined' && document.createElement('div');
            if (div) { div.textContent = s; return div.innerHTML; }
            return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        },

        renderSessionsList(containerId, options = {}) {
            const container = typeof document !== 'undefined' && document.getElementById(containerId);
            if (!container) return;

            const { onSelect = () => {}, onDelete = () => {}, onCreate = () => {}, emptyMessage = 'No sessions yet', showCreateButton = true } = options;
            const list = Array.isArray(this.sessions) ? this.sessions : [];

            let html = '';
            if (showCreateButton) {
                html += '<div class="session-manager-actions"><button type="button" class="btn btn-primary session-manager-create-btn">+ New Session</button></div>';
            }
            if (list.length === 0) {
                html += `<div class="session-manager-empty">${this._escapeHtml(emptyMessage)}</div>`;
            } else {
                html += '<div class="session-manager-list">';
                list.forEach(session => {
                    const id = session.id || session.sessionId || session;
                    const title = session.title || session.name || `Session ${String(id).slice(0, 8)}`;
                    const active = id === this.currentSessionId ? ' active' : '';
                    const status = session.status || '';
                    html += `<div class="session-item${active}" data-session-id="${this._escapeHtml(id)}">
                        <div class="session-item-content">
                            <span class="session-item-title">${this._escapeHtml(title)}</span>
                            ${status ? `<span class="session-item-status">${this._escapeHtml(status)}</span>` : ''}
                        </div>
                        <button type="button" class="session-item-delete" title="Delete">&times;</button>
                    </div>`;
                });
                html += '</div>';
            }
            container.innerHTML = html;

            container.querySelectorAll('.session-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    if (!e.target.classList.contains('session-item-delete')) {
                        const sid = item.dataset.sessionId;
                        if (sid) { this.setActiveSession(sid); onSelect(sid); }
                    }
                });
            });
            container.querySelectorAll('.session-item-delete').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const sid = btn.closest('.session-item')?.dataset?.sessionId;
                    if (sid && confirm('Delete this session?')) this.deleteSession(sid).then(() => onDelete(sid));
                });
            });
            const createBtn = container.querySelector('.session-manager-create-btn');
            if (createBtn) createBtn.addEventListener('click', () => {
                this.createSession().then(session => {
                    const sid = session?.id || session?.sessionId;
                    if (sid) { this.setActiveSession(sid); onCreate(session); }
                }).catch(() => {});
            });
        },

        renderConversation(containerId, messages = []) {
            const container = typeof document !== 'undefined' && document.getElementById(containerId);
            if (!container) return;

            const list = Array.isArray(messages) && messages.length > 0 ? messages : (store.messages || []);
            if (list.length === 0) {
                container.innerHTML = '<div class="conversation-empty">No messages yet</div>';
                return;
            }
            let html = '<div class="conversation-messages">';
            list.forEach(msg => {
                const role = msg.role || msg.direction || 'unknown';
                const content = msg.content || msg.text || msg.message || '';
                const timestamp = msg.timestamp || msg.createdAt || '';
                html += `<div class="conversation-message message-${this._escapeHtml(role)}">
                    <div class="message-header">
                        <span class="message-role">${this._escapeHtml(role)}</span>
                        ${timestamp ? `<span class="message-time">${new Date(timestamp).toLocaleTimeString()}</span>` : ''}
                    </div>
                    <div class="message-content">${this._escapeHtml(String(content))}</div>
                </div>`;
            });
            html += '</div>';
            container.innerHTML = html;
            container.scrollTop = container.scrollHeight;
        }
    };

    // === Install Adapters ===

    // Only install if legacy objects don't exist or if force flag set
    if (!global.SessionViewModel || global.FORCE_SESSION_STORE) {
        SessionViewModelAdapter.init();
        global.SessionViewModel = SessionViewModelAdapter;
        console.log('[SessionStore Adapters] SessionViewModel installed');
    }

    if (!global.SessionManager || global.FORCE_SESSION_STORE) {
        SessionManagerAdapter.init();
        global.SessionManager = SessionManagerAdapter;
        console.log('[SessionStore Adapters] SessionManager installed');
    }

    global.SessionStoreAdapters = {
        SessionViewModelAdapter,
        SessionManagerAdapter,
        install: () => {
            SessionViewModelAdapter.init();
            global.SessionViewModel = SessionViewModelAdapter;
            SessionManagerAdapter.init();
            global.SessionManager = SessionManagerAdapter;
        }
    };

    // === AIActionsSessionPanel Integration ===
    // Bridge SessionStore events to AIActionsSessionPanel.processExecute

    let _panelConnectionLogThrottled = false;

    function connectAIActionsPanel() {
        const store = global.SessionStore;
        const panel = global.aiActionsPanel;

        if (!store || !panel) {
            if (!_panelConnectionLogThrottled) {
                console.log('[SessionStore Adapters] AIActionsSessionPanel connection: waiting for both Store and Panel');
                _panelConnectionLogThrottled = true;
                // Reset throttle after 10 seconds
                setTimeout(() => { _panelConnectionLogThrottled = false; }, 10000);
            }
            return false;
        }

        // Already connected?
        if (panel._storeConnected) return true;

        // Listen for execute events and forward to panel
        store.on('execute', (execute) => {
            if (!execute) return;
            try {
                panel.processExecute(execute, store.context);
            } catch (err) {
                console.error('[SessionStore Adapters] Failed to process execute:', err);
            }
        });

        // Listen for completed status
        store.on('completed', (data) => {
            const sessionId = panel.currentSessionId || store.sessionId;
            if (sessionId) {
                panel.updateSessionStatus(sessionId, 'completed');
            }
        });

        // Listen for status changes
        store.on('status', (status) => {
            const sessionId = panel.currentSessionId || store.sessionId;
            if (sessionId && ['active', 'waiting', 'error', 'cancelled'].includes(status)) {
                panel.updateSessionStatus(sessionId, status);
            }
        });

        panel._storeConnected = true;
        console.log('[SessionStore Adapters] AIActionsSessionPanel connected to SessionStore');
        return true;
    }

    // Try to connect immediately if both exist
    if (!connectAIActionsPanel()) {
        // Retry when AIActionsSessionPanel is created
        const checkInterval = setInterval(() => {
            if (connectAIActionsPanel()) {
                clearInterval(checkInterval);
            }
        }, 500);

        // Stop checking after 30 seconds
        setTimeout(() => clearInterval(checkInterval), 30000);
    }

})(typeof window !== 'undefined' ? window : globalThis);
