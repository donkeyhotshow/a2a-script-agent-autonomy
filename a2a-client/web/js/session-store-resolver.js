/**
 * Session Store Resolver - shared store lookup layer.
 * Keeps service/task-flow modules independent from window internals.
 */
(function (global) {
    'use strict';

    const providers = [];

    function registerProvider(name, resolverFn) {
        if (!name || typeof resolverFn !== 'function') return;
        providers.push({ name: String(name), resolve: resolverFn });
    }

    function resolve(sessionId = null) {
        const resolvedSessionId =
            sessionId ??
            global.SessionManager?.getActiveSessionId?.() ??
            null;

        if (resolvedSessionId) {
            for (const provider of providers) {
                try {
                    const store = provider.resolve(resolvedSessionId);
                    if (store) return store;
                } catch (err) {
                    console.warn('[SessionStoreResolver] Provider failed:', provider.name, err);
                }
            }
        }

        if (!global.SessionStore) {
            throw new Error('[SessionStoreResolver] Global SessionStore is not initialized');
        }
        return global.SessionStore;
    }

    global.SessionStoreResolver = {
        registerProvider,
        resolve,
    };
    global.resolveSessionStore = resolve;
})(typeof window !== 'undefined' ? window : globalThis);
