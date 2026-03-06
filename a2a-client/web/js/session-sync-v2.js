/**
 * SessionSync v2 - Direct SSE-to-Store bridge
 * Replaces: session-sync.js (which bridged to SessionViewModel)
 * Flow: SSE → SessionStore → UI subscriptions
 */

(function (global) {
    'use strict';

    const store = global.SessionStore;
    const sse = global.SSEClient;

    if (!store) {
        console.error('[SessionSync v2] SessionStore not found');
        return;
    }

    if (!sse || typeof sse.on !== 'function') {
        console.warn('[SessionSync v2] SSEClient not available');
        return;
    }

    const logError = (event, err) => {
        console.error(`[SessionSync v2] Failed to handle ${event}:`, err);
    };

    function register(event, handler) {
        sse.on(event, (data) => {
            try {
                handler(data);
            } catch (err) {
                logError(event, err);
            }
        });
    }

    // === SSE Event Handlers ===

    register('message', data => {
        const content = data?.message ?? data?.content ?? data;
        const role = data?.role || data?.direction || 'assistant';
        if (content) store.pushMessage(content, role);
    });

    register('task_response', data => {
        store.applyServerResponse({
            context: data?.context,
            execute: data?.execute,
            messages: data?.messages
        });
    });

    register('session_update', data => {
        store.applyServerResponse({
            context: data?.context,
            execute: data?.execute
        });
    });

    register('progress', data => {
        const progress = typeof data?.progress === 'number'
            ? data.progress
            : (typeof data?.percentage === 'number' ? data.percentage : null);

        if (progress != null) {
            const exec = store.getExecution() || {};
            store.setContext({
                ...store.context,
                execution: { ...exec, progress }
            });
        }
    });

    register('status', data => {
        if (data?.status) store.setStatus(data.status);
        store.applyServerResponse({
            context: data?.context,
            execute: data?.execute
        });
    });

    register('complete', data => {
        store.setStatus('completed');
        store.applyServerResponse({
            context: data?.context,
            execute: data?.execute,
            finalResult: data?.finalResult || data?.result
        });
        if (data?.finalResult) {
            store._emit('completed', data.finalResult);
        }
        if (data?.result?.message) {
            store.pushMessage(data.result.message, 'assistant');
        }
    });

    // Handle finalResult from server (task completion with summary)
    register('finalResult', data => {
        if (data?.finalResult) {
            store.applyServerResponse({
                context: data?.context,
                execute: { finalResult: data.finalResult }
            });
            store.setStatus('completed');
            store._emit('completed', data.finalResult);
        }
    });

    register('error', data => {
        const error = data?.error || data?.message || 'Server error';
        store.setError(error);
    });

    register('action_proposal', data => {
        if (data?.execute) store.setExecute(data.execute);
    });

    register('action_executing', data => {
        if (data?.execute) store.setExecute(data.execute);
        if (data?.step) {
            const exec = store.getExecution() || {};
            store.setContext({
                ...store.context,
                execution: { ...exec, step: data.step, action: data.action }
            });
        }
    });

    // Legacy event compatibility
    register('node_added', data => {
        if (data?.context || data?.session) {
            store.applyServerResponse({ context: data.context || data.session });
        }
    });

    register('node_updated', data => {
        if (data?.context || data?.session) {
            store.applyServerResponse({ context: data.context || data.session });
        }
    });

    register('edge_added', data => {
        if (data?.context || data?.session) {
            store.applyServerResponse({ context: data.context || data.session });
        }
    });

    // === Store-to-SSE bridge for results ===

    store.on('resultReady', (result) => {
        const sessionId = store.sessionId;
        if (!sessionId || !result) return;

        // If using SSE for bidirectional, could emit here
        // Currently HTTP POST via SessionManager
    });

    // Export minimal API
    global.SessionSyncV2 = {
        isActive: () => !!(global.SSEClient && global.SessionStore),
        applyFromSSE: (data) => store.applyServerResponse(data)
    };

    console.log('[SessionSync v2] Initialized');

})(typeof window !== 'undefined' ? window : globalThis);
