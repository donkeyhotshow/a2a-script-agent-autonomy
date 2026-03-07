/**
 * API Integration Module
 * Connects UI components with Client API (single apiBase, e.g. localhost:3001).
 */

// Fetch with timeout and retry logic
const DEFAULT_TIMEOUT = 15000;
const MAX_RETRIES = 3;
const BASE_DELAY = 1000;

async function fetchWithRetry(url, options = {}, retryCount = 0) {
    const controller = new AbortController();
    const timeout = options.timeout || DEFAULT_TIMEOUT;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError' || retryCount >= MAX_RETRIES) {
            throw error;
        }

        const delay = BASE_DELAY * Math.pow(2, retryCount);
        console.warn(`[API] Retry ${retryCount + 1}/${MAX_RETRIES} after ${delay}ms: ${url}`);
        await new Promise(resolve => setTimeout(resolve, delay));

        return fetchWithRetry(url, options, retryCount + 1);
    }
}

class APIIntegration {
    constructor() {
        this.apiBase = '/api';
        this.token = null;
        this.connected = false;
        this.sseConnected = false;
        this.currentSession = null;
        this.currentPromiseId = null;
        this.listeners = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    get serverUrl() {
        return this.apiBase;
    }

    set serverUrl(value) {
        if (value) {
            this.configure({ apiBase: value });
        }
    }

    /**
     * Configure API client
     */
    configure(options = {}) {
        let base = options.apiBase || options.clientApiUrl || options.serverUrl;

        // Handle case where base is an object (extract string property)
        if (base && typeof base === 'object') {
            base = base.url || base.apiBase || base.toString?.();
        }

        // Validate and set apiBase
        if (base && typeof base === 'string' && base !== '[object Object]') {
            this.apiBase = base.replace(/\/?$/, '');
        } else {
            this.apiBase = '/api';
        }

        if (options.token) this.token = options.token;

        console.log('[API] Configured:', this.apiBase);
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
    async request(method, path, body = null, meta = {}) {
        const base = this.apiBase.replace(/\/?$/, '');
        const url = path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
        const options = {
            method,
            headers: this._getHeaders()
        };

        if (body) options.body = JSON.stringify(body);

        const errorContext = {
            module: meta.module || 'APIIntegration',
            path: url,
            url,
            method,
            ...(meta.context || {})
        };

        try {
            const response = await fetchWithRetry(url, options);
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                // Skip error handling for storage API 404s (expected when key doesn't exist)
                const isStorage404 = url.includes('/api/storage/') && response.status === 404;
                if (!isStorage404) {
                    (typeof window !== 'undefined' ? window : globalThis).ErrorHandler?.handleApiError({
                        status: response.status,
                        data,
                        error: data?.error
                    }, errorContext);
                }
                throw new Error(data?.error?.message || `Request failed: ${response.status}`);
            }

            return data.data || data;
        } catch (error) {
            console.error('[API] Request error:', error);
            (typeof window !== 'undefined' ? window : globalThis).ErrorHandler?.handleNetworkError(error, errorContext);
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
                task: taskText,
                projectId: projectPath,
                ...context
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
     * Get projects list
     */
    async getProjects() {
        const raw = await this.request('GET', '/projects');
        return Array.isArray(raw) ? raw : (raw?.projects || raw?.data || []);
    }

    /**
     * Create project (POST /projects)
     */
    async createProject(params) {
        const body = typeof params === 'string' ? { name: params } : (params || {});
        const raw = await this.request('POST', '/projects', body);
        return raw?.data ?? raw;
    }

    /**
     * Delete project (DELETE /projects/:projectId)
     */
    async deleteProject(projectId) {
        return this.request('DELETE', `/projects/${encodeURIComponent(projectId)}`);
    }

    /**
     * Get sessions
     */
    async getSessions(projectId = null) {
        const path = projectId ? `/sessions?projectId=${projectId}` : '/sessions';
        const raw = await this.request('GET', path);
        return Array.isArray(raw) ? raw : (raw?.sessions || raw?.data || []);
    }

    /**
     * Create session (POST /sessions)
     */
    async createSession(params) {
        const raw = await this.request('POST', '/sessions', params);
        const s = raw?.session ?? raw?.data ?? raw;
        if (s && !s.id && s.sessionId) s.id = s.sessionId;
        return s;
    }

    /**
     * Get session by ID (pass projectId when known so server finds the session)
     */
    async getSession(sessionId, projectId = null) {
        const path = projectId ? `/sessions/${sessionId}?projectId=${encodeURIComponent(projectId)}` : `/sessions/${sessionId}`;
        return this.request('GET', path);
    }

    /**
     * Delete session
     */
    async deleteSession(sessionId) {
        return this.request('DELETE', `/sessions/${sessionId}`);
    }

    /**
     * Send message to session (POST /sessions/:id/result with result.message)
     */
    async sendMessage(sessionId, message, projectId = null) {
        const payload = (message || '').trim() || 'continue';
        return this.sendResult(sessionId, { message: payload }, projectId);
    }

    /**
     * Send result to session (POST /sessions/:id/result)
     * Payload matches simulations client.json: { projectId, sessionId, result }
     */
    async sendResult(sessionId, result, projectId = null) {
        const pid = projectId ?? (this.currentSession ? (await (typeof window !== 'undefined' && window.ProjectManager?.getSelectedProjectId?.()) ?? window.SessionStore?.projectId) : null);
        const path = `/sessions/${encodeURIComponent(sessionId)}/result`;
        const body = { projectId: pid, sessionId, result };
        return this.request('POST', path, body);
    }

    /**
     * Search actions (using AI)
     */
    async searchActions(query) {
        const result = await this.sendTask(`Find relevant actions for: ${query}`);
        return result;
    }

    /**
     * Analyze task query: get suggested actions from server. Web only displays; server defines the list.
     */
    async analyzeTask(query, context = 'new-task') {
        const result = await this.request('POST', '/tasks/analyze', {
            query,
            context
        });
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
