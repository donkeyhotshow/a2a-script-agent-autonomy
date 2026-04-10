/**
 * Session Store Resolver - shared store lookup layer.
 * Keeps service/task-flow modules independent from window internals.
 */
(function (global) {
    'use strict';

    const providers = [];

    /**
     * Register a store provider used by `resolve()`.
     * Providers are checked in registration order and receive `sessionId`.
     *
     * @param {string} name provider id used for diagnostics
     * @param {(sessionId: string) => any} resolverFn returns a store instance or null/undefined
     * @returns {void}
     */
    function registerProvider(name, resolverFn) {
        if (!name || typeof resolverFn !== 'function') return;
        providers.push({ name: String(name), resolve: resolverFn });
    }

    /**
     * Resolve a session store for the given session id.
     * Resolution order:
     * 1) explicit `sessionId` argument
     * 2) `SessionManager.getActiveSessionId()`
     * 3) fallback to global `SessionStore`
     *
     * @param {string|null} [sessionId=null] optional target session id
     * @returns {any} resolved store instance
     * @throws {Error} when no provider resolves and global SessionStore is missing
     */
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
