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
            lastError: null,
            promisePending: false  // Block input while waiting for server response
        },

        _listeners: new Map(),
        _apiBase: '/api',
        _persistTimer: null,

        // === Initialization ===

        init(options = {}) {
            this._apiBase = options.apiBase || this._apiBase;

            // Note: Storage persistence removed - state is ephemeral
            // Sessions restored via API on reconnect, not local storage

            console.log('[SessionStore] Initialized', this._state.sessionId ? `(session ${this._state.sessionId})` : '(no session)');
            return this;
        },

        // === Persistence ===
        // Note: Local persistence removed - all state is ephemeral
        // Server-side session storage handles persistence

        async clearStorage() {
            // No-op: no local storage to clear
            console.log('[SessionStore] No local storage to clear');
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

        isInputBlocked() {
            return this._state.promisePending || this._state.status === 'loading';
        },

        setPromisePending(pending) {
            this._state.promisePending = pending;
            this._emit('promisePending', pending);
            return this;
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

        createSession(session) {
            const { id, sessionId, projectId, project_id, task, title, messages = [] } = session || {};
            const sid = id || sessionId;
            const pid = projectId || project_id || this._state.projectId;

            if (!sid) {
                console.error('[SessionStore] createSession: No session ID provided');
                return this;
            }

            // Reset state with new session
            this.reset(sid, pid);
            this._state.status = 'created';

            // Web does NOT insert any messages - it waits for server response on promise
            // Server will send messages via SSE/response when ready
            this._emit('sessionCreated', { id: sid, projectId: pid, task, title });
            console.log('[SessionStore] Session created:', sid);
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

            // Server responded - unblock input
            this._state.promisePending = false;
            this._emit('promisePending', false);

            // Handle form with choices - waiting for user input
            if (execute?.form?.choices) {
                this._state.pendingForm = execute.form;
                this._state.status = 'waiting';
                this._emit('pendingForm', execute.form);
            } else {
                // No form choices - clear any existing form (user made a choice or action completed)
                this._state.pendingForm = null;
                this._emit('pendingForm', null);
            }

            // Handle message - display to user
            if (execute?.message) {
                const msg = typeof execute.message === 'string'
                    ? { content: execute.message }
                    : execute.message;
                this.pushMessage(msg, 'assistant');
            }

            // Handle finalResult - task completed
            if (execute?.finalResult) {
                this._state.status = 'completed';
                this._emit('completed', execute.finalResult);
                this.pushMessage({
                    content: `Task completed: ${execute.finalResult.action || 'unknown'}`,
                    metadata: { type: 'completion', summary: execute.finalResult.summary }
                }, 'system');
            }

            return this;
        },

        setContext(context) {
            this._state.context = context || null;
            this._emit('context', this._state.context);

            if (context?.execution) {
                this._emit('execution', context.execution);

                // Detect completed status from execution
                if (context.execution.status === 'completed') {
                    this.setStatus('completed');
                    this._emit('completed', context.execution);
                }
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
            const { context, execute, messages, finalResult } = data;

            if (context) this.setContext(context);
            if (execute) this.setExecute(execute);
            if (messages?.length) this.setMessages(messages);

            // Handle explicit status from response
            if (data.status) this.setStatus(data.status);

            // Handle session ID from response
            if (data.sessionId) this.setSession(data.sessionId, data.projectId);

            // Detect completion from context.execution.status
            if (context?.execution?.status === 'completed') {
                this.setStatus('completed');
                this._emit('completed', context.execution);
            }

            // Detect completion from finalResult in execute
            if (execute?.finalResult) {
                this.setStatus('completed');
                this._emit('completed', execute.finalResult);
            }

            // Detect completion from top-level finalResult
            if (finalResult) {
                this.setStatus('completed');
                this._emit('completed', finalResult);
                // Also update execute with finalResult for UI processing
                this.setExecute({ finalResult });
            }

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
         * Restore session from server and reconnect to transport
         * Call this on page load if you want to resume last session
         */
        async restoreAndReconnect(sessionId) {
            if (!sessionId) {
                // No session to restore - start fresh
                return false;
            }

            console.log('[SessionStore] Restoring session:', sessionId);
            this._state.sessionId = sessionId;

            // Reconnect to transport (SSE/WebSocket)
            const transport = global.TransportManager;
            if (transport && typeof transport.connect === 'function') {
                try {
                    await transport.connect(sessionId);
                    this._state.status = 'active';
                    console.log('[SessionStore] Transport reconnected');
                } catch (err) {
                    console.warn('[SessionStore] Failed to reconnect transport:', err.message || err);
                    this._state.status = 'disconnected';
                    this._state.error = 'Transport connection failed: ' + (err.message || err);
                    // Emit error event so UI can show notification
                    this._emit('error', { type: 'transport', message: err.message || err });
                }
            } else {
                this._state.status = 'disconnected';
                console.warn('[SessionStore] TransportManager not available');
            }

            // Emit restore event so UI can re-render
            this._emit('restore', this.getState());

            return true;
        },

        /**
         * Check if there's a saved session to restore
         * Note: Now requires explicit sessionId - no local storage lookup
         */
        async hasSavedSession() {
            // No local storage - session existence checked via API
            return !!this._state.sessionId;
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
