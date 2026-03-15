/**
 * ActionHandler - Submits user input (message, choice) to Client API
 * POST /api/sessions/:sessionId/next with result
 * Updates SessionStore with response (execute, context, promiseId)
 * 
 * Step Flow:
 * 1. Submit result → save client-result.json → create next step
 * 2. Server sends request to A2A Server
 * 3. If async (promiseId) → poll for status
 * 4. If sync → return execute to client
 */
(function (global) {
    'use strict';

    // Polling interval for promise checking (5 seconds as per spec)
    const PROMISE_POLL_INTERVAL = 5000;
    let promisePollTimer = null;

    function resolveStore(sessionId = null) {
        const registry = global.WindowRegistry;
        const resolvedSessionId = sessionId || global.SessionManager?.getActiveSessionId?.() || null;
        if (resolvedSessionId && registry?.getSessionStore) {
            const windowStore = registry.getSessionStore(resolvedSessionId);
            if (windowStore) {
                return windowStore;
            }
        }
        return global.SessionStore;
    }

    function getApiBase(store) {
        const api = global.apiIntegration;
        // Check storage mode first - if using Vite (storage mode), use default
        const storageMode = store?.getStorageMode?.() || 'storage';
        if (storageMode === 'storage') {
            // Use relative path for dev/prod compatibility - Vite proxies /api/*
            return window.location.origin + '/api/a2a';
        }
        // For client-api mode, require explicit apiBase
        if (!api?.apiBase) return null;
        return String(api.apiBase).replace(/\/?$/, '');
    }

    /**
     * Submit result to session - triggers step processing
     * Saves client-result.json and creates next step via API
     */
    async function submit(sessionId, result) {
        const store = resolveStore(sessionId);
        const base = getApiBase(store);
        if (!base) {
            throw new Error('ActionHandler: API base not configured. Set Client API URL in Settings.');
        }
        // Use storage mode with default fallback (same as getApiBase)
        const storageMode = store?.getStorageMode?.() || 'storage';
        const isStorageMode = storageMode === 'storage';
        // For Vite (storage mode), base already includes /api/a2a
        // For client-api, need to add /api
        const apiPath = isStorageMode ? '' : '/api';
        const url = `${base}${apiPath}/sessions/${encodeURIComponent(sessionId)}/next`;
        const headers = { 'Content-Type': 'application/json' };
        if (global.apiIntegration?.token) {
            headers['Authorization'] = `Bearer ${global.apiIntegration.token}`;
        }
        
        const res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({ result })
        });
        
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(data?.error?.message || `Request failed: ${res.status}`);
        }
        
        if (store && data) {
            // First set promise pending to block input
            if (data.promiseId) {
                store.setPromisePending?.(true);
                startPromisePolling(sessionId, data.promiseId);
                // Force UI refresh to show waiting state BEFORE setting execute
                if (global.WindowManager?.refreshAll) {
                    global.WindowManager.refreshAll();
                }
            }
            // Then update execute/context (may trigger another refresh)
            if (data.execute) store.setExecute?.(data.execute);
            const ctx = data.context ?? data.session?.context;
            if (ctx) store.setContext?.(ctx);
            const sess = data.session;
            if (sess) store.setSession?.(sess.id ?? sess.sessionId, sess.projectId);
        }
        
        return data;
    }

    /**
     * Check promise status - polls A2A Server for async result
     */
    async function checkPromise(sessionId, promiseId) {
        const store = resolveStore(sessionId);
        const base = getApiBase(store);
        if (!base) return null;
        
        // Use storage mode with default fallback
        const storageMode = store?.getStorageMode?.() || 'storage';
        const isStorageMode = storageMode === 'storage';
        const apiPath = isStorageMode ? '' : '/api';
        const url = `${base}${apiPath}/sessions/${encodeURIComponent(sessionId)}/promise/${encodeURIComponent(promiseId)}`;
        
        try {
            const res = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            console.error('[ActionHandler] Promise check failed:', e.message);
            return null;
        }
    }

    /**
     * Start polling for promise resolution
     */
    function startPromisePolling(sessionId, promiseId) {
        // Clear any existing timer
        if (promisePollTimer) {
            clearInterval(promisePollTimer);
            promisePollTimer = null;
        }
        
        const store = resolveStore(sessionId);
        
        promisePollTimer = setInterval(async () => {
            const status = await checkPromise(sessionId, promiseId);
            
            if (!status) {
                // Network error - continue polling
                return;
            }
            
            if (status.completed || status.status === 'completed' || status.status === 'done') {
                // Promise resolved - clear timer and update session
                if (promisePollTimer) {
                    clearInterval(promisePollTimer);
                    promisePollTimer = null;
                }
                
                if (store) {
                    const exec = status.execute ?? status.result?.execute;
                    if (exec) store.setExecute?.(exec);
                }
                
                // Emit event for UI to handle
                global.apiIntegration?.emit?.('promiseResolved', {
                    sessionId,
                    promiseId,
                    result: status.result,
                    execute: status.execute ?? status.result?.execute
                });
            }
            
            if (status.status === 'failed' || status.status === 'error') {
                // Promise failed - clear timer
                if (promisePollTimer) {
                    clearInterval(promisePollTimer);
                    promisePollTimer = null;
                }
                
                if (store) {
                    store.setPromisePending?.(false);
                }
                
                global.apiIntegration?.emit?.('promiseError', {
                    sessionId,
                    promiseId,
                    error: status.error || 'Promise failed'
                });
            }
        }, PROMISE_POLL_INTERVAL);
    }

    /**
     * Stop polling for promises
     */
    function stopPromisePolling() {
        if (promisePollTimer) {
            clearInterval(promisePollTimer);
            promisePollTimer = null;
        }
    }

    async function sendMessage(sessionId, message) {
        const messageText =
            typeof message === 'string'
                ? message
                : (message?.content ?? String(message ?? ''));
        return submit(sessionId, { message: messageText });
    }

    async function sendChoice(sessionId, choiceId) {
        return submit(sessionId, { choice: choiceId });
    }

    const ActionHandler = { 
        submit, 
        sendMessage, 
        sendChoice,
        checkPromise,
        startPromisePolling,
        stopPromisePolling
    };

    if (typeof window !== 'undefined') {
        window.ActionHandler = ActionHandler;
    }
    global.ActionHandler = ActionHandler;

})(typeof window !== 'undefined' ? window : globalThis);
