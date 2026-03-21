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
        
        // Retry on server errors (5xx) and certain client errors (429 rate limit)
        const shouldRetry = !response.ok && 
            (response.status >= 500 || response.status === 429) && 
            retryCount < MAX_RETRIES;
        
        if (shouldRetry) {
            const delay = BASE_DELAY * Math.pow(2, retryCount);
            console.warn(`[API] Retry ${retryCount + 1}/${MAX_RETRIES} after ${delay}ms (HTTP ${response.status}): ${url}`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetry(url, options, retryCount + 1);
        }
        
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
        this.token = null;
        /** @type {string|null} Client API prefix (e.g. /api or http://host:3001/api); null = same-origin /api/a2a/... */
        this.apiBase = null;
        this._listeners = new Map();
    }

    /**
     * Absolute Client API roots often omit /api (e.g. http://localhost:3001). Normalize to .../api.
     */
    _normalizeApiBase(raw) {
        const s = String(raw).trim();
        if (!s) return null;
        if (s.startsWith('/')) {
            return s.replace(/\/?$/, '') || '/api';
        }
        try {
            const u = new URL(s);
            let p = u.pathname.replace(/\/$/, '');
            if (!p || p === '/') {
                u.pathname = '/api';
            }
            const out = u.toString().replace(/\/$/, '');
            return out || `${u.origin}/api`;
        } catch {
            return s.replace(/\/?$/, '');
        }
    }

    /**
     * Build URL for Client API routes mounted under .../api/a2a/ (same as Vite plugin).
     * @param {string} resourcePath - e.g. "projects", "sessions", "sessions/id/messages?x=1"
     */
    _clientA2aUrl(resourcePath) {
        const path = String(resourcePath || '').replace(/^\//, '');
        if (!this.apiBase) {
            return `/api/a2a/${path}`;
        }
        const base = String(this.apiBase).replace(/\/?$/, '');
        return `${base}/a2a/${path}`;
    }

    /**
     * Configure API client
     */
    configure(options = {}) {
        if (options.token) {
            this.token = options.token;
        }
        if ('apiBase' in options) {
            const s = options.apiBase == null ? '' : String(options.apiBase).trim();
            this.apiBase = s ? this._normalizeApiBase(s) : null;
        }
        console.log('[API] Configured token:', !!this.token, 'apiBase:', this.apiBase || '(default /api/a2a)');
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
     * Get projects list (uses Vite plugin at /api/a2a/projects)
     */
    async getProjects() {
        const res = await fetch(this._clientA2aUrl('projects'));
        if (!res.ok) throw new Error(`getProjects failed: ${res.status}`);
        const raw = await res.json();
        return Array.isArray(raw) ? raw : (raw?.projects || raw?.data || []);
    }

    /**
     * Create/update projects (POST /api/a2a/projects)
     */
    async createProject(params) {
        const body = typeof params === 'string' ? { name: params } : (params || {});
        const res = await fetch(this._clientA2aUrl('projects'), {
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
        const res = await fetch(this._clientA2aUrl('sessions'), { headers });
        if (!res.ok) {
            console.warn('[API] getSessions failed:', res.status, res.statusText);
            return [];
        }
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
        const res = await fetch(this._clientA2aUrl('sessions'), {
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
    async getSession(sessionId, optionsOrLegacyProjectId = {}) {
        const options =
            optionsOrLegacyProjectId && typeof optionsOrLegacyProjectId === 'object' && !Array.isArray(optionsOrLegacyProjectId)
                ? optionsOrLegacyProjectId
                : {};
        const headers = { ...this._getHeaders(), ...this._getStorageHeaders() };
        const q = options.includeContext ? '?includeContext=1' : '';
        const res = await fetch(this._clientA2aUrl(`sessions/${encodeURIComponent(sessionId)}${q}`), { headers });
        if (!res.ok) {
            console.warn('[API] getSession failed:', res.status, res.statusText);
            return null;
        }
        const raw = await res.json();
        console.log('[API] getSession response:', sessionId, 'promiseId:', raw?.data?.promiseId, 'status:', raw?.data?.status);
        if (raw && typeof raw === 'object' && raw.success === true) {
            const d = raw.data ?? raw.session;
            if (d && typeof d === 'object' && (d.id || d.sessionId)) return d;
        }
        return raw;
    }

    /**
     * Highest step summary (promiseId / promiseStatus). Same route as storage “latest”.
     */
    async getSessionLatest(sessionId) {
        const headers = { ...this._getHeaders(), ...this._getStorageHeaders() };
        const res = await fetch(this._clientA2aUrl(`sessions/${encodeURIComponent(sessionId)}/latest`), { headers });
        if (!res.ok) return null;
        return res.json();
    }

    /**
     * Delta messages by monotonic seq (reduces full GET frequency). Optional execute via withExecute=1.
     */
    async getSessionMessages(sessionId, afterSeq = 0, limit = 50, withExecute = false) {
        const headers = { ...this._getHeaders(), ...this._getStorageHeaders() };
        const params = new URLSearchParams({
            afterSeq: String(afterSeq),
            limit: String(limit),
        });
        if (withExecute) params.set('withExecute', '1');
        const res = await fetch(
            this._clientA2aUrl(`sessions/${encodeURIComponent(sessionId)}/messages?${params}`),
            { headers }
        );
        if (!res.ok) {
            console.warn('[API] getSessionMessages failed:', res.status, res.statusText);
            return null;
        }
        return res.json();
    }

    /**
     * Delete session (uses Vite plugin)
     */
    async deleteSession(sessionId) {
        const headers = { ...this._getStorageHeaders() };
        const res = await fetch(this._clientA2aUrl(`sessions/${encodeURIComponent(sessionId)}`), {
            method: 'DELETE',
            headers
        });
        return { success: res.ok };
    }



    // === Step Files API ===
    
    /**
     * Check promise status
     */
    async checkPromise(sessionId, promiseId) {
        const headers = { ...this._getHeaders(), ...this._getStorageHeaders() };
        const res = await fetch(this._clientA2aUrl(`sessions/${encodeURIComponent(sessionId)}/promise/${encodeURIComponent(promiseId)}`), {
            method: 'GET',
            headers
        });
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
