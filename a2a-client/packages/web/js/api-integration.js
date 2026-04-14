/**
 * Web API integration for storage-mode Client API (same-origin /api/a2a/* on Vite).
 *
 * Contract: a2a-client/docs/WEB_UI_PROTOCOL.md
 * - POST /api/a2a/sessions -> session DTO (unwrap or envelope varies by deployment mode)
 * - POST /api/a2a/sessions/:id/next -> { success, accepted, step, asyncPending }
 * - GET  /api/a2a/sessions/:id/async -> { asyncPending, status, execute?, result?, completed?, error? }
 * - GET  /api/a2a/sessions/:id -> session snapshot DTO (unwrap or envelope varies by deployment mode)
 */
(function (global) {
    'use strict';

    const DEFAULT_BASE = '/api/a2a';

    function sleep(ms) {
        return new Promise((r) => setTimeout(r, ms));
    }

    async function parseJson(res) {
        const text = await res.text();
        if (!text) return null;
        try {
            return JSON.parse(text);
        } catch (e) {
            const err = new Error('invalid_json');
            err.cause = e;
            err.responseText = text;
            throw err;
        }
    }

    function unwrapSessionPayload(payload) {
        if (!payload || typeof payload !== 'object') return payload;
        // Vite routes often return the session DTO as the body, SDK may return { success, session }.
        if (payload.session && typeof payload.session === 'object') return payload.session;
        return payload;
    }

    function resolveBaseUrl() {
        // Optional override stored by other shells; keep same-origin default for stability.
        const raw = global.getStoredClientApiUrl?.();
        const norm = global.normalizeStoredClientApiUrl?.(raw);
        if (norm) return norm.replace(/\/api\/a2a$/, '') + '/api/a2a';
        return DEFAULT_BASE;
    }

    async function httpJson(method, url, body) {
        const init = {
            method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (body !== undefined) init.body = JSON.stringify(body);
        const res = await fetch(url, init);
        const data = await parseJson(res);
        if (!res.ok) {
            const err = new Error(data?.error || data?.message || `http_${res.status}`);
            err.status = res.status;
            err.payload = data;
            throw err;
        }
        return data;
    }

    async function createSession({ title } = {}) {
        const base = resolveBaseUrl();
        const payload = await httpJson('POST', `${base}/sessions`, title ? { title } : {});
        return unwrapSessionPayload(payload);
    }

    async function getSession(sessionId) {
        const base = resolveBaseUrl();
        const payload = await httpJson('GET', `${base}/sessions/${encodeURIComponent(sessionId)}`);
        return unwrapSessionPayload(payload);
    }

    async function postNext(sessionId, submitResult) {
        const base = resolveBaseUrl();
        return await httpJson(
            'POST',
            `${base}/sessions/${encodeURIComponent(sessionId)}/next`,
            submitResult
        );
    }

    async function pollAsync(sessionId) {
        const base = resolveBaseUrl();
        return await httpJson('GET', `${base}/sessions/${encodeURIComponent(sessionId)}/async`);
    }

    /**
     * Poll until completed or error. Session-scoped: does NOT require promiseId.
     */
    async function pollUntilDone(sessionId, opts = {}) {
        const intervalMs = typeof opts.intervalMs === 'number' ? opts.intervalMs : 800;
        const maxAttempts = typeof opts.maxAttempts === 'number' ? opts.maxAttempts : 120;
        let last = null;
        for (let i = 0; i < maxAttempts; i++) {
            last = await pollAsync(sessionId);
            opts.onTick?.(last);
            if (!last) {
                await sleep(intervalMs);
                continue;
            }
            if (typeof opts.shouldStop === 'function') {
                try {
                    if (opts.shouldStop(last) === true) return last;
                } catch (e) {
                    // Never crash polling due to a UI callback; treat as non-stopping.
                    console.error('[apiIntegration] shouldStop callback failed', e);
                }
            }
            if (last.asyncPending === false || last.completed === true || last.status === 'idle') {
                return last;
            }
            if (last.status === 'failed' || last.status === 'error') {
                const err = new Error(last.error || 'async_failed');
                err.payload = last;
                throw err;
            }
            await sleep(intervalMs);
        }
        const err = new Error('polling_timeout');
        err.payload = last;
        throw err;
    }

    global.apiIntegration = {
        createSession,
        getSession,
        postNext,
        pollAsync,
        pollUntilDone,
        _resolveBaseUrl: resolveBaseUrl,
    };
})(typeof window !== 'undefined' ? window : globalThis);

