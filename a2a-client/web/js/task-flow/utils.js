/**
 * TaskFlow Utils Module
 * Утилиты для работы с TaskFlow
 */

(function (global) {
    'use strict';

    /**
     * Получить ID проекта
     */
    function getProjectId() {
        const sel = document.getElementById('projectSelect');
        if (sel?.value) return sel.value;
        const proj = window.appState?.get?.('project');
        if (proj?.id) return proj.id;
        const pm = window.ProjectManager;
        if (pm?.getLastSelectedProjectId) return pm.getLastSelectedProjectId() || null;
        return null;
    }

    /**
     * Resolve the SessionStore for a given session (falls back to active session or global store)
     * @param {string|null} sessionId
     * @returns {Object|null}
     */
    function resolveStore(sessionId = null) {
        const registry = global.WindowRegistry;
        const resolvedSessionId = sessionId
            || global.SessionManager?.getActiveSessionId?.()
            || null;
        if (resolvedSessionId && registry?.getSessionStore) {
            const windowStore = registry.getSessionStore(resolvedSessionId);
            if (windowStore) {
                return windowStore;
            }
        }
        return global.SessionStore;
    }

    /**
     * Escape HTML special characters
     * @param {string} s - строка для экранирования
     * @returns {string} экранированная строка
     */
    function escapeHtml(s) {
        const el = document.createElement('div');
        el.textContent = s;
        return el.innerHTML;
    }

    // Export
    global.TaskFlowUtils = {
        getProjectId,
        resolveStore,
        escapeHtml
    };
    global.getProjectId = getProjectId;
    global.resolveStore = resolveStore;
    global.escapeHtml = escapeHtml;

})(typeof window !== 'undefined' ? window : global);
