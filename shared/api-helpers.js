const normalizeApiBase = (raw) => {
    const value = String(raw ?? '').trim();
    if (!value) {
        return '/api';
    }
    if (value.startsWith('/')) {
        const path = value.replace(/\/?$/, '');
        if (!path) {
            return '/api';
        }
        return path;
    }
    try {
        const url = new URL(value);
        const normalizedPath = url.pathname.replace(/\/$/, '');
        url.pathname = normalizedPath || '/api';
        return url.toString().replace(/\/$/, '');
    } catch (err) {
        const fallback = value.replace(/\/?$/, '');
        return fallback || '/api';
    }
};

const buildClientA2aUrl = (apiBase, resourcePath = '') => {
    const path = String(resourcePath || '').replace(/^\//, '');
    if (!apiBase) {
        return `/api/a2a/${path}`;
    }
    const base = apiBase.replace(/\/?$/, '');
    return `${base}/a2a/${path}`;
};

const buildFetchHeaders = ({ token, storageMode } = {}) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    if (storageMode) {
        headers['X-Storage-Mode'] = storageMode;
    }
    return headers;
};

const normalizeSessionResponse = (raw) => {
    if (!raw || typeof raw !== 'object') {
        return null;
    }
    let data = raw;
    if (raw.success === true) {
        data = raw.data ?? raw.session;
    }
    if (!data || typeof data !== 'object') {
        return null;
    }
    const sessionId = data.id || data.sessionId;
    if (!sessionId) {
        return null;
    }
    const messages = data.messages ?? data.context?.messages ?? [];
    const execute = data.execute ?? data.context?.execute ?? data.currentExecute ?? null;
    const context = data.context ?? {};
    return {
        id: sessionId,
        sessionId,
        projectId: data.projectId,
        title: data.title,
        status: data.status,
        asyncPending: data.asyncPending ?? data.pending,
        messages,
        execute,
        context
    };
};

const normalizeSessionsList = (raw, filterProjectId = null) => {
    let list = Array.isArray(raw) ? raw : (raw?.sessions ?? raw?.data);
    if (!Array.isArray(list)) {
        return [];
    }
    if (filterProjectId) {
        list = list.filter((s) => s.projectId === filterProjectId || s.projectId === undefined);
    }
    return list;
};

const DEFAULT_POLL_INTERVAL = 1000;
/** Wall-clock cap for polling loops (async/session). **Not** used for `promiseId` → GET …/result — those wait until terminal with no deadline. */
const DEFAULT_POLL_TIMEOUT = Number.POSITIVE_INFINITY;

const isRetryAfterInFuture = (retryAfter) => {
    if (retryAfter == null || retryAfter === '') return false;
    const t = Date.parse(String(retryAfter));
    return Number.isFinite(t) && t > Date.now();
};

const isPromiseResolved = (result) => {
    if (!result) return false;
    const status = typeof result.status === 'string' ? result.status.toLowerCase() : null;
    if (status) {
        if (['completed', 'done', 'idle'].includes(status)) return true;
        if (['failed', 'error'].includes(status)) return false;
    }
    if (result.completed || result.execute) {
        return true;
    }
    return false;
};

const isPromiseFailed = (result) => {
    if (!result) return false;
    if (result.asyncPending === true) return false;
    const status = typeof result.status === 'string' ? result.status.toLowerCase() : null;
    if (status) {
        if (status === 'failed' || status === 'error') {
            if (isRetryAfterInFuture(result.retryAfter)) return false;
            return true;
        }
    }
    return false;
};

const shared = {
    normalizeApiBase,
    buildClientA2aUrl,
    buildFetchHeaders,
    normalizeSessionResponse,
    normalizeSessionsList,
    DEFAULT_POLL_INTERVAL,
    DEFAULT_POLL_TIMEOUT,
    isPromiseResolved,
    isPromiseFailed
};

if (typeof window !== 'undefined') {
    window.__A2AApiHelpers = shared;
}

export {
    normalizeApiBase,
    buildClientA2aUrl,
    buildFetchHeaders,
    normalizeSessionResponse,
    normalizeSessionsList,
    DEFAULT_POLL_INTERVAL,
    DEFAULT_POLL_TIMEOUT,
    isPromiseResolved,
    isPromiseFailed
};
