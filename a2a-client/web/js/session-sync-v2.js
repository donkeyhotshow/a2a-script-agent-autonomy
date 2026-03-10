/**
 * SessionSync v2 - Direct SSE-to-Store bridge
 * Replaces: session-sync.js (which bridged to SessionViewModel)
 * Flow: SSE → SessionStore → UI subscriptions
 */

(function (global) {
    'use strict';

    const store = global.SessionStore;
    if (!store) {
        console.error('[SessionSync v2] SessionStore not found');
        return;
    }

    const logError = (event, err) => {
        console.error(`[SessionSync v2] Failed to handle ${event}:`, err);
    };

    function register(transport, event, handler) {
        transport.on(event, (data) => {
            try {
                handler(data);
            } catch (err) {
                logError(event, err);
            }
        });
    }

    function attachToTransport(transport) {
        if (!transport || typeof transport.on !== 'function') return false;

        register(transport, 'message', data => {
            const content = data?.message ?? data?.content ?? data;
            const role = data?.role || data?.direction || 'assistant';
            if (content) store.pushMessage(content, role);
        });

        register(transport, 'task_response', data => {
            store.applyServerResponse({
                context: data?.context,
                execute: data?.execute,
                messages: data?.messages
            });
        });

        register(transport, 'session_update', data => {
            store.applyServerResponse({
                context: data?.context,
                execute: data?.execute
            });
        });

        register(transport, 'progress', data => {
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

        register(transport, 'status', data => {
            if (data?.status) store.setStatus(data.status);
            store.applyServerResponse({
                context: data?.context,
                execute: data?.execute
            });
        });

        register(transport, 'complete', data => {
            store.setStatus('completed');
            store.applyServerResponse({
                context: data?.context,
                execute: data?.execute,
                finalResult: data?.finalResult || data?.result
            });
            if (data?.finalResult) store._emit('completed', data.finalResult);
            if (data?.result?.message) store.pushMessage(data.result.message, 'assistant');
        });

        register(transport, 'finalResult', data => {
            if (data?.finalResult) {
                store.applyServerResponse({
                    context: data?.context,
                    execute: { finalResult: data.finalResult }
                });
                store.setStatus('completed');
                store._emit('completed', data.finalResult);
            }
        });

        register(transport, 'error', data => {
            const error = data?.error || data?.message || 'Server error';
            const isConnectionError = data?.message?.includes('transports failed') ||
                                    data?.message?.includes('connection') ||
                                    !store.sessionId;
            if (isConnectionError) {
                store._state.status = 'disconnected';
                store._emit('status', 'disconnected');
                store._emit('connectionError', error);
            } else {
                store.setError(error);
            }
        });

        register(transport, 'action_proposal', data => {
            if (data?.execute) store.setExecute(data.execute);
        });

        register(transport, 'action_executing', data => {
            if (data?.execute) store.setExecute(data.execute);
            if (data?.step) {
                const exec = store.getExecution() || {};
                store.setContext({
                    ...store.context,
                    execution: { ...exec, step: data.step, action: data.action }
                });
            }
        });

        register(transport, 'node_added', data => {
            if (data?.context || data?.session) {
                store.applyServerResponse({ context: data.context || data.session });
            }
        });

        register(transport, 'node_updated', data => {
            if (data?.context || data?.session) {
                store.applyServerResponse({ context: data.context || data.session });
            }
        });

        register(transport, 'edge_added', data => {
            if (data?.context || data?.session) {
                store.applyServerResponse({ context: data.context || data.session });
            }
        });

        return true;
    }

    let tryInitAttempts = 0;
    const TRY_INIT_MAX = 100; // ~5s at 50ms
    let attachedToApiIntegration = false;

    function tryInit() {
        const sse = global.SSEClient;
        const apiIntegration = global.apiIntegration;
        if (!attachedToApiIntegration && apiIntegration && typeof apiIntegration.on === 'function') {
            attachToTransport(apiIntegration);
            attachedToApiIntegration = true;
            console.log('[SessionSync v2] Initialized (APIIntegration)');
        }
        if (sse && typeof sse.on === 'function') {
            attachToTransport(sse);
            console.log('[SessionSync v2] Initialized (SSEClient)');
            return;
        }
        const tm = global.TransportManager;
        if (tm && typeof tm.on === 'function') {
            attachToTransport(tm);
            console.log('[SessionSync v2] Initialized (TransportManager)');
            return;
        }
        tryInitAttempts++;
        if (tryInitAttempts < TRY_INIT_MAX) setTimeout(tryInit, 50);
    }

    store.on('resultReady', (result) => {
        const sessionId = store.sessionId;
        if (!sessionId || !result) return;
    });

    global.SessionSyncV2 = {
        isActive: () => !!(global.SSEClient && global.SessionStore) || !!(global.TransportManager && global.SessionStore),
        applyFromSSE: (data) => store.applyServerResponse(data)
    };

    tryInit();

})(typeof window !== 'undefined' ? window : globalThis);
