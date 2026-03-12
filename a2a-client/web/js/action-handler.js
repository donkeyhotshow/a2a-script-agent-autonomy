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
        if (!api?.apiBase) return null;
        // If storage mode is 'storage', use Vite dev server (port 5173) with /api/a2a prefix
        // Otherwise use client-api (port 3001)
        const storageMode = store?.getStorageMode?.();
        if (storageMode === 'storage') {
            return 'http://localhost:5173/api/a2a';
        }
        
        return String(api.apiBase).replace(/\/?$/, '');
    }

    /**
     * Submit result to session - triggers step processing
     * Saves client-result.json and creates next step via API
     */
    async function submit(sessionId, projectId, result, context = {}) {
        const store = resolveStore(sessionId);
        const base = getApiBase(store);
        if (!base) {
            throw new Error('ActionHandler: API base not configured. Set Client API URL in Settings.');
        }
        const storageMode = store?.getStorageMode?.();
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
            body: JSON.stringify({ result, context })
        });
        
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(data?.error?.message || `Request failed: ${res.status}`);
        }
        
        if (store && data) {
            if (data.execute) store.setExecute?.(data.execute);
            if (data.context) store.setContext?.(data.context);
            if (data.promiseId) {
                store.setPromiseId?.(data.promiseId);
                // Start polling for async responses
                startPromisePolling(sessionId, data.promiseId);
            }
            if (data.session) {
                store.setSession?.(data.session);
            }
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
        
        // For Vite (storage mode), base already includes /api/a2a
        // For client-api, need to add /api
        const storageMode = store?.getStorageMode?.();
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
                    if (status.execute) store.setExecute?.(status.execute);
                    if (status.result) store.setLastResult?.(status.result);
                    store.setPromiseId?.(null);
                }
                
                // Emit event for UI to handle
                global.apiIntegration?.emit?.('promiseResolved', {
                    sessionId,
                    promiseId,
                    result: status.result,
                    execute: status.execute
                });
            }
            
            if (status.status === 'failed' || status.status === 'error') {
                // Promise failed - clear timer
                if (promisePollTimer) {
                    clearInterval(promisePollTimer);
                    promisePollTimer = null;
                }
                
                if (store) {
                    store.setPromiseId?.(null);
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

    async function sendMessage(sessionId, projectId, message) {
        const store = resolveStore(sessionId);
        const ctx = store?.context || {};
        return submit(sessionId, projectId, { message: typeof message === 'string' ? message : { content: message } }, ctx);
    }

    async function sendChoice(sessionId, projectId, choiceId) {
        const store = resolveStore(sessionId);
        const ctx = store?.context || {};
        return submit(sessionId, projectId, { choice: choiceId }, ctx);
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
