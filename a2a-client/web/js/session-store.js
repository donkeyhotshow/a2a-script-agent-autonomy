/**
 * SessionStore - Unified session state management
 * Single source of truth for: context, execute, messages, session metadata
 * Replaces: SessionManager state + SessionViewModel + fragmented SessionSync
 * 
 * Supports two storage modes:
 * - 'memory': In-memory only (default, legacy behavior)
 * - 'storage': Persistent storage in a2a-client/storage/sessions/ (override via A2A_CLIENT_STORAGE_DIR) with numbered folders
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
            messagesLog: [],   // Human-readable messages for frontend display
            
            // New: numbered steps tracking
            currentStep: 0,
            steps: []
        };

        this._listeners = new Map();
        this._apiBase = '/api';
        this._persistTimer = null;
        
        // Storage mode: 'project' (.a2a/sessions) or 'storage' (a2a-client/storage/sessions or A2A_CLIENT_STORAGE_DIR)
        this._storageMode = 'storage';
        this._storageBase = '/api/a2a/sessions';

    }

    // === Initialization ===

    SessionStore.prototype.init = function(options = {}) {
            this._apiBase = options.apiBase || this._apiBase;

            // Note: Storage persistence removed - state is ephemeral
            // Sessions restored via API on reconnect, not local storage

            console.log('[SessionStore] Initialized', this._state.sessionId ? `(session ${this._state.sessionId})` : '(no session)');
            return this;
        };

    // === Storage Mode ===
    
    /**
     * Set storage mode
     * @param {string} mode - 'project' (.a2a/sessions) or 'storage' (a2a-client/storage/sessions or A2A_CLIENT_STORAGE_DIR)
     */
    SessionStore.prototype.setStorageMode = function(mode) {
        if (mode !== 'project' && mode !== 'storage') {
            console.warn('[SessionStore] Invalid storage mode:', mode, '- using storage');
            mode = 'storage';
        }
        this._storageMode = mode;
        console.log('[SessionStore] Storage mode:', mode);
        this._emit('storageMode', mode);
        return this;
    };

    /**
     * Get current storage mode
     * @returns {string} 'project' or 'storage'
     */
    SessionStore.prototype.getStorageMode = function() {
        return this._storageMode;
    };

    /**
     * Check if using persistent storage (a2a-client/storage/sessions with numbered folders)
     * @returns {boolean}
     */
    SessionStore.prototype.isPersistentStorage = function() {
        return this._storageMode === 'storage';
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

    /**
     * Get current execute object
     * @returns {Object|null} The execute object
     */
    SessionStore.prototype.getExecute = function() {
        return this._state.execute;
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
        // Server returns messages via HTTP response (promiseId polling in SDK)
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

        // NEW: Handle auto-execute commands (no user input required)
        // When server sends execute without form.input or form.choices,
        // create automatic system messages
        if (execute && !execute.form?.input && !execute.form?.choices) {
            // Auto-message: server is doing work without user input
            if (execute.message) {
                // Already handled above
            } else if (execute.action) {
                // Server is executing an action automatically
                this.pushMessage({
                    content: `Executing: ${execute.action}`,
                    metadata: { type: 'auto-action', action: execute.action }
                }, 'system');
            } else if (execute.script) {
                // Server is running a script
                this.pushMessage({
                    content: `Running script...`,
                    metadata: { type: 'auto-script' }
                }, 'system');
            } else if (execute.result) {
                // Server returned a result without user input
                const resultMsg = typeof execute.result === 'string'
                    ? execute.result
                    : execute.result.summary || execute.result.action || 'Task completed';
                this.pushMessage({
                    content: resultMsg,
                    metadata: { type: 'auto-result', result: execute.result }
                }, 'system');
            }
            
            // No form means auto-continue: server will process next step automatically
            // Emit event for UI to handle auto-continue if needed
            if (!execute.form) {
                this._emit('autoContinue', execute);
            }
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

            if (waitData.message) {
                this.logMessage('system', waitData.message, { type: 'wait', showFormAfter: waitData.showFormAfter });
            }
        }

        // NOTE: Auto-save disabled - server manages steps via /next endpoint
        // Server creates steps when receiving result from client and response from A2A server
        // See api-client-server-logic.md for details
        /*if (this._storageMode === 'storage' && this._state.sessionId && execute) {
            // Initial form has ONLY form.input (with value) and nothing else
            // It's the "What would you like me to do?" prompt - DON'T save
            const hasInput = !!execute.form?.input;
            const hasChoices = !!execute.form?.choices;
            const hasMessage = !!execute.message;
            const hasWait = !!execute.wait;
            const hasFinalResult = !!execute.finalResult;
            const hasResult = !!execute.result;
            
            // Save step only if there's real data (not just initial form)
            const hasRealData = hasChoices || hasMessage || hasWait || hasFinalResult || hasResult;
            if (hasRealData) {
                console.log('[SessionStore] Auto-save step for:', this._state.sessionId, 'hasRealData:', hasRealData);
                console.log('[SessionStore] Auto-save step for:', this._state.sessionId);
                this.saveStep({
                    execute,
                    messages: this._state.messages.slice(-5),
                    context: this._state.context,
                    result: execute.result || execute.finalResult
                }).catch((err) => console.warn('[SessionStore] Auto-save step failed:', err));
            }
        }*/

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
        
        // Don't re-normalize if messages are already normalized (have id field)
        const alreadyNormalized = messages.every(m => m.id && m.timestamp);
        if (alreadyNormalized && this._state.messages.length > 0) {
            // Skip - already have normalized messages
            return this;
        }
        
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
        this._state.status = 'active';

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

    // === NEW: Session Storage API (numbered folders) ===

    /**
     * Create a new session with execute form input (Step 1)
     * @param {string} title - Session title
     * @returns {Promise<Object>} Created session data
     */
    SessionStore.prototype.createSessionWithForm = async function(title = 'New Session') {
        try {
            const headers = { 'Content-Type': 'application/json' };
            if (this._storageMode) headers['X-Storage-Mode'] = this._storageMode;
            const response = await fetch(`${this._storageBase}`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ title })
            });

            if (!response.ok) {
                throw new Error(`Failed to create session: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Server returned unsuccessful response');
            }

            if (!data.session) {
                throw new Error('Session data missing in response');
            }

            const session = data.session;
            this.createSession(session);
            this.setExecute(session.execute);
            this._state.currentStep = session.currentStep || 1;
            this._emit('sessionCreated', { id: session.id, projectId: session.projectId, task: session.task, title: session.title });
            console.log('[SessionStore] Session created with form:', session.id);
            return session;
        } catch (error) {
            console.error('[SessionStore] createSessionWithForm error:', error);
            this.setError(error);
            throw error;
        }
    };

    /**
     * Save current step to storage
     * @param {Object} stepData - Step data (execute, messages, context, result)
     * @returns {Promise<number>} Step number
     */
    SessionStore.prototype._storageHeaders = function() {
        return { 'X-Storage-Mode': this._storageMode };
    };

    SessionStore.prototype.saveStep = async function(stepData) {
        if (!this._state.sessionId) {
            console.warn('[SessionStore] No session to save step to');
            return null;
        }

        if (this._storageMode !== 'storage') {
            this._state.currentStep++;
            this._state.steps.push(this._state.currentStep);
            return this._state.currentStep;
        }

        try {
            const response = await fetch(`${this._storageBase}/${this._state.sessionId}/steps`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...this._storageHeaders() },
                body: JSON.stringify(stepData)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to save step: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to save step: server returned unsuccessful response');
            }
            
            // Initialize steps array if not exists
            if (!this._state.steps) {
                this._state.steps = [];
            }
            
            this._state.currentStep = data.step;
            this._state.steps.push(data.step);
            console.log('[SessionStore] Step saved:', data.step);
            return data.step;
        } catch (error) {
            console.error('[SessionStore] saveStep error:', error);
            throw error;
        }
    };

    /**
     * Load session from storage
     * @param {string} sessionId - Session ID to load
     * @returns {Promise<Object>} Session data
     */
    SessionStore.prototype.loadSession = async function(sessionId) {
        try {
            const response = await fetch(`${this._storageBase}/${sessionId}`, {
                headers: this._storageHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`Failed to load session: ${response.status}`);
            }
            
            const session = await response.json();
            
            if (!session || !session.id) {
                throw new Error('Invalid session data: missing session ID');
            }
            
            // Restore state
            this._state.sessionId = session.id;
            this._state.projectId = session.projectId;
            this._state.status = session.status || 'active';
            this._state.currentStep = session.currentStep || 1;
            this._state.execute = session.execute;
            this._state.context = session.context;
            
            // Load step history if requested
            if (session.currentStep > 0) {
                const historyResponse = await fetch(`${this._storageBase}/${sessionId}/history/1`, {
                    headers: this._storageHeaders()
                });
                if (historyResponse.ok) {
                    const historyData = await historyResponse.json();
                    this._state.steps = historyData.history?.map(h => h.step) || [];
                }
            }
            
            this._emit('sessionLoaded', session);
            console.log('[SessionStore] Session loaded:', sessionId);
            return session;
        } catch (error) {
            console.error('[SessionStore] loadSession error:', error);
            throw error;
        }
    };

    /**
     * Get latest step to check for server response (for loader)
     * @returns {Promise<Object>} Latest step data
     */
    SessionStore.prototype.checkLatestStep = async function() {
        if (!this._state.sessionId) {
            return null;
        }
        
        if (this._storageMode !== 'storage') {
            // In memory mode, just check if we have pending execute
            return {
                hasResponse: !!this._state.execute,
                stepData: { execute: this._state.execute }
            };
        }
        
        try {
            const response = await fetch(`${this._storageBase}/${this._state.sessionId}/latest`, {
                headers: this._storageHeaders()
            });
            
            if (!response.ok) {
                return null;
            }
            
            const data = await response.json();
            
            if (!data) {
                return null;
            }
            
            return data;
        } catch (error) {
            console.error('[SessionStore] checkLatestStep error:', error);
            return null;
        }
    };

    /**
     * Get history from specific step
     * @param {number} fromStep - Step number to start from
     * @returns {Promise<Array>} History array
     */
    SessionStore.prototype.getHistory = async function(fromStep = 1) {
        if (!this._state.sessionId) {
            return [];
        }
        
        if (this._storageMode !== 'storage') {
            return this._state.messages.slice(fromStep - 1);
        }
        
        try {
            const response = await fetch(`${this._storageBase}/${this._state.sessionId}/history/${fromStep}`, {
                headers: this._storageHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`Failed to get history: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data || !Array.isArray(data.history)) {
                console.warn('[SessionStore] Invalid history response');
                return [];
            }
            
            return data.history || [];
        } catch (error) {
            console.error('[SessionStore] getHistory error:', error);
            return [];
        }
    };

    /**
     * List all sessions
     * @returns {Promise<Array>} Array of sessions
     */
    SessionStore.prototype.listSessions = async function() {
        if (this._storageMode !== 'storage') {
            return [];
        }
        
        try {
            const response = await fetch(`${this._storageBase}`, {
                headers: this._storageHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`Failed to list sessions: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data || !Array.isArray(data.sessions)) {
                console.warn('[SessionStore] Invalid sessions list response');
                return [];
            }
            
            return data.sessions || [];
        } catch (error) {
            console.error('[SessionStore] listSessions error:', error);
            return [];
        }
    };

    /**
     * Get current step number (for numbered folder storage)
     * @returns {number}
     */
    SessionStore.prototype.getCurrentStepNumber = function() {
        return this._state.currentStep || 0;
    };

    // Export - create global instance for backward compatibility
    global.SessionStore = new SessionStore();

})(typeof window !== 'undefined' ? window : globalThis);
