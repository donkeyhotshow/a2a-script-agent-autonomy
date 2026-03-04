(function (global) {
    'use strict';

    const vm = global.SessionViewModel;
    const sse = global.SSEClient;
    if (!vm || !sse || typeof sse.on !== 'function') return;

    const logError = (event, err) => {
        console.error(`[SessionSync] Failed to handle ${event}:`, err);
    };

    function pushMessage(payload, role = 'assistant') {
        if (!payload) return;
        const message = typeof payload === 'string' ? payload : (payload.content || payload.message || payload.text || '');
        if (!message) return;
        vm.pushMessage({ content: message, metadata: payload.metadata || {} }, role);
    }

    function applyExecute(execute) {
        if (!execute) return;
        vm.setExecute(execute);
        if (execute.message) {
            pushMessage(execute.message, 'assistant');
        }
    }

    function applyContext(context) {
        if (!context) return;
        if (Array.isArray(context.messages) && context.messages.length) {
            vm.setMessages(context.messages);
        }
        if (context.execute) {
            applyExecute(context.execute);
        }
        if (context.execution) {
            const merged = {...vm.execute, ...context.execution};
            vm.setExecute(merged);
        }
    }

    function updateProgress(progressData) {
        if (!progressData) return;
        const progress = typeof progressData.progress === 'number'
            ? progressData.progress
            : (typeof progressData.percentage === 'number' ? progressData.percentage : null);
        if (progress == null) return;
        const current = vm.execute || {};
        vm.setExecute({...current, progress});
    }

    function register(event, handler) {
        sse.on(event, (data) => {
            try {
                handler(data);
            } catch (err) {
                logError(event, err);
            }
        });
    }

    register('message', data => {
        pushMessage(data?.message ?? data?.content ?? data, data?.role || data?.direction || 'assistant');
    });

    register('task_response', data => {
        applyContext(data?.context);
        applyExecute(data?.execute);
        if (Array.isArray(data?.messages)) {
            vm.setMessages(data.messages);
        }
    });

    register('session_update', data => {
        applyContext(data?.context);
        if (data?.execute) applyExecute(data.execute);
    });

    register('progress', data => {
        updateProgress(data);
    });

    register('status', data => {
        applyContext(data?.context);
        if (data?.execute) applyExecute(data.execute);
    });

    register('complete', data => {
        applyContext(data?.context);
        applyExecute(data?.execute);
        if (data?.result?.message) {
            pushMessage(data.result.message, 'assistant');
        }
    });

    register('error', data => {
        pushMessage(data?.message || data?.error || 'Error received', 'system');
    });

    register('action_proposal', data => {
        if (data?.execute) applyExecute(data.execute);
    });

    register('action_executing', data => {
        if (data?.execute) applyExecute(data.execute);
    });

    register('node_added', data => applyContext(data?.context || data?.session));
    register('node_updated', data => applyContext(data?.context || data?.session));
    register('edge_added', data => applyContext(data?.context || data?.session));

    global.SessionSync = {
        applyContext,
        applyExecute,
        updateProgress
    };
})(typeof window !== 'undefined' ? window : globalThis);
