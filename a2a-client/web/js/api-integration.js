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

const globalScope = typeof window !== 'undefined' ? window : globalThis;
const sharedApiHelpers = globalScope.__A2AApiHelpers || {};
const {
    normalizeApiBase: helperNormalizeApiBase,
    buildClientA2aUrl: helperBuildClientA2aUrl,
    buildFetchHeaders: helperBuildFetchHeaders,
    normalizeSessionResponse: helperNormalizeSessionResponse,
    normalizeSessionsList: helperNormalizeSessionsList
} = sharedApiHelpers;

const normalizeApiBaseHelper = helperNormalizeApiBase || function (raw) {
    const str = String(raw || '').trim();
    if (!str) return '/api';
    return str.replace(/\/$/, '');
};

const buildA2aUrlHelper = function (apiBase, resourcePath) {
    if (typeof helperBuildClientA2aUrl === 'function') {
        return helperBuildClientA2aUrl(apiBase, resourcePath);
    }
    const path = String(resourcePath || '').replace(/^\//, '');
    if (!apiBase) {
        return `/api/a2a/${path}`;
    }
    const base = String(apiBase).replace(/\/?$/, '');
    return `${base}/a2a/${path}`;
};

const buildFetchHeadersHelper = function (token, storageMode) {
    if (typeof helperBuildFetchHeaders === 'function') {
        return helperBuildFetchHeaders({ token, storageMode });
    }
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (storageMode) headers['X-Storage-Mode'] = storageMode;
    return headers;
};

const _normalizeSessionResponse = helperNormalizeSessionResponse;
const _normalizeSessionsList = helperNormalizeSessionsList;

class APIIntegration {
    constructor() {
        this.token = null;
        /** @type {string|null} Client API prefix (e.g. /api or http://host:3001/api); null = same-origin /api/a2a/... */
        this.apiBase = null;
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
            this.apiBase = s ? normalizeApiBaseHelper(s) : null;
        }
        console.log('[API] Configured token:', !!this.token, 'apiBase:', this.apiBase || '(default /api/a2a)');
        return this;
    }

    _clientA2aUrl(resourcePath) {
        return buildA2aUrlHelper(this.apiBase, resourcePath);
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
        const store = globalScope.SessionStore;
        const storageMode = store && typeof store.getStorageMode === 'function' ? store.getStorageMode() : undefined;
        return buildFetchHeadersHelper(this.token, storageMode);
    }

    /**
     * Private fetch method that handles common fetch + headers + error handling pattern
     * @param {string} path - Resource path relative to API base
     * @param {Object} opts - Fetch options (method, body, etc.) - headers will be merged with _headers()
     * @returns {Promise<Object>} Parsed JSON response
     */
    async _fetch(path, opts = {}) {
        const url = buildA2aUrlHelper(this.apiBase, path);
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
        const normalized = typeof _normalizeSessionsList === 'function' ? _normalizeSessionsList(raw, projectId) : [];
        if (!Array.isArray(normalized)) {
            throw new Error('getSessions: response must be an array or contain sessions/data array');
        }
        return normalized;
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

    // Normalization delegated to shared helper (_normalizeSessionResponse)

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
        
        const normalized =
            typeof _normalizeSessionResponse === 'function' ? _normalizeSessionResponse(raw) : null;
        if (!normalized) {
            throw new Error('getSession: unexpected response shape');
        }
        return normalized;
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

if (typeof window !== 'undefined') {
    window.APIIntegration = APIIntegration;
    window.apiIntegration = apiIntegration;
}
if (typeof global !== 'undefined') {
    global.APIIntegration = APIIntegration;
    global.apiIntegration = apiIntegration;
}
