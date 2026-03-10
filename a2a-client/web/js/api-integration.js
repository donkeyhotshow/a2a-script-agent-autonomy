/**
 * API Integration Module
 * Connects UI components with Client API (single apiBase, e.g. localhost:3001).
 * Keeps only configuration/request helpers, project/session/task APIs, and SSE wiring.
 */

// Fetch with timeout and retry logic (shared across web client)
const DEFAULT_TIMEOUT = 15000;
const MAX_RETRIES = 3;
const BASE_DELAY = 2000; // 2 seconds per PROTOCOLS specification

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
        this.sseConnected = false;
        this._listeners = new Map();
    }

    /**
     * Setup SSE listener for execute.ui from SDK
     */
    _setupSseListener() {
        if (typeof EventSource === 'undefined') {
            console.warn('[api-integration] EventSource not available, skipping SSE listener');
            return;
        }

        try {
            const eventSource = new EventSource(`${this.apiBase}/sse`);

            eventSource.addEventListener('status', (event) => {
                this._handleSseEvent('status', event);
            });

            eventSource.addEventListener('task_response', (event) => {
                this._handleSseEvent('task_response', event);
            });

            eventSource.onerror = (error) => {
                console.warn('[api-integration] SSE connection error:', error);
                this.sseConnected = false;
                this.emit('promiseError', { source: 'sse', error });
            };

            eventSource.onopen = () => {
                this.sseConnected = true;
                console.log('[api-integration] SSE connected');
            };

            this._eventSource = eventSource;
        } catch (error) {
            console.warn('[api-integration] SSE setup failed:', error);
        }
    }

    _handleSseEvent(eventName, event) {
        try {
            const data = JSON.parse(event.data);

            if (data.execute?.ui) {
                this.emit('uiStateChange', {
                    promiseId: data.promiseId,
                    ui: data.execute.ui
                });
            }

            if (eventName === 'task_response' && (data.result || data.execute)) {
                this.emit('taskCompleted', {
                    promiseId: data.promiseId,
                    result: data.result || data
                });
            }

            this.emit('serverResponse', { type: eventName, data });
        } catch (error) {
            console.warn('[api-integration] Failed to parse SSE event:', error);
        }
    }

    /**
     * Configure API client
     */
    configure(options = {}) {
        let base = options.apiBase || options.clientApiUrl;
        if (base && typeof base === 'object') {
            base = base.url || base.apiBase || base.toString?.();
        }

        if (base && typeof base === 'string' && base !== '[object Object]') {
            this.apiBase = base.replace(/\/?$/, '');
        }

        if (options.token) {
            this.token = options.token;
        }

        console.log('[API] Configured:', this.apiBase);
        return this;
    }

    /**
     * Get headers for requests
     */
    _getHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
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
            method,
            ...(meta.context || {})
        };

        try {
            const response = await fetchWithRetry(url, options);
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                const payload = { status: response.status, data, context: errorContext };
                this.emit('promiseError', payload);
                throw new Error(data?.error?.message || `Request failed: ${response.status}`);
            }

            return data.data || data;
        } catch (error) {
            console.error('[API] Request error:', error);
            this.emit('networkError', { error, context: errorContext });
            this.emit('promiseError', { error, context: errorContext });
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
        const raw = await this.request('POST', '/sessions', { ...params, sync: true });
        return raw?.session ?? raw?.data ?? raw;
    }

    /**
     * Get session by ID
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
     * Cancel running session
     */
    async cancelSession(sessionId) {
        return this.request('POST', `/sessions/${sessionId}/cancel`);
    }

    /**
     * Search actions
     */
    async searchActions(query) {
        return this.request('POST', '/tasks/analyze', {
            query,
            context: 'search-actions'
        });
    }

    /**
     * Analyze task
     */
    async analyzeTask(query, context = 'new-task') {
        return this.request('POST', '/tasks/analyze', {
            query,
            context
        });
    }

    /**
     * Subscribe to events
     */
    on(event, callback) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }
        this._listeners.get(event).add(callback);
        return () => this._listeners.get(event)?.delete(callback);
    }

    /**
     * Emit event
     */
    emit(event, data) {
        this._listeners.get(event)?.forEach(cb => cb(data));
    }
}

const apiIntegration = new APIIntegration();

if (typeof window !== 'undefined') {
    window.APIIntegration = APIIntegration;
    window.apiIntegration = apiIntegration;
    if (!window.fetchWithRetry) {
        window.fetchWithRetry = fetchWithRetry;
    }
} else {
    if (!globalThis.fetchWithRetry) {
        globalThis.fetchWithRetry = fetchWithRetry;
    }
}
