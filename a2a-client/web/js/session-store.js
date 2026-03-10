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

    function SessionStore() {
        // Core state (single source of truth)
        this._state = {
            sessionId: null,
            projectId: null,
            messages: [],
            execute: null,
            context: null,
            status: 'idle',
            pendingForm: null,
            lastError: null,
            promisePending: false,  // Block input while waiting for server response
            _waitIndicatorActive: false,  // Track if wait indicator is showing
            
            // Session logs (two types)
            responsesLog: [],  // Raw server responses
            messagesLog: []   // Human-readable messages for frontend display
        };

        this._listeners = new Map();
        this._apiBase = '/api';
        this._persistTimer = null;

    }

    // === Initialization ===

    SessionStore.prototype.init = function(options = {}) {
            this._apiBase = options.apiBase || this._apiBase;

            // Note: Storage persistence removed - state is ephemeral
            // Sessions restored via API on reconnect, not local storage

            console.log('[SessionStore] Initialized', this._state.sessionId ? `(session ${this._state.sessionId})` : '(no session)');
            return this;
        };

    // === Persistence ===
    // Note: Local persistence removed - all state is ephemeral
    // Server-side session storage handles persistence

    SessionStore.prototype.clearStorage = async function() {
            // No-op: no local storage to clear
            console.log('[SessionStore] No local storage to clear');
        };

    // === State Accessors ===

    SessionStore.prototype.getState = function() {
        return { ...this._state };
    };

    Object.defineProperties(SessionStore.prototype, {
        sessionId: { get: function() { return this._state.sessionId; }, configurable: true },
        projectId: { get: function() { return this._state.projectId; }, configurable: true },
        messages: { get: function() { return [...this._state.messages]; }, configurable: true },
        execute: { get: function() { return this._state.execute; }, configurable: true },
        context: { get: function() { return this._state.context; }, configurable: true },
        status: { get: function() { return this._state.status; }, configurable: true }
    });

    // === Computed Properties ===

    SessionStore.prototype.isWaitingForInput = function() {
        return this._state.status === 'waiting' ||
               this._state.pendingForm !== null ||
               this._state.execute?.form?.choices?.length > 0;
    };

    SessionStore.prototype.isActive = function() {
        return this._state.status === 'active' || this._state.status === 'waiting';
    };

    SessionStore.prototype.isInputBlocked = function() {
        return this._state.promisePending || this._state.status === 'loading';
    };

    SessionStore.prototype.setPromisePending = function(pending) {
        this._state.promisePending = pending;
        this._emit('promisePending', pending);
        return this;
    };

    SessionStore.prototype.isCompleted = function() {
        return this._state.status === 'completed';
    };

    SessionStore.prototype.getExecution = function() {
        return this._state.context?.execution || this._state.execute?.execution || null;
    };

    SessionStore.prototype.getCurrentStep = function() {
        const exec = this.getExecution();
        return exec?.step || null;
    };

    SessionStore.prototype.getProgress = function() {
            const exec = this.getExecution();
            return exec?.progress ?? null;
        },

    // === Actions: State Modifiers ===

    SessionStore.prototype.reset = function(sessionId = null, projectId = null) {
        this._state = {
            sessionId,
            projectId,
            messages: [],
            execute: null,
            context: null,
            status: sessionId ? 'created' : 'idle',
            pendingForm: null,
            lastError: null,
            promisePending: false
        };

        // Clear storage if explicit reset (no sessionId)
        if (!sessionId) {
            this.clearStorage();
        }

        this._emit('reset', this.getState());
        return this;
    };

    SessionStore.prototype.setSession = function(sessionId, projectId = null) {
        this._state.sessionId = sessionId;
        if (projectId) this._state.projectId = projectId;
        this._emit('session', sessionId);
        return this;
    };

    SessionStore.prototype.createSession = function(session) {
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
    };

    SessionStore.prototype.setProject = function(projectId) {
        this._state.projectId = projectId;
        this._emit('project', projectId);
        return this;
    };

    SessionStore.prototype.setStatus = function(status) {
        this._state.status = status;
        this._emit('status', status);
        return this;
    };

    SessionStore.prototype.setExecute = function(execute) {
        this._state.execute = execute || null;
        this._emit('execute', this._state.execute);

        // Hide wait indicator if we had one and now receiving new execute
        const hadWaitIndicator = this._state._waitIndicatorActive;
        if (hadWaitIndicator && execute && !execute.wait) {
            this._state._waitIndicatorActive = false;
        }

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

        // Handle wait indicator - show loading while server processes
        if (execute?.wait) {
            const waitData = execute.wait;
            this._state.status = 'waiting';
            this._state._waitIndicatorActive = true;
            this._emit('wait', waitData);
            
            // Log wait message for frontend display
            if (waitData.message) {
                this.logMessage('system', waitData.message, { type: 'wait', showFormAfter: waitData.showFormAfter });
            }
        }

        return this;
    };

    SessionStore.prototype.setContext = function(context) {
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
    };

    SessionStore.prototype.setMessages = function(messages) {
        if (!Array.isArray(messages)) return this;
        this._state.messages = messages
            .map(m => normalizeMessage(m, 'assistant'))
            .filter(Boolean)
            .slice(-MAX_MESSAGES);
        this._emit('messages', [...this._state.messages]);
        return this;
    };

    SessionStore.prototype.appendMessages = function(messages) {
        if (!Array.isArray(messages)) return this;
        const normalizedMessages = messages
            .map(m => normalizeMessage(m, 'assistant'))
            .filter(Boolean);
        this._state.messages = [...(this._state.messages || []), ...normalizedMessages]
            .slice(-MAX_MESSAGES);
        this._emit('messages', [...this._state.messages]);
        return this;
    };

    SessionStore.prototype.pushMessage = function(message, role = 'assistant') {
        const normalized = normalizeMessage(message, role);
        if (!normalized) return this;
        this._state.messages = [...this._state.messages, normalized].slice(-MAX_MESSAGES);
        this._emit('message', normalized);
        this._emit('messages', [...this._state.messages]);
        return this;
    };

    SessionStore.prototype.clearPendingForm = function() {
        this._state.pendingForm = null;
        if (this._state.status === 'waiting') {
            this._state.status = 'active';
        }
        this._emit('pendingForm', null);
        return this;
    };

    SessionStore.prototype.setError = function(error) {
        this._state.lastError = error;
        this._state.status = 'error';
        this._emit('error', error);
        this.pushMessage({ content: error?.message || String(error), metadata: { type: 'error' } }, 'system');
        return this;
    };

    // === Batch Updates (from server response) ===

    SessionStore.prototype.applyServerResponse = function(data) {
        const { sessionId, projectId, status, context, execute, messages, finalResult } = data;

        if (projectId) this.setProject(projectId);
        if (sessionId) this.setSession(sessionId, projectId);

        if (status) this.setStatus(status);
        if (context) this.setContext(context);
        if (execute) {
            this.setExecute(execute);
        } else if (finalResult) {
            this.setExecute({ finalResult });
        }
        if (messages?.length) this.appendMessages(messages);

        if (execute?.form) {
            this._state.pendingForm = execute.form;
            this._state.status = 'waiting';
            this._emit('pendingForm', execute.form);
        }

        const completionResult = execute?.finalResult ?? finalResult;
        if (completionResult && this._state.status !== 'completed') {
            this.setStatus('completed');
            this._emit('completed', completionResult);
        }

        this._emit('serverResponse', data);
        return this;
    };

        // === Event Subscription ===

    SessionStore.prototype.on = function(event, callback) {
        if (typeof callback !== 'function') return () => {};
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }
        this._listeners.get(event).add(callback);
        return () => this.off(event, callback);
    };

    SessionStore.prototype.off = function(event, callback) {
        this._listeners.get(event)?.delete(callback);
    };

    SessionStore.prototype.once = function(event, callback) {
        const wrapped = (data) => {
            this.off(event, wrapped);
            callback(data);
        };
        return this.on(event, wrapped);
    };

    SessionStore.prototype._emit = function(event, payload) {
        const handlers = this._listeners.get(event);
        if (!handlers) return;
        handlers.forEach(handler => {
            try {
                handler(payload);
            } catch (err) {
                console.error('[SessionStore] Handler failed for', event, err);
            }
        });
    };

    // === Restore and Reconnect ===

    /**
     * Restore session from server and reconnect to transport
     * Call this on page load if you want to resume last session
     */
    SessionStore.prototype.restoreAndReconnect = async function(sessionId) {
        if (!sessionId) {
            // No session to restore - start fresh
            return false;
        }

        console.log('[SessionStore] Restoring session:', sessionId);
        this._state.sessionId = sessionId;

        // Reconnect to transport (HTTP polling)
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
    };

    /**
     * Check if there's a saved session to restore
     * Note: Now requires explicit sessionId - no local storage lookup
     */
    SessionStore.prototype.hasSavedSession = async function() {
        // No local storage - session existence checked via API
        return !!this._state.sessionId;
    };

    // === Utility ===

    SessionStore.prototype.toJSON = function() {
        return {
            sessionId: this._state.sessionId,
            projectId: this._state.projectId,
            status: this._state.status,
            messageCount: this._state.messages.length,
            hasExecute: !!this._state.execute,
            hasContext: !!this._state.context,
            isWaiting: this.isWaitingForInput()
        };
    };

        // === Debug ===

    SessionStore.prototype.debug = function() {
        console.log('[SessionStore] Current state:', this.toJSON());
        console.log('[SessionStore] Full state:', this.getState());
    };

    // === Session Logging (two logs: responses + messages) ===

    /**
     * Log raw server response
     * @param {Object} response - Raw server response data
     */
    SessionStore.prototype.logResponse = function(response) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            data: response
        };
        this._state.responsesLog.push(logEntry);
        
        // Keep max 100 entries
        if (this._state.responsesLog.length > 100) {
            this._state.responsesLog.shift();
        }
        
        console.log('[SessionStore] Response logged:', logEntry.timestamp);
        this._emit('responseLogged', logEntry);
    };

    /**
     * Log human-readable message for frontend display
     * @param {string} role - user, assistant, system
     * @param {string} content - Message content
     * @param {Object} metadata - Optional metadata
     */
    SessionStore.prototype.logMessage = function(role, content, metadata = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            role: role,
            content: content,
            metadata: metadata
        };
        this._state.messagesLog.push(logEntry);
        
        // Keep max 100 entries
        if (this._state.messagesLog.length > 100) {
            this._state.messagesLog.shift();
        }
        
        console.log('[SessionStore] Message logged:', role, content.slice(0, 50));
        this._emit('messageLogged', logEntry);
    };

    /**
     * Get all logged responses
     * @returns {Array} Array of response log entries
     */
    SessionStore.prototype.getResponsesLog = function() {
        return [...this._state.responsesLog];
    };

    /**
     * Get all logged messages
     * @returns {Array} Array of message log entries
     */
    SessionStore.prototype.getMessagesLog = function() {
        return [...this._state.messagesLog];
    };

    /**
     * Clear all logs
     */
    SessionStore.prototype.clearLogs = function() {
        this._state.responsesLog = [];
        this._state.messagesLog = [];
        this._emit('logsCleared');
        console.log('[SessionStore] Logs cleared');
    };

    // Export - create global instance for backward compatibility
    global.SessionStore = new SessionStore();

})(typeof window !== 'undefined' ? window : globalThis);
