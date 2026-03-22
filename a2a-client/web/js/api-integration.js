/**
 * API Integration Module
 * Connects UI components with Client API (single apiBase, e.g. localhost:3001).
 * Uses HTTP; async work via GET .../sessions/:id/async (no transport id in UI). SSE/WebSocket removed.
 * 
 * Step Files Structure (storage mode):
 * storage/sessions/{SESSION_ID}/{STEP}/
 *   - server-response.json - ответ от A2A сервера
 *   - server-promise.json - данные о промисе (если есть)
 *   - client-result.json - результат от клиента (web/авто)
 *   - request-to-server.json - запрос к серверу
 *   - messages.json - история сообщений
 */

class APIIntegration {
    constructor() {
        this.token = null;
        /** @type {string|null} Client API prefix (e.g. /api or http://host:3001/api); null = same-origin /api/a2a/... */
        this.apiBase = null;
    }

    /**
     * Absolute Client API roots often omit /api (e.g. http://localhost:3001). Normalize to .../api.
     */
    _normalizeApiBase(raw) {
        const s = String(raw).trim();
        if (!s) return null;
        if (s.startsWith('/')) {
            const t = s.replace(/\/?$/, '');
            if (!t) {
                throw new Error('[API] _normalizeApiBase: relative apiBase cannot be empty');
            }
            return t;
        }
        try {
            const u = new URL(s);
            let p = u.pathname.replace(/\/$/, '');
            if (!p || p === '/') {
                u.pathname = '/api';
            }
            const out = u.toString().replace(/\/$/, '');
            return out || `${u.origin}/api`;
        } catch (err) {
            console.error('[API] _normalizeApiBase URL parse failed:', err, raw);
            const t = s.replace(/\/?$/, '');
            if (!t) {
                throw new Error('[API] _normalizeApiBase: invalid apiBase after parse failure');
            }
            return t;
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
     * Get projects list (uses Vite plugin at /api/a2a/projects)
     */
    async getProjects() {
        const res = await fetch(this._clientA2aUrl('projects'));
        if (!res.ok) throw new Error(`getProjects failed: ${res.status}`);
        const raw = await res.json();
        if (Array.isArray(raw)) return raw;
        const list = raw?.projects ?? raw?.data;
        if (!Array.isArray(list)) {
            throw new Error('getProjects: response must be an array or contain projects/data array');
        }
        return list;
    }

    /**
     * Create/update projects (POST /api/a2a/projects)
     */
    async createProject(params) {
        let body;
        if (typeof params === 'string') {
            if (!String(params).trim()) {
                throw new Error('createProject: non-empty name string required');
            }
            body = { name: params };
        } else {
            if (!params || typeof params !== 'object') {
                throw new Error('createProject: params object or name string required');
            }
            body = params;
        }
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
     * Get headers for API requests (combined: base + storage mode)
     */
    _headers() {
        const headers = { 'Content-Type': 'application/json' };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        // Add storage mode if available
        const win = typeof window !== 'undefined' ? window : globalThis;
        const store = win.SessionStore;
        if (store && typeof store.getStorageMode === 'function') {
            headers['X-Storage-Mode'] = store.getStorageMode();
        }
        return headers;
    }

    /**
     * Private fetch method that handles common fetch + headers + error handling pattern
     * @param {string} path - Resource path relative to API base
     * @param {Object} opts - Fetch options (method, body, etc.) - headers will be merged with _headers()
     * @returns {Promise<Object>} Parsed JSON response
     */
    async _fetch(path, opts = {}) {
        const url = this._clientA2aUrl(path);
        const headers = { ...this._headers(), ...opts.headers };
        const res = await fetch(url, { ...opts, headers });
        if (!res.ok) {
            throw new Error(`API request failed: ${res.status} ${res.statusText}`);
        }
        return res.json();
    }

    /**
     * Get sessions (uses Vite plugin)
     */
    async getSessions(projectId = null) {
        const raw = await this._fetch('sessions');
        let sessions = Array.isArray(raw) ? raw : (raw?.sessions ?? raw?.data);
        if (!Array.isArray(sessions)) {
            throw new Error('getSessions: response must be an array or contain sessions/data array');
        }
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
        const raw = await this._fetch('sessions', {
            method: 'POST',
            body: JSON.stringify(params)
        });
        return raw?.session ?? raw?.data ?? raw;
    }

    /**
     * Normalize session response to consistent format
     * Eliminates need for fallback chains in consumers
     */
    _normalizeSessionResponse(raw) {
        if (!raw || typeof raw !== 'object') return null;

        // Handle success envelope
        let data = raw;
        if (raw.success === true) {
            data = raw.data ?? raw.session;
        }
        if (!data || typeof data !== 'object') return null;

        // Ensure consistent structure
        const sessionId = data.id || data.sessionId;
        if (!sessionId) return null;

        // Normalize messages (support multiple sources)
        const messages = data.messages ?? data.context?.messages ?? [];

        // Normalize execute (support multiple sources)
        const execute = data.execute ?? data.context?.execute ?? data.currentExecute ?? null;

        // Normalize context
        const context = data.context ?? {};

        return {
            id: sessionId,
            sessionId,
            projectId: data.projectId,
            title: data.title,
            status: data.status,
            asyncPending: data.asyncPending,
            messages,
            execute,
            context
        };
    }

    /**
     * Get session by ID (uses Vite plugin)
     */
    async getSession(sessionId, optionsOrLegacyProjectId = {}) {
        const options =
            optionsOrLegacyProjectId && typeof optionsOrLegacyProjectId === 'object' && !Array.isArray(optionsOrLegacyProjectId)
                ? optionsOrLegacyProjectId
                : {};
        const q = options.includeContext ? '?includeContext=1' : '';
        const raw = await this._fetch(`sessions/${encodeURIComponent(sessionId)}${q}`);
        console.log('[API] getSession response:', sessionId, 'asyncPending:', raw?.asyncPending, 'status:', raw?.status);
        
        const normalized = this._normalizeSessionResponse(raw);
        if (!normalized) {
            throw new Error('getSession: unexpected response shape');
        }
        return normalized;
    }

    /**
     * Highest step summary (promiseId / promiseStatus). Same route as storage “latest”.
     */
    async getSessionLatest(sessionId, options = {}) {
        const q = options.includeContext ? '?includeContext=1' : '';
        return this._fetch(`sessions/${encodeURIComponent(sessionId)}/latest${q}`);
    }

    /**
     * Delta messages by monotonic seq (reduces full GET frequency). Optional execute via withExecute=1.
     */
    async getSessionMessages(sessionId, afterSeq = 0, limit = 50, withExecute = false) {
        const params = new URLSearchParams({
            afterSeq: String(afterSeq),
            limit: String(limit),
        });
        if (withExecute) params.set('withExecute', '1');
        return this._fetch(`sessions/${encodeURIComponent(sessionId)}/messages?${params}`);
    }

    /**
     * Delete session (uses Vite plugin)
     */
    async deleteSession(sessionId) {
        const res = await this._fetch(`sessions/${encodeURIComponent(sessionId)}`, {
            method: 'DELETE'
        });
        return { success: res != null };
    }



    // === Step Files API ===
    
    /**
     * Check promise status
     */
    async checkPromise(sessionId, promiseId) {
        return this._fetch(`sessions/${encodeURIComponent(sessionId)}/promise/${encodeURIComponent(promiseId)}`);
    }

    /** Session-scoped async status (Vite Client API). */
    async checkSessionAsync(sessionId) {
        return this._fetch(`sessions/${encodeURIComponent(sessionId)}/async`);
    }






}

const apiIntegration = new APIIntegration();

// Global request wrapper (used by task-flow/init.js)
async function request(method, path, options = {}) {
    const url = path.startsWith('/') ? path.slice(1) : path;
    return apiIntegration._fetch(url, { method, ...options });
}

if (typeof window !== 'undefined') {
    window.APIIntegration = APIIntegration;
    window.request = request;
    window.apiIntegration = apiIntegration;
}
