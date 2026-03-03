/**
 * API Integration Module
 * Connects UI components with A2A Server API
 *
 * TODO(Task-07): use only Client API base URL (no direct a2a-server) – tasks/client/07-web-client-api-only-no-direct-server.md
 * TODO(Task-07): single config for "API base" = Client API (e.g. localhost:3001); remove server URL
 */

class APIIntegration {
    constructor() {
        this.serverUrl = '/api/v1';
        this.token = null;
        this.connected = false;
        this.sseConnected = false;
        this.currentSession = null;
        this.currentPromiseId = null;
        this.listeners = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    /**
     * Configure API client
     */
    configure(options = {}) {
        if (options.serverUrl) this.serverUrl = options.serverUrl.replace(/\/?$/, '');
        if (options.token) this.token = options.token;

        console.log('[API] Configured:', this.serverUrl);
        return this;
    }

    /**
     * Get headers for requests
     */
    _getHeaders() {
        const headers = {'Content-Type': 'application/json'};
        if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
        return headers;
    }

    /**
     * Make HTTP request
     */
    async request(method, path, body = null) {
        const url = `${this.serverUrl}${path}`;
        const options = {
            method,
            headers: this._getHeaders()
        };

        if (body) options.body = JSON.stringify(body);

        try {
            const response = await fetch(url, options);
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data?.error?.message || `Request failed: ${response.status}`);
            }

            return data.data || data;
        } catch (error) {
            console.error('[API] Request error:', error);
            throw error;
        }
    }

    /**
     * Send task to server
     */
    async sendTask(taskText, options = {}) {
        const {projectPath = '', codeBlocks = [], context = {}} = options;

        console.log('[API] Sending task:', taskText);

        // Emit loading state
        if (window.appState) {
            window.appState.set('loading.tasks', true);
        }
        this.emit('taskSending', {task: taskText});

        try {
            const requestData = {
                message: taskText,
                context: {
                    project_id: projectPath,
                    version: '1.0',
                    ...context
                },
                code_blocks: codeBlocks
            };

            const result = await this.request('POST', '/invoke', requestData);

            this.currentPromiseId = result.promiseId || result.promise_id;

            if (window.appState) {
                window.appState.set('loading.tasks', false);
            }

            this.emit('taskSent', {task: taskText, result});

            return result;
        } catch (error) {
            if (window.appState) {
                window.appState.set('loading.tasks', false);
            }
            this.emit('taskError', error);
            throw error;
        }
    }

    /**
     * Approve action
     */
    async approveAction(approved = true) {
        if (!this.currentSession) {
            throw new Error('No active session');
        }

        const requestData = {
            context: {
                session_id: this.currentSession,
                confirmed: approved,
                actions: window.appState ? window.appState.get('proposedActions') || [] : []
            }
        };

        try {
            const result = await this.request('POST', '/invoke', requestData);
            this.emit('actionApproved', {approved, result});
            return result;
        } catch (error) {
            this.emit('actionApproveError', error);
            throw error;
        }
    }

    /**
     * Send step result
     */
    async sendStepResult(stepResult) {
        if (!this.currentSession) {
            throw new Error('No active session');
        }

        const requestData = {
            context: {
                session_id: this.currentSession,
                step_result: stepResult
            }
        };

        try {
            const result = await this.request('POST', '/invoke', requestData);
            this.emit('stepResultSent', {stepResult, result});
            return result;
        } catch (error) {
            this.emit('stepResultError', error);
            throw error;
        }
    }

    /**
     * Get sessions
     */
    async getSessions(projectId = null) {
        const path = projectId ? `/sessions?projectId=${projectId}` : '/sessions';
        return this.request('GET', path);
    }

    /**
     * Get session by ID
     */
    async getSession(sessionId) {
        return this.request('GET', `/sessions/${sessionId}`);
    }

    /**
     * Delete session
     */
    async deleteSession(sessionId) {
        return this.request('DELETE', `/sessions/${sessionId}`);
    }

    /**
     * Search actions (using AI)
     */
    async searchActions(query) {
        const result = await this.sendTask(`Find relevant actions for: ${query}`);
        return result;
    }

    /**
     * Subscribe to events
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);

        return () => this.listeners.get(event)?.delete(callback);
    }

    /**
     * Emit event
     */
    emit(event, data) {
        this.listeners.get(event)?.forEach(cb => cb(data));
    }
}

// Create singleton instance
const apiIntegration = new APIIntegration();

// Make available globally
if (typeof window !== 'undefined') {
    window.APIIntegration = APIIntegration;
    window.apiIntegration = apiIntegration;
}
