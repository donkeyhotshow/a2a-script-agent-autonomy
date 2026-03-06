/**
 * SessionStore - Unified session state management
 * Single source of truth for: context, execute, messages, session metadata
 * Replaces: SessionManager state + SessionViewModel + fragmented SessionSync
 */

(function (global) {
    'use strict';

    const MAX_MESSAGES = 200;

    function normalizeMessage(value, defaultRole = 'system') {
        if (!value) return null;
        const role = value.role || defaultRole;
        const content = typeof value === 'string'
            ? value
            : (value.content || value.message || value.text || '');
        if (!content) return null;
        return {
            id: value.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            role,
            content: String(content),
            timestamp: value.timestamp || new Date().toISOString(),
            metadata: value.metadata ? { ...value.metadata } : {}
        };
    }

    const SessionStore = {
        // Core state (single source of truth)
        _state: {
            sessionId: null,
            projectId: null,
            messages: [],
            execute: null,
            context: null,
            status: 'idle',
            pendingForm: null,
            lastError: null
        },

        _listeners: new Map(),
        _apiBase: '/api',

        // === Initialization ===

        init(options = {}) {
            this._apiBase = options.apiBase || this._apiBase;
            console.log('[SessionStore] Initialized');
            return this;
        },

        // === State Accessors ===

        getState() {
            return { ...this._state };
        },

        get sessionId() { return this._state.sessionId; },
        get projectId() { return this._state.projectId; },
        get messages() { return [...this._state.messages]; },
        get execute() { return this._state.execute; },
        get context() { return this._state.context; },
        get status() { return this._state.status; },

        // === Computed Properties ===

        isWaitingForInput() {
            return this._state.status === 'waiting' ||
                   this._state.pendingForm !== null ||
                   this._state.execute?.form?.choices?.length > 0;
        },

        isActive() {
            return this._state.status === 'active' || this._state.status === 'waiting';
        },

        isCompleted() {
            return this._state.status === 'completed';
        },

        getExecution() {
            return this._state.context?.execution || this._state.execute?.execution || null;
        },

        getCurrentStep() {
            const exec = this.getExecution();
            return exec?.step || null;
        },

        getProgress() {
            const exec = this.getExecution();
            return exec?.progress ?? null;
        },

        // === Actions: State Modifiers ===

        reset(sessionId = null, projectId = null) {
            this._state = {
                sessionId,
                projectId,
                messages: [],
                execute: null,
                context: null,
                status: sessionId ? 'created' : 'idle',
                pendingForm: null,
                lastError: null
            };
            this._emit('reset', this.getState());
            return this;
        },

        setSession(sessionId, projectId = null) {
            this._state.sessionId = sessionId;
            if (projectId) this._state.projectId = projectId;
            this._emit('session', sessionId);
            return this;
        },

        setProject(projectId) {
            this._state.projectId = projectId;
            this._emit('project', projectId);
            return this;
        },

        setStatus(status) {
            this._state.status = status;
            this._emit('status', status);
            return this;
        },

        setExecute(execute) {
            this._state.execute = execute || null;
            this._emit('execute', this._state.execute);

            if (execute?.form?.choices) {
                this._state.pendingForm = execute.form;
                this._state.status = 'waiting';
                this._emit('pendingForm', execute.form);
            }

            if (execute?.message) {
                const msg = typeof execute.message === 'string'
                    ? { content: execute.message }
                    : execute.message;
                this.pushMessage(msg, 'assistant');
            }

            return this;
        },

        setContext(context) {
            this._state.context = context || null;
            this._emit('context', this._state.context);

            if (context?.execution) {
                this._emit('execution', context.execution);
            }

            return this;
        },

        setMessages(messages) {
            if (!Array.isArray(messages)) return this;
            this._state.messages = messages
                .map(m => normalizeMessage(m, 'assistant'))
                .filter(Boolean)
                .slice(-MAX_MESSAGES);
            this._emit('messages', [...this._state.messages]);
            return this;
        },

        pushMessage(message, role = 'assistant') {
            const normalized = normalizeMessage(message, role);
            if (!normalized) return this;
            this._state.messages = [...this._state.messages, normalized].slice(-MAX_MESSAGES);
            this._emit('message', normalized);
            this._emit('messages', [...this._state.messages]);
            return this;
        },

        clearPendingForm() {
            this._state.pendingForm = null;
            if (this._state.status === 'waiting') {
                this._state.status = 'active';
            }
            this._emit('pendingForm', null);
            return this;
        },

        setError(error) {
            this._state.lastError = error;
            this._state.status = 'error';
            this._emit('error', error);
            this.pushMessage({ content: error?.message || String(error), metadata: { type: 'error' } }, 'system');
            return this;
        },

        // === Batch Updates (from server response) ===

        applyServerResponse(data) {
            const { context, execute, messages } = data;

            if (context) this.setContext(context);
            if (execute) this.setExecute(execute);
            if (messages?.length) this.setMessages(messages);

            if (data.status) this.setStatus(data.status);
            if (data.sessionId) this.setSession(data.sessionId, data.projectId);

            this._emit('serverResponse', data);
            return this;
        },

        // === Event Subscription ===

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

        once(event, callback) {
            const wrapped = (data) => {
                this.off(event, wrapped);
                callback(data);
            };
            return this.on(event, wrapped);
        },

        _emit(event, payload) {
            const handlers = this._listeners.get(event);
            if (!handlers) return;
            handlers.forEach(handler => {
                try {
                    handler(payload);
                } catch (err) {
                    console.error('[SessionStore] Handler failed for', event, err);
                }
            });
        },

        // === Result Submission Helpers ===

        buildChoiceResult(choiceId) {
            this.clearPendingForm();
            this.pushMessage({ content: choiceId }, 'user');
            return { choice: choiceId };
        },

        buildMessageResult(message) {
            const payload = (message || '').trim() || 'continue';
            this.pushMessage({ content: payload }, 'user');
            return { message: payload };
        },

        buildActionResult(actionType, resultData) {
            return { [actionType]: resultData };
        },

        // === Utility ===

        toJSON() {
            return {
                sessionId: this._state.sessionId,
                projectId: this._state.projectId,
                status: this._state.status,
                messageCount: this._state.messages.length,
                hasExecute: !!this._state.execute,
                hasContext: !!this._state.context,
                isWaiting: this.isWaitingForInput()
            };
        },

        // === Debug ===

        debug() {
            console.log('[SessionStore] Current state:', this.toJSON());
            console.log('[SessionStore] Full state:', this.getState());
        }
    };

    // Export
    global.SessionStore = SessionStore;

})(typeof window !== 'undefined' ? window : globalThis);
