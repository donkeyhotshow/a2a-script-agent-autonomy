/**
 * SessionManager Adapter
 * Combines store state with API operations for session management
 * Использует внешние модули:
 * - session-api.js - API методы
 * - session-events.js - система событий
 * - session-ui.js - UI методы
 */

(function (global) {
    'use strict';

    const store = global.SessionStore;
    if (!store) {
        console.error('[SessionManager Adapter] SessionStore not found');
        return;
    }

    // Подключаем модули
    const SessionAPI = global.createSessionAPI ? global.createSessionAPI(store) : {};
    const SessionEvents = global.createSessionEvents ? global.createSessionEvents() : {};
    const sessionUI = global.sessionUI || {};

    const SessionManagerAdapter = {
        apiBase: '/api',
        currentSessionId: null,
        currentProjectId: null,
        sessions: [],
        _listeners: SessionEvents,
        _taskbarContentEl: null,

        getActiveSessionId() {
            return this.currentSessionId;
        },

        setTaskbarContentEl(el) {
            this._taskbarContentEl = el;
        },

        updateActiveSessionUI(sessionId) {
            sessionUI.updateActiveSessionUI(this._taskbarContentEl, sessionId);
        },

        _centerActiveButton(container, activeBtn) {
            sessionUI.centerActiveButton(container, activeBtn);
        },

        showContextMenu(e, sessionId, btnEl) {
            sessionUI.showContextMenu(e, sessionId, btnEl);
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
            store.on('session', (id) => { 
                this.currentSessionId = id; 
                this._emit('sessionChanged', id); 
            });
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

        // === API Methods (делегирование в session-api) ===

        async loadSessions(projectId = null) {
            const pid = projectId || this.currentProjectId;
            if (!pid) {
                console.warn('[SessionManagerAdapter] No project ID');
                return [];
            }
            try {
                this.sessions = await SessionAPI.loadSessions.call(this, pid);
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

            const session = await SessionAPI.createSession.call(this, { projectId, title, task });

            this.sessions.unshift(session);
            this._emit('sessionCreated', session);
            return session;
        },

        async getSession(sessionId) {
            const session = await SessionAPI.getSession.call(this, sessionId);
            this._emit('sessionLoaded', session);
            return session;
        },

        async deleteSession(sessionId) {
            await SessionAPI.deleteSession.call(this, sessionId);
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
            const messages = await SessionAPI.getConversation.call(this, sessionId);
            store.setMessages(messages);
            this._emit('conversationLoaded', { sessionId: sessionId || this.currentSessionId, messages });
            return messages;
        },

        // === Execute processing ===

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

        // === Result submission ===

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
            const body = { projectId: this.projectId ?? null, sessionId: this.currentSessionId, result };
            const response = await SessionAPI._request.call(this, 'POST', `/sessions/${this.currentSessionId}/result`, body);
            const payload = response?.data || response;
            if (payload?.execute) this.processExecute(payload.execute, payload.context);
            return response;
        },

        async executeNext(mode = 'manual') {
            if (!this.currentSessionId) throw new Error('No active session');
            const payload = await SessionAPI.executeNext.call(this, this.currentSessionId, mode);
            if (payload?.execute) this.processExecute(payload.execute, payload.context);
            return payload;
        },

        async selectAction(actionId) {
            if (!this.currentSessionId) throw new Error('No active session');
            const payload = await SessionAPI.selectAction.call(this, this.currentSessionId, actionId);
            if (payload?.execute) this.processExecute(payload.execute, payload.context);
            return payload;
        },

        // === SSE handling ===

        handleSSEMessage(data) {
            store.applyServerResponse(data);
        },

        // === Legacy render methods ===

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

        // === Event system (делегирование в session-events) ===

        on(event, callback) {
            return SessionEvents.on.call(SessionEvents, event, callback);
        },

        off(event, callback) {
            SessionEvents.off.call(SessionEvents, event, callback);
        },

        _emit(event, data) {
            SessionEvents._emit.call(SessionEvents, event, data);
        },

        // === Render methods (делегирование в session-ui) ===

        _escapeHtml(s) {
            return sessionUI.escapeHtml ? sessionUI.escapeHtml(s) : String(s);
        },

        renderSessionsList(containerId, options = {}) {
            const optionsWithCallbacks = {
                ...options,
                setActiveSession: (sid) => this.setActiveSession(sid),
                createSession: () => this.createSession(),
                deleteSessionFn: (sid) => this.deleteSession(sid)
            };
            sessionUI.renderSessionsList(containerId, this.sessions, this.currentSessionId, optionsWithCallbacks);
        },

        renderConversation(containerId, messages = []) {
            sessionUI.renderConversation(containerId, messages);
        }
    };

    // Export
    global.SessionManagerAdapter = SessionManagerAdapter;

})(typeof window !== 'undefined' ? window : globalThis);
