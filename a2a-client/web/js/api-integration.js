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

function getApiHelpers() {
    const H = globalScope.__A2AApiHelpers;
    if (
        !H ||
        typeof H.normalizeApiBase !== 'function' ||
        typeof H.buildClientA2aUrl !== 'function' ||
        typeof H.buildFetchHeaders !== 'function' ||
        typeof H.normalizeSessionResponse !== 'function' ||
        typeof H.normalizeSessionsList !== 'function'
    ) {
        throw new Error(
            '[api-integration] Load a2a-client/shared/api-helpers.js before api-integration.js (see web/index.html)'
        );
    }
    return H;
}

class APIIntegration {
    constructor() {
        this.token = null;
        /** @type {string|null} Client API prefix (e.g. /api or http://host:3001/api); null = same-origin /api/a2a/... */
        this.apiBase = null;
        this.storageModeProvider = null;
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
            this.apiBase = s ? getApiHelpers().normalizeApiBase(s) : null;
        }
        if ('storageModeProvider' in options) {
            this.storageModeProvider = typeof options.storageModeProvider === 'function'
                ? options.storageModeProvider
                : null;
        }
        console.log('[API] Configured token:', !!this.token, 'apiBase:', this.apiBase || '(default /api/a2a)');
        return this;
    }

    _clientA2aUrl(resourcePath) {
        return getApiHelpers().buildClientA2aUrl(this.apiBase, resourcePath);
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
        const storageMode = this.storageModeProvider ? this.storageModeProvider() : undefined;
        return getApiHelpers().buildFetchHeaders({ token: this.token, storageMode });
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
        const normalized = getApiHelpers().normalizeSessionsList(raw, projectId);
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

    /**
     * Create session and return raw envelope response.
     * Use this when callers need serverResponse/async metadata.
     */
    async createSessionEnvelope(params = {}) {
        return this._fetch('sessions', {
            method: 'POST',
            body: JSON.stringify(params)
        });
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
        
        const normalized = getApiHelpers().normalizeSessionResponse(raw);
        if (!normalized) {
            throw new Error('getSession: unexpected response shape');
        }
        return normalized;
    }

    /**
     * True if GET sessions/:id succeeds (session present on Client API).
     * Used to drop stale UI active-session when folders/API no longer have the session.
     */
    async sessionExistsOnServer(sessionId) {
        if (!sessionId) return false;
        try {
            const url = this._clientA2aUrl(`sessions/${encodeURIComponent(sessionId)}`);
            const res = await fetch(url, { headers: this._headers() });
            if (res.status === 404) return false;
            if (!res.ok) return true;
            return true;
        } catch {
            return true;
        }
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

    /**
     * Submit next step result for a session.
     */
    async submitSessionResult(sessionId, result) {
        if (!sessionId) {
            throw new Error('submitSessionResult: sessionId is required');
        }
        return this._fetch(`sessions/${encodeURIComponent(sessionId)}/next`, {
            method: 'POST',
            body: JSON.stringify({ result })
        });
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
