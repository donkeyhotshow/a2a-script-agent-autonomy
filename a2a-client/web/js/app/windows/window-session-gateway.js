/**
 * Window Session Gateway - session/API adapter for window subsystem.
 * Keeps transport/store hydration logic outside WindowState UI mechanics.
 */
(function (global) {
    'use strict';

    const WindowSessionGateway = {
        /**
         * Load session data from Client API.
         */
        async loadSessionData(sessionId, options = {}) {
            const projectId =
                options.projectId != null
                    ? options.projectId
                    : await global.getCurrentProjectId?.() || null;
            const api = global.apiIntegration;

            if (!api?.getSession) {
                throw new Error('[WindowSessionGateway] apiIntegration.getSession is required');
            }

            try {
                return await api.getSession(sessionId, {
                    projectId: projectId || undefined,
                    includeContext: true
                });
            } catch (err) {
                const loadErr = new Error('[WindowSessionGateway] Failed to load session data');
                loadErr.cause = err;
                throw loadErr;
            }
        },

        /**
         * Create SessionStore instance for window panel.
         */
        createSessionStore(sessionId) {
            const factory = global.SessionStoreFactory;
            if (!factory || typeof factory.create !== 'function') {
                throw new Error('[WindowSessionGateway] SessionStoreFactory.create is required (load session-store.js)');
            }

            const store = factory.create();

            if (!store) {
                throw new Error('[WindowSessionGateway] Failed to create SessionStore instance');
            }

            store.reset(sessionId);
            return store;
        },

        /**
         * Hydrate store with normalized session payload.
         */
        hydrateStore(store, sessionData, sessionId) {
            if (!store || !sessionData) return;

            store.setAwaitingSessionVerify(true);
            if (typeof store.startLoader === 'function') {
                store.startLoader(sessionId);
            }

            const dataSid = global.resolveSessionIdFromPayload?.(sessionData);
            if (dataSid) {
                store.setSession(dataSid, sessionData.projectId);
            }

            store.initMessages(Array.isArray(sessionData.messages) ? sessionData.messages : []);
            if (sessionData.context != null) {
                store.setContext(sessionData.context);
            }
            store.setExecute(sessionData.execute);
            if (sessionData.status !== undefined) {
                store.setStatus(sessionData.status);
            }

            const executor = global.ActionExecutor;
            if (executor && typeof executor.bootstrapSessionUi === 'function') {
                void executor.bootstrapSessionUi(sessionId, store);
            } else {
                store.setAwaitingSessionVerify(false);
                if (typeof store.stopLoader === 'function') {
                    store.stopLoader(sessionId);
                }
            }
        },

        /**
         * Check if session exists via Client API.
         */
        async checkSessionExists(sessionId) {
            if (!sessionId) {
                throw new Error('[WindowSessionGateway] sessionId is required for checkSessionExists');
            }
            if (!global.apiIntegration) {
                throw new Error('[WindowSessionGateway] apiIntegration is required for checkSessionExists');
            }

            const projectId = await global.getCurrentProjectId?.();
            const session = await global.apiIntegration.getSession(
                sessionId,
                projectId ? { projectId } : {}
            );
            return !!global.resolveSessionIdFromPayload?.(session);
        }
    };

    global.WindowSessionGateway = WindowSessionGateway;
})(typeof window !== 'undefined' ? window : globalThis);
