/**
 * TaskFlow Utils Module
 * Утилиты для работы с TaskFlow
 */

(function (global) {
    'use strict';

     /**
      * Получить ID проекта (делегирует html-utils getProjectIdSync)
      */
     function getProjectId() {
         return global.getProjectIdSync?.() ?? null;
     }

    /**
     * Resolve the SessionStore for a given session (falls back to active session or global store)
     * @param {string|null} sessionId
     * @returns {Object|null}
     */
    function resolveStore(sessionId = null) {
        const registry = global.WindowRegistry;
        const resolvedSessionId = sessionId ?? global.SessionManager?.getActiveSessionId?.() ?? null;

        if (resolvedSessionId) {
            if (!registry || typeof registry.getSessionStore !== 'function') {
                throw new Error('[TaskFlow] WindowRegistry unavailable while resolving session store for ' + resolvedSessionId);
            }
            const windowStore = registry.getSessionStore(resolvedSessionId);
            if (!windowStore) {
                throw new Error('[TaskFlow] SessionStore instance not found for session ' + resolvedSessionId);
            }
            return windowStore;
        }

        if (!global.SessionStore) {
            throw new Error('[TaskFlow] Global SessionStore is not initialized');
        }

        return global.SessionStore;
    }

    // Export
    global.TaskFlowUtils = {
        getProjectId,
        resolveStore
    };
    global.getProjectId = getProjectId;
    global.resolveStore = resolveStore;

})(typeof window !== 'undefined' ? window : global);
