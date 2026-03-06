/**
 * Session Manager UI Module
 * Handles session list, creation, deletion, and real-time conversation display
 * 
 * Supports new protocol format (v2.0):
 * - execute.form.choices for action selection
 * - execute.message for UI-only messages
 * - result: { choice: "..." } for submitting selections
 * - context.version: "2.0" for new format
 */

(function (global) {
    'use strict';

    const SessionManager = {
        // Configuration
        apiBase: '/api',
        currentSessionId: null,
        currentProjectId: null,
        sessions: [],
        _listeners: new Map(),
        _updateInterval: null,
        _lastUpdate: null,
        
        // New protocol v2.0 state
        _currentContext: null,
        _pendingForm: null,

        /**
         * Initialize session manager
         */
        init(options = {}) {
            this.apiBase = options.apiBase || this.apiBase;
            this.currentProjectId = options.projectId || null;
            
            // Load sessions if project is set
            if (this.currentProjectId) {
                this.loadSessions();
            }
            
            console.log('[SessionManager] Initialized');
            return this;
        },

        /**
         * Configure API base URL
         */
        configure(options = {}) {
            if (options.apiBase) this.apiBase = options.apiBase.replace(/\/?$/, '');
            if (options.projectId) this.currentProjectId = options.projectId;
            return this;
        },

        /**
         * Get authentication headers
         */
        _getHeaders() {
            const headers = { 'Content-Type': 'application/json' };
            const token = global.apiIntegration?.token;
            if (token) headers['Authorization'] = `Bearer ${token}`;
            return headers;
        },

        /**
         * Make API request
         */
        async _request(method, path, body = null) {
            const url = `${this.apiBase}${path}`;
            const options = { method, headers: this._getHeaders() };
            if (body) options.body = JSON.stringify(body);

            try {
                const response = await fetch(url, options);
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    global.ErrorHandler?.handleApiError({
                        status: response.status,
                        data,
                        error: data?.error
                    }, { module: 'SessionManager', path: url, method });
                    throw new Error(data?.error?.message || `Request failed: ${response.status}`);
                }
                return data.data || data;
            } catch (error) {
                console.error('[SessionManager] Request error:', error);
                global.ErrorHandler?.handleNetworkError(error, { module: 'SessionManager', path: url, method });
                throw error;
            }
        },

        /**
         * Load sessions for current project
         */
        async loadSessions(projectId = null) {
            const pid = projectId || this.currentProjectId;
            if (!pid) {
                console.warn('[SessionManager] No project ID specified');
                return [];
            }

            try {
                this.sessions = await this._request('GET', `/sessions?projectId=${pid}`);
                this.emit('sessionsLoaded', this.sessions);
                return this.sessions;
            } catch (error) {
                console.error('[SessionManager] Failed to load sessions:', error);
                this.emit('error', error);
                return [];
            }
        },

        /**
         * Create new session
         */
        async createSession(options = {}) {
            const { projectId = this.currentProjectId, title = '', task = '' } = options;
            if (!projectId) {
                throw new Error('Project ID is required');
            }

            try {
                const session = await this._request('POST', '/sessions', {
                    projectId,
                    title: title || `Session ${new Date().toLocaleString()}`,
                    task
                });
                
                this.sessions.unshift(session);
                this.emit('sessionCreated', session);
                return session;
            } catch (error) {
                console.error('[SessionManager] Failed to create session:', error);
                this.emit('error', error);
                throw error;
            }
        },

        /**
         * Get session by ID
         */
        async getSession(sessionId) {
            if (!sessionId) {
                throw new Error('Session ID is required');
            }

            try {
                const session = await this._request('GET', `/sessions/${sessionId}`);
                this.emit('sessionLoaded', session);
                return session;
            } catch (error) {
                console.error('[SessionManager] Failed to get session:', error);
                this.emit('error', error);
                throw error;
            }
        },

        /**
         * Delete session
         */
        async deleteSession(sessionId) {
            if (!sessionId) {
                throw new Error('Session ID is required');
            }

            try {
                await this._request('DELETE', `/sessions/${sessionId}`);
                this.sessions = this.sessions.filter(s => s.id !== sessionId && s.sessionId !== sessionId);
                this.emit('sessionDeleted', sessionId);
                return true;
            } catch (error) {
                console.error('[SessionManager] Failed to delete session:', error);
                this.emit('error', error);
                throw error;
            }
        },

        /**
         * Set active session
         */
        setActiveSession(sessionId) {
            this.currentSessionId = sessionId;
            this.emit('sessionChanged', sessionId);
            
            // Connect to SSE for this session
            if (global.SSEClient) {
                global.SSEClient.connect(sessionId, this.apiBase);
            }
        },

        /**
         * Update session data on server
         * @param {string} sessionId - ID of session to update
         * @param {Object} updates - Data to update
         * @returns {Promise<Object>} Updated session
         */
        async updateSession(sessionId, updates) {
            const sid = sessionId || this.currentSessionId;
            if (!sid) {
                throw new Error('No session ID');
            }

            try {
                const result = await this._request('PATCH', `/sessions/${sid}`, updates);
                return result;
            } catch (error) {
                console.error('[SessionManager] Failed to update session:', error);
                throw error;
            }
        },

        /**
         * Get conversation history for session
         */
        async getConversation(sessionId) {
            const sid = sessionId || this.currentSessionId;
            if (!sid) {
                throw new Error('No session ID');
            }

            try {
                const session = await this._request('GET', `/sessions/${sid}`);
                const messages = session?.messages || session?.dialog || [];
                this.emit('conversationLoaded', { sessionId: sid, messages });
                return messages;
            } catch (error) {
                console.error('[SessionManager] Failed to load conversation:', error);
                this.emit('error', error);
                throw error;
            }
        },

        /**
         * Subscribe to events
         */
        on(event, callback) {
            if (!this._listeners.has(event)) {
                this._listeners.set(event, new Set());
            }
            this._listeners.get(event).add(callback);
            return () => this.off(event, callback);
        },

        /**
         * Unsubscribe from events
         */
        off(event, callback) {
            this._listeners.get(event)?.delete(callback);
        },

        /**
         * Emit event
         */
        emit(event, data) {
            this._listeners.get(event)?.forEach(cb => {
                try { cb(data); } catch (e) { console.error('[SessionManager] Event handler error:', e); }
            });
        },

        /**
         * Render sessions list to DOM element
         */
        renderSessionsList(containerId, options = {}) {
            const container = document.getElementById(containerId);
            if (!container) {
                console.warn(`[SessionManager] Container not found: ${containerId}`);
                return;
            }

            const { 
                onSelect = () => {},
                onDelete = () => {},
                onCreate = () => {},
                emptyMessage = 'No sessions yet',
                showCreateButton = true
            } = options;

            let html = '';
            
            if (showCreateButton) {
                html += `<div class="session-manager-actions">
                    <button type="button" class="btn btn-primary" id="sessionManagerCreateBtn">+ New Session</button>
                </div>`;
            }

            if (this.sessions.length === 0) {
                html += `<div class="session-manager-empty">${emptyMessage}</div>`;
            } else {
                html += '<div class="session-manager-list">';
                this.sessions.forEach(session => {
                    const id = session.id || session.sessionId || session;
                    const title = session.title || session.name || `Session ${id.slice(0, 8)}`;
                    const active = id === this.currentSessionId ? ' active' : '';
                    const status = session.status || '';
                    
                    html += `<div class="session-item${active}" data-session-id="${escapeHtml(id)}">
                        <div class="session-item-content">
                            <span class="session-item-title">${escapeHtml(title)}</span>
                            ${status ? `<span class="session-item-status">${escapeHtml(status)}</span>` : ''}
                        </div>
                        <button type="button" class="session-item-delete" title="Delete">&times;</button>
                    </div>`;
                });
                html += '</div>';
            }

            container.innerHTML = html;

            // Bind events
            container.querySelectorAll('.session-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    if (!e.target.classList.contains('session-item-delete')) {
                        const sid = item.dataset.sessionId;
                        this.setActiveSession(sid);
                        onSelect(sid);
                    }
                });
            });

            container.querySelectorAll('.session-item-delete').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const item = btn.closest('.session-item');
                    const sid = item?.dataset.sessionId;
                    if (sid && confirm('Delete this session?')) {
                        this.deleteSession(sid).then(() => onDelete(sid));
                    }
                });
            });

            const createBtn = document.getElementById('sessionManagerCreateBtn');
            if (createBtn) {
                createBtn.addEventListener('click', () => {
                    this.createSession().then(session => {
                        const sid = session?.id || session?.sessionId;
                        if (sid) {
                            this.setActiveSession(sid);
                            onCreate(session);
                        }
                    });
                });
            }
        },

        /**
         * Render conversation to DOM element
         */
        renderConversation(containerId, messages = []) {
            const container = document.getElementById(containerId);
            if (!container) return;

            if (messages.length === 0) {
                container.innerHTML = '<div class="conversation-empty">No messages yet</div>';
                return;
            }

            let html = '<div class="conversation-messages">';
            messages.forEach(msg => {
                const role = msg.role || msg.direction || 'unknown';
                const content = msg.content || msg.text || msg.message || '';
                const timestamp = msg.timestamp || msg.createdAt || '';
                
                html += `<div class="conversation-message message-${role}">
                    <div class="message-header">
                        <span class="message-role">${escapeHtml(role)}</span>
                        ${timestamp ? `<span class="message-time">${new Date(timestamp).toLocaleTimeString()}</span>` : ''}
                    </div>
                    <div class="message-content">${escapeHtml(String(content))}</div>
                </div>`;
            });
            html += '</div>';

            container.innerHTML = html;
            container.scrollTop = container.scrollHeight;
        },

        /**
         * Append message to conversation
         */
        appendMessage(message) {
            const container = document.getElementById('conversationContainer');
            if (!container) return;

            let messagesEl = container.querySelector('.conversation-messages');
            if (!messagesEl) {
                container.innerHTML = '<div class="conversation-messages"></div>';
                messagesEl = container.querySelector('.conversation-messages');
            }

            const role = message.role || message.direction || 'unknown';
            const content = message.content || message.text || message.message || '';
            const timestamp = message.timestamp || message.createdAt || new Date().toISOString();

            const msgEl = document.createElement('div');
            msgEl.className = `conversation-message message-${role}`;
            msgEl.innerHTML = `
                <div class="message-header">
                    <span class="message-role">${escapeHtml(role)}</span>
                    <span class="message-time">${new Date(timestamp).toLocaleTimeString()}</span>
                </div>
                <div class="message-content">${escapeHtml(String(content))}</div>
            `;

            messagesEl.appendChild(msgEl);
            container.scrollTop = container.scrollHeight;
        },

        /**
         * Process execute from server response (new protocol v2.0)
         * Handles form.choices, message, and other execute types
         * @param {Object} execute - execute object from server response
         * @param {Object} context - context object from server response
         */
        processExecute(execute, context = null) {
            // Store context for later use
            if (context) {
                this._currentContext = context;
                this.emit('contextUpdated', context);

                // Task 3.1: Emit execution.step for UI visualization
                const execution = context?.execution;
                if (execution?.step) {
                    const stepName = execution.step;
                    // Determine if it's an AI-Action (llm request) or regular Action
                    const isLlmRequest = stepName === 'llm-request' || execution.action?.startsWith('ai-');
                    this.emit('executionStep', {
                        step: stepName,
                        action: execution.action,
                        isLlmRequest,
                        displayName: isLlmRequest ? 'llm-request' : stepName
                    });
                }

                // Task 3.2: Emit execution.progress for progress bar
                if (execution?.progress !== undefined) {
                    this.emit('executionProgress', {
                        progress: execution.progress,
                        action: execution.action,
                        step: execution.step
                    });
                }
            }

            // Task 3.3: Handle finalResult for completion display
            const finalResult = execute?.finalResult;
            if (finalResult) {
                this.emit('finalResultReceived', finalResult);
                return { type: 'finalResult', data: finalResult };
            }

            // Handle execute.form (choices)
            if (execute?.form) {
                this._pendingForm = execute.form;
                this.emit('formReceived', execute.form);
                return { type: 'form', data: execute.form };
            }

            // Handle execute.message (UI-only)
            if (execute?.message) {
                const message = typeof execute.message === 'string' 
                    ? { content: execute.message } 
                    : execute.message;
                this.emit('messageReceived', message);
                return { type: 'message', data: message };
            }

            // Handle execute.script
            if (execute?.script) {
                this.emit('scriptReceived', execute.script);
                return { type: 'script', data: execute.script };
            }

            // Handle execute['rag-search']
            if (execute?.['rag-search']) {
                this.emit('ragSearchReceived', execute['rag-search']);
                return { type: 'rag-search', data: execute['rag-search'] };
            }

            // Handle execute['read-file']
            if (execute?.['read-file']) {
                this.emit('readFileReceived', execute['read-file']);
                return { type: 'read-file', data: execute['read-file'] };
            }

            // Handle execute['write-file']
            if (execute?.['write-file']) {
                this.emit('writeFileReceived', execute['write-file']);
                return { type: 'write-file', data: execute['write-file'] };
            }

            // Handle execute['execute-command']
            if (execute?.['execute-command']) {
                this.emit('executeCommandReceived', execute['execute-command']);
                return { type: 'execute-command', data: execute['execute-command'] };
            }

            this.emit('executeReceived', execute);
            return { type: 'unknown', data: execute };
        },

        /**
         * Submit choice selection (new protocol v2.0)
         * @param {string} choiceId - ID of the selected choice
         * @returns {Promise<Object>} Result to send to server
         */
        submitChoice(choiceId) {
            if (!this.currentSessionId) {
                throw new Error('No active session');
            }

            const result = { choice: choiceId };
            
            // Emit event for listeners
            this.emit('choiceSubmitted', { choiceId, result });
            
            // Clear pending form
            this._pendingForm = null;
            
            return result;
        },

        /**
         * Submit input to form (new protocol v2.0)
         * @param {Object} inputData - Input data from form
         * @returns {Promise<Object>} Result to send to server
         */
        submitFormInput(inputData) {
            if (!this.currentSessionId) {
                throw new Error('No active session');
            }

            const result = { input: inputData };
            
            // Emit event for listeners
            this.emit('formInputSubmitted', { input: inputData, result });
            
            // Clear pending form
            this._pendingForm = null;
            
            return result;
        },

        /**
         * Submit script result to server (new protocol v2.0)
         * @param {Object} scriptResult - Result from script execution
         * @returns {Promise<Object>} Formatted result for server
         */
        submitScriptResult(scriptResult) {
            if (!this.currentSessionId) {
                throw new Error('No active session');
            }

            // Use action-key shape: result: { script: { ... } }
            const result = { script: scriptResult };
            
            this.emit('scriptResultSubmitted', { result });
            return result;
        },

        /**
         * Submit rag-search result to server (new protocol v2.0)
         * @param {Object} searchResult - Result from RAG search
         * @returns {Promise<Object>} Formatted result for server
         */
        submitRagSearchResult(searchResult) {
            if (!this.currentSessionId) {
                throw new Error('No active session');
            }

            // Use action-key shape: result: { 'rag-search': { ... } }
            const result = { 'rag-search': searchResult };
            
            this.emit('ragSearchResultSubmitted', { result });
            return result;
        },

        /**
         * Submit read-file result to server (new protocol v2.0)
         * @param {Object} fileResult - Result from file read
         * @returns {Promise<Object>} Formatted result for server
         */
        submitReadFileResult(fileResult) {
            if (!this.currentSessionId) {
                throw new Error('No active session');
            }

            // Use action-key shape: result: { 'read-file': { ... } }
            const result = { 'read-file': fileResult };
            
            this.emit('readFileResultSubmitted', { result });
            return result;
        },

        /**
         * Submit write-file result to server (new protocol v2.0)
         * @param {Object} fileResult - Result from file write
         * @returns {Promise<Object>} Formatted result for server
         */
        submitWriteFileResult(fileResult) {
            if (!this.currentSessionId) {
                throw new Error('No active session');
            }

            // Use action-key shape: result: { 'write-file': { ... } }
            const result = { 'write-file': fileResult };
            
            this.emit('writeFileResultSubmitted', { result });
            return result;
        },

        /**
         * Submit execute-command result to server (new protocol v2.0)
         * @param {Object} commandResult - Result from command execution
         * @returns {Promise<Object>} Formatted result for server
         */
        submitExecuteCommandResult(commandResult) {
            if (!this.currentSessionId) {
                throw new Error('No active session');
            }

            // Use action-key shape: result: { 'execute-command': { ... } }
            const result = { 'execute-command': commandResult };
            
            this.emit('executeCommandResultSubmitted', { result });
            return result;
        },

        /**
         * Get current pending form (if any)
         * @returns {Object|null}
         */
        getPendingForm() {
            return this._pendingForm;
        },

        /**
         * Check if context is using new protocol v2.0
         * @returns {boolean}
         */
        isProtocolV2() {
            return this._currentContext?.version === '2.0';
        },

        /**
         * Get current execution state from context
         * @returns {Object|null}
         */
        getExecutionState() {
            return this._currentContext?.execution || null;
        },

        /**
         * Send result to server via POST /api/sessions/:id/result
         * @param {Object} result - Result object in action-key shape
         * @returns {Promise<Object>} Server response
         */
        async sendResult(result) {
            if (!this.currentSessionId) {
                throw new Error('No active session');
            }

            try {
                const response = await this._request('POST', `/sessions/${this.currentSessionId}/result`, result);
                
                // Process execute from response if present
                if (response?.execute) {
                    this.processExecute(response.execute, response.context);
                }
                
                return response;
            } catch (error) {
                console.error('[SessionManager] Failed to send result:', error);
                this.emit('error', error);
                throw error;
            }
        },

        /**
         * Select action and start execution (new protocol v2.0)
         * @param {string} actionId - ID of action to select
         * @returns {Promise<Object>} Server response
         */
        async selectAction(actionId) {
            if (!this.currentSessionId) {
                throw new Error('No active session');
            }

            try {
                const response = await this._request('POST', `/sessions/${this.currentSessionId}/action`, {
                    selectedAction: actionId
                });
                
                // Process execute from response if present
                if (response?.execute) {
                    this.processExecute(response.execute, response.context);
                }
                
                return response;
            } catch (error) {
                console.error('[SessionManager] Failed to select action:', error);
                this.emit('error', error);
                throw error;
            }
        },

        /**
         * Execute next step (manual or auto mode)
         * @param {string} mode - 'manual' or 'auto'
         * @returns {Promise<Object>} Server response
         */
        async executeNext(mode = 'manual') {
            if (!this.currentSessionId) {
                throw new Error('No active session');
            }

            try {
                const response = await this._request('POST', `/sessions/${this.currentSessionId}/next`, { mode });
                
                // Process execute from response if present
                if (response?.execute) {
                    this.processExecute(response.execute, response.context);
                }
                
                return response;
            } catch (error) {
                console.error('[SessionManager] Failed to execute next:', error);
                this.emit('error', error);
                throw error;
            }
        },

        /**
         * Handle SSE message (new protocol v2.0)
         * @param {Object} data - Message data from SSE
         */
        handleSSEMessage(data) {
            // Handle new protocol format with execute object
            if (data?.execute) {
                this.processExecute(data.execute, data.context);
                return;
            }

            // Handle legacy format with content/messages
            if (data?.content) {
                this.appendMessage({
                    role: 'assistant',
                    content: data.content,
                    timestamp: data.timestamp || new Date().toISOString()
                });
            }

            // Handle messages array
            if (data?.messages?.length) {
                data.messages.forEach(msg => this.appendMessage(msg));
            }

            // Handle status updates
            if (data?.status) {
                this.emit('statusChanged', data.status);
            }

            // Handle context updates
            if (data?.context) {
                this._currentContext = data.context;
                this.emit('contextUpdated', data.context);
            }
        }
    };

    // Escape HTML helper
    function escapeHtml(s) {
        if (s == null) return '';
        const el = document.createElement('div');
        el.textContent = String(s);
        return el.innerHTML;
    }

    // Export
    global.SessionManager = SessionManager;

})(typeof window !== 'undefined' ? window : globalThis);
