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

    const STORAGE_KEY = 'a2a_session_store';

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
        _persistTimer: null,

        // === Initialization ===

        init(options = {}) {
            this._apiBase = options.apiBase || this._apiBase;

            // Restore from localStorage if available
            this._restoreFromStorage();

            // Setup auto-persist
            this._setupAutoPersist();

            console.log('[SessionStore] Initialized', this._state.sessionId ? `(restored session ${this._state.sessionId})` : '(no saved session)');
            return this;
        },

        // === Persistence ===

        _setupAutoPersist() {
            // Persist state changes to localStorage (debounced)
            this.on('reset', () => this._persist());
            this.on('session', () => this._persist());
            this.on('execute', () => this._persist());
            this.on('messages', () => this._persist());
            this.on('context', () => this._persist());
            this.on('status', () => this._persist());
        },

        async _persist() {
            // Debounce persistence
            if (this._persistTimer) clearTimeout(this._persistTimer);
            this._persistTimer = setTimeout(async () => {
                try {
                    const data = {
                        sessionId: this._state.sessionId,
                        projectId: this._state.projectId,
                        execute: this._state.execute,
                        context: this._state.context,
                        status: this._state.status,
                        pendingForm: this._state.pendingForm,
                        messages: this._state.messages.slice(-20), // Keep last 20 messages only
                        timestamp: new Date().toISOString()
                    };

                    // Try async storage first, fallback to sync
                    try {
                        await StorageAPI.sessions.setItem(STORAGE_KEY, JSON.stringify(data));
                    } catch (asyncError) {
                        console.warn('[SessionStore] Async storage failed, using sync fallback:', asyncError);
                        StorageAPI.sessions.setItemSync(STORAGE_KEY, JSON.stringify(data));
                    }
                } catch (err) {
                    console.warn('[SessionStore] Failed to persist:', err);
                }
            }, 100);
        },

        async _restoreFromStorage() {
            try {
                // Try async storage first, fallback to sync
                let saved;
                try {
                    saved = await StorageAPI.sessions.getItem(STORAGE_KEY);
                } catch (asyncError) {
                    console.warn('[SessionStore] Async storage failed, using sync fallback:', asyncError);
                    saved = StorageAPI.sessions.getItemSync(STORAGE_KEY);
                }

                if (!saved) return false;

                const data = typeof saved === 'string' ? JSON.parse(saved) : saved;

                // Restore state (no TTL - persists until explicitly cleared)
                if (data.sessionId) this._state.sessionId = data.sessionId;
                if (data.projectId) this._state.projectId = data.projectId;
                if (data.execute) this._state.execute = data.execute;
                if (data.context) this._state.context = data.context;
                if (data.status) this._state.status = data.status;
                if (data.pendingForm) this._state.pendingForm = data.pendingForm;
                if (data.messages?.length) this._state.messages = data.messages;

                console.log('[SessionStore] Restored from storage:', {
                    sessionId: data.sessionId,
                    projectId: data.projectId,
                    status: data.status
                });
                return true;
            } catch (err) {
                console.warn('[SessionStore] Failed to restore:', err);
                return false;
            }
        },

        async clearStorage() {
            try {
                // Try async storage first, fallback to sync
                try {
                    await StorageAPI.sessions.removeItem(STORAGE_KEY);
                } catch (asyncError) {
                    console.warn('[SessionStore] Async storage failed, using sync fallback:', asyncError);
                    StorageAPI.sessions.removeItemSync(STORAGE_KEY);
                }
                console.log('[SessionStore] Storage cleared');
            } catch (err) {
                console.warn('[SessionStore] Failed to clear storage:', err);
            }
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

            // Clear storage if explicit reset (no sessionId)
            if (!sessionId) {
                this.clearStorage();
            }

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

        // === Restore and Reconnect ===

        /**
         * Restore session from storage and reconnect to transport
         * Call this on page load if you want to resume last session
         */
        async restoreAndReconnect() {
            const restored = await this._restoreFromStorage();
            if (!restored || !this._state.sessionId) {
                return false;
            }

            console.log('[SessionStore] Restoring session:', this._state.sessionId);

            // Reconnect to transport (SSE/WebSocket)
            const transport = global.TransportManager;
            if (transport && typeof transport.connect === 'function') {
                try {
                    await transport.connect(this._state.sessionId);
                    this._state.status = 'active';
                    console.log('[SessionStore] Transport reconnected');
                } catch (err) {
                    console.warn('[SessionStore] Failed to reconnect transport:', err);
                    // Continue anyway - can try to reconnect later
                }
            }

            // Emit restore event so UI can re-render
            this._emit('restore', this.getState());

            return true;
        },

        /**
         * Check if there's a saved session to restore
         */
        async hasSavedSession() {
            try {
                // Try async storage first, fallback to sync
                let saved;
                try {
                    saved = await StorageAPI.sessions.getItem(STORAGE_KEY);
                } catch (asyncError) {
                    saved = StorageAPI.sessions.getItemSync(STORAGE_KEY);
                }

                if (!saved) return false;
                const data = typeof saved === 'string' ? JSON.parse(saved) : saved;

                // Return true if sessionId exists (no TTL limit)
                return !!data.sessionId;
            } catch {
                return false;
            }
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
