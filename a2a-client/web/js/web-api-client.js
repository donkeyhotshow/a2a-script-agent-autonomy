/**
 * Unified Web API Client
 * Combines session management, real-time communication, and file transfer
 * for the A2A web interface
 */

(function (global) {
    'use strict';

    /**
     * Main WebApiClient class that orchestrates all modules
     */
    class WebApiClient {
        constructor(options = {}) {
            this.options = {
                apiBase: options.apiBase || '/api/v1',
                autoConnect: options.autoConnect !== false,
                ...options
            };

            // Initialize sub-modules
            this._initModules();
            
            // Setup event forwarding
            this._setupEventForwarding();
        }

        /**
         * Initialize all sub-modules
         */
        _initModules() {
            // Session Manager
            if (global.SessionManager) {
                this.sessions = global.SessionManager;
                this.sessions.configure({ apiBase: this.options.apiBase });
            }

            // SSE Client (existing)
            if (global.SSEClient) {
                this.sse = global.SSEClient;
                this.sse.configureApi(this.options.apiBase);
            }

            // WebSocket Client
            if (global.WebSocketClient) {
                this.ws = global.WebSocketClient;
                this.ws.configure({ apiBase: this.options.apiBase });
            }

            // Progress Indicators
            if (global.ProgressIndicators) {
                this.progress = global.ProgressIndicators;
            }

            // Error Handler
            if (global.ErrorHandler) {
                this.errors = global.ErrorHandler;
                this.errors.init();
            }

            // File Transfer
            if (global.FileTransfer) {
                this.files = global.FileTransfer;
                this.files.configure({ apiBase: this.options.apiBase });
            }

            // Terminal Emulator
            if (global.TerminalEmulator) {
                this.terminal = global.TerminalEmulator;
                this.terminal.configure({ apiBase: this.options.apiBase });
            }

            // RAG Search UI
            if (global.RAGSearchUI) {
                this.rag = global.RAGSearchUI;
                this.rag.configure({ apiBase: this.options.apiBase });
            }
        }

        /**
         * Setup event forwarding between modules
         */
        _setupEventForwarding() {
            // Forward SSE events to main client
            if (this.sse) {
                this.sse.on('progress', (data) => this._emit('progress', data));
                this.sse.on('complete', (data) => this._emit('complete', data));
                this.sse.on('error', (data) => this._emit('error', data));
                this.sse.on('message', (data) => this._emit('message', data));
                this.sse.on('session_update', (data) => this._emit('sessionUpdate', data));
            }

            // Forward WebSocket events
            if (this.ws) {
                this.ws.on('connected', (data) => this._emit('wsConnected', data));
                this.ws.on('disconnected', (data) => this._emit('wsDisconnected', data));
                this.ws.on('message', (data) => this._emit('wsMessage', data));
            }

            // Forward progress events
            if (this.progress) {
                this.progress.on('progress', (data) => this._emit('progress', data));
                this.progress.on('complete', (data) => this._emit('complete', data));
                this.progress.on('error', (data) => this._emit('progressError', data));
            }

            // Forward error events
            if (this.errors) {
                this.errors.on('error', (data) => this._emit('error', data));
                this.errors.on('retry', (data) => this._emit('retry', data));
            }

            // Forward Terminal events
            if (this.terminal) {
                this.terminal.on('connected', (data) => this._emit('terminalConnected', data));
                this.terminal.on('disconnected', (data) => this._emit('terminalDisconnected', data));
                this.terminal.on('message', (data) => this._emit('terminalMessage', data));
                this.terminal.on('command', (data) => this._emit('terminalCommand', data));
                this.terminal.on('cleared', (data) => this._emit('terminalCleared', data));
            }

            // Forward RAG Search events
            if (this.rag) {
                this.rag.on('viewFile', (data) => this._emit('ragViewFile', data));
                this.rag.on('notification', (data) => this._emit('ragNotification', data));
            }
        }

        /**
         * Event system
         */
        _listeners = new Map();

        on(event, callback) {
            if (!this._listeners.has(event)) {
                this._listeners.set(event, new Set());
            }
            this._listeners.get(event).add(callback);
            return () => this.off(event, callback);
        }

        off(event, callback) {
            this._listeners.get(event)?.delete(callback);
        }

        _emit(event, data) {
            this._listeners.get(event)?.forEach(cb => {
                try { cb(data); } catch (e) { console.error('[WebApiClient] Event error:', e); }
            });
        }

        // ========== Session Methods ==========

        /**
         * Load sessions for a project
         */
        async loadSessions(projectId) {
            if (this.sessions) {
                return await this.sessions.loadSessions(projectId);
            }
            return [];
        }

        /**
         * Create a new session
         */
        async createSession(options = {}) {
            if (this.sessions) {
                const session = await this.sessions.createSession(options);
                if (this.options.autoConnect) {
                    this.connectSession(session.id || session.sessionId);
                }
                return session;
            }
            return null;
        }

        /**
         * Delete a session
         */
        async deleteSession(sessionId) {
            if (this.sessions) {
                return await this.sessions.deleteSession(sessionId);
            }
            return false;
        }

        /**
         * Get session details
         */
        async getSession(sessionId) {
            if (this.sessions) {
                return await this.sessions.getSession(sessionId);
            }
            return null;
        }

        /**
         * Get conversation history
         */
        async getConversation(sessionId) {
            if (this.sessions) {
                return await this.sessions.getConversation(sessionId);
            }
            return [];
        }

        // ========== Connection Methods ==========

        /**
         * Connect to session via SSE
         */
        connectSession(sessionId) {
            if (this.sse) {
                this.sse.connect(sessionId, this.options.apiBase);
            }
            if (this.ws && this.options.autoConnect) {
                this.ws.connect(sessionId);
            }
            if (this.sessions) {
                this.sessions.setActiveSession(sessionId);
            }
        }

        /**
         * Disconnect from session
         */
        disconnectSession() {
            if (this.sse) {
                this.sse.disconnect();
            }
            if (this.ws) {
                this.ws.disconnect();
            }
        }

        // ========== Terminal Methods ==========

        /**
         * Initialize terminal emulator
         */
        initTerminal(containerSelector) {
            if (this.terminal) {
                return this.terminal.init(containerSelector);
            }
            return null;
        }

        /**
         * Connect to terminal WebSocket
         */
        connectTerminal(sessionId) {
            if (this.terminal) {
                this.terminal.connect(sessionId);
            }
        }

        /**
         * Disconnect from terminal
         */
        disconnectTerminal() {
            if (this.terminal) {
                this.terminal.disconnect();
            }
        }

        /**
         * Send command to terminal
         */
        sendTerminalCommand(command) {
            if (this.terminal) {
                this.terminal.send({ type: 'command', content: command });
            }
        }

        // ========== RAG Search Methods ==========

        /**
         * Initialize RAG search UI
         */
        initRAGSearch(containerSelector) {
            if (this.rag) {
                return this.rag.init(containerSelector);
            }
            return null;
        }

        /**
         * Perform RAG search
         */
        async searchRAG(query, options = {}) {
            if (this.rag) {
                return await this.rag.performSearch(query);
            }
            return [];
        }

        /**
         * Check connection status
         */
        isConnected() {
            return this.sse?.isConnected() || this.ws?.isConnected() || false;
        }

        // ========== Task Methods ==========

        /**
         * Send a task
         */
        async sendTask(taskText, options = {}) {
            const { projectId } = options;
            
            // Create session if not provided
            let sessionId = options.sessionId;
            if (!sessionId && projectId) {
                const session = await this.createSession({ projectId, task: taskText });
                sessionId = session?.id || session?.sessionId;
            }

            if (!sessionId) {
                throw new Error('No session ID available');
            }

            // Connect to session
            this.connectSession(sessionId);

            // Send task via SSE
            if (this.sse) {
                return await this.sse.createRequest({
                    sessionId,
                    task: taskText,
                    context: options.context || {}
                });
            }

            throw new Error('SSE client not available');
        }

        /**
         * Approve an action
         */
        async approveAction(sessionId, approved) {
            if (this.sse) {
                return await this.sse.approveAction(sessionId, approved);
            }
            throw new Error('SSE client not available');
        }

        /**
         * Send step result
         */
        async sendStepResult(sessionId, stepResult) {
            if (this.sse) {
                return await this.sse.sendStepResult(sessionId, stepResult);
            }
            throw new Error('SSE client not available');
        }

        // ========== File Methods ==========

        /**
         * Upload a file
         */
        async uploadFile(file, options = {}) {
            if (this.files) {
                return await this.files.uploadFile(file, options);
            }
            throw new Error('File transfer not available');
        }

        /**
         * Download a file
         */
        async downloadFile(fileId, options = {}) {
            if (this.files) {
                return await this.files.downloadFile(fileId, options);
            }
            throw new Error('File transfer not available');
        }

        // ========== Progress Methods ==========

        /**
         * Create a progress tracker
         */
        createProgressTracker(id, options = {}) {
            if (this.progress) {
                return this.progress.create(id, options);
            }
            return null;
        }

        /**
         * Get progress tracker
         */
        getProgressTracker(id) {
            if (this.progress) {
                return this.progress.get(id);
            }
            return null;
        }

        // ========== Error Methods ==========

        /**
         * Handle error
         */
        handleError(error, context = {}) {
            if (this.errors) {
                return this.errors.handle(error, context);
            }
            console.error('[WebApiClient] Unhandled error:', error);
        }

        /**
         * Clear errors
         */
        clearErrors() {
            if (this.errors) {
                this.errors.clearErrors();
            }
        }

        // ========== Utility Methods ==========

        /**
         * Configure the client
         */
        configure(options = {}) {
            if (options.apiBase) {
                this.options.apiBase = options.apiBase;
                if (this.sessions) this.sessions.configure({ apiBase: options.apiBase });
                if (this.sse) this.sse.configureApi(options.apiBase);
                if (this.ws) this.ws.configure({ apiBase: options.apiBase });
                if (this.files) this.files.configure({ apiBase: options.apiBase });
            }
            return this;
        }

        /**
         * Get module by name
         */
        getModule(name) {
            return this[name] || null;
        }
    }

    // Create and export singleton instance
    const webApiClient = new WebApiClient();

    // Export
    global.WebApiClient = WebApiClient;
    global.webApiClient = webApiClient;

})(typeof window !== 'undefined' ? window : globalThis);
