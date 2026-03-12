/**
 * API Integration Module
 * Connects UI components with Client API (single apiBase, e.g. localhost:3001).
 * Uses HTTP with promiseId polling. SSE/WebSocket removed.
 * 
 * Step Files Structure (storage mode):
 * storage/sessions/{SESSION_ID}/{STEP}/
 *   - server-response.json - ответ от A2A сервера
 *   - server-promise.json - данные о промисе (если есть)
 *   - client-result.json - результат от клиента (web/авто)
 *   - request-to-server.json - запрос к серверу
 *   - messages.json - история сообщений
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
        this._listeners = new Map();
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
     * Get projects list (uses Vite plugin at /api/a2a/projects)
     */
    async getProjects() {
        const res = await fetch('/api/a2a/projects');
        if (!res.ok) throw new Error(`getProjects failed: ${res.status}`);
        const raw = await res.json();
        return Array.isArray(raw) ? raw : (raw?.projects || raw?.data || []);
    }

    /**
     * Create/update projects (POST /api/a2a/projects)
     */
    async createProject(params) {
        const body = typeof params === 'string' ? { name: params } : (params || {});
        const res = await fetch('/api/a2a/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(`createProject failed: ${res.status}`);
        const raw = await res.json();
        return raw?.data ?? raw;
    }

    /**
     * Delete project (not implemented in vite-plugin-a2a)
     */
    async deleteProject(projectId) {
        console.warn('[API] deleteProject not implemented');
        return { success: false };
    }

    _getStorageHeaders() {
        const mode = (typeof window !== 'undefined' ? window : globalThis).SessionStore?.getStorageMode?.() || 'storage';
        return { 'X-Storage-Mode': mode };
    }

    /**
     * Get sessions (uses Vite plugin)
     */
    async getSessions(projectId = null) {
        const headers = { ...this._getHeaders(), ...this._getStorageHeaders() };
        const res = await fetch(`/api/a2a/sessions`, { headers });
        if (!res.ok) return [];
        const raw = await res.json();
        let sessions = Array.isArray(raw) ? raw : (raw?.sessions || raw?.data || []);
        // Filter by projectId if provided
        if (projectId) {
            sessions = sessions.filter(s => s.projectId === projectId || s.projectId === undefined);
        }
        return sessions;
    }

    /**
     * Create session (uses Vite plugin)
     */
    async createSession(params = {}) {
        const headers = { 'Content-Type': 'application/json', ...this._getStorageHeaders() };
        const res = await fetch(`/api/a2a/sessions`, {
            method: 'POST',
            headers,
            body: JSON.stringify(params)
        });
        if (!res.ok) throw new Error(`createSession failed: ${res.status}`);
        const raw = await res.json();
        return raw?.session ?? raw?.data ?? raw;
    }

    /**
     * Get session by ID (uses Vite plugin)
     */
    async getSession(sessionId) {
        const headers = { ...this._getHeaders(), ...this._getStorageHeaders() };
        const res = await fetch(`/api/a2a/sessions/${encodeURIComponent(sessionId)}`, { headers });
        if (!res.ok) return null;
        return res.json();
    }

    /**
     * Delete session (uses Vite plugin)
     */
    async deleteSession(sessionId) {
        const headers = { ...this._getStorageHeaders() };
        const res = await fetch(`/api/a2a/sessions/${encodeURIComponent(sessionId)}`, {
            method: 'DELETE',
            headers
        });
        return { success: res.ok };
    }



    // === Step Files API ===
    
    /**
     * Submit client result and trigger next step
     * This creates client-result.json and sends request to A2A Server
     */
    async submitNext(sessionId, result) {
        const headers = { 'Content-Type': 'application/json', ...this._getStorageHeaders() };
        const res = await fetch(`/api/a2a/sessions/${encodeURIComponent(sessionId)}/next`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ result })
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(error?.error?.message || `submitNext failed: ${res.status}`);
        }
        return res.json();
    }

    /**
     * Check promise status
     */
    async checkPromise(sessionId, promiseId) {
        const headers = { ...this._getHeaders(), ...this._getStorageHeaders() };
        const res = await fetch(`/api/a2a/sessions/${encodeURIComponent(sessionId)}/promise/${encodeURIComponent(promiseId)}`, {
            method: 'GET',
            headers
        });
        if (!res.ok) return null;
        return res.json();
    }

    /**
     * Get session history from step
     */
    async getHistory(sessionId, fromStep = 1) {
        const headers = { ...this._getHeaders(), ...this._getStorageHeaders() };
        const res = await fetch(`/api/a2a/sessions/${encodeURIComponent(sessionId)}/history/${fromStep}`, { headers });
        if (!res.ok) return [];
        const raw = await res.json();
        return raw?.history || [];
    }

    /**
     * Get latest step data
     */
    async getLatestStep(sessionId) {
        const headers = { ...this._getHeaders(), ...this._getStorageHeaders() };
        const res = await fetch(`/api/a2a/sessions/${encodeURIComponent(sessionId)}/latest`, { headers });
        if (!res.ok) return null;
        return res.json();
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
