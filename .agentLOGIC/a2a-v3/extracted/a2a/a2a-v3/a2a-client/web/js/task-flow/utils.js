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
     * Resolve SessionStore via shared resolver.
     * @param {string|null} sessionId
     * @returns {Object|null}
     */
    function resolveStore(sessionId = null) {
        const resolver = global.SessionStoreResolver;
        if (!resolver || typeof resolver.resolve !== 'function') {
            throw new Error('[TaskFlow] SessionStoreResolver is unavailable');
        }
        return resolver.resolve(sessionId);
    }

    // Export
    global.TaskFlowUtils = {
        getProjectId,
        resolveStore
    };
    global.getProjectId = getProjectId;
    global.resolveStore = resolveStore;

})(typeof window !== 'undefined' ? window : global);
