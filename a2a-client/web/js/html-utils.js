/**
 * Shared HTML escaping, session/taskbar helpers, execute.form detection.
 */
(function (global) {
    'use strict';

    /**
     * True when execute asks for user input (choices/input), excluding wait-only steps.
     */
    function executeHasActionableForm(ex) {
        if (!ex || !ex.form || ex.wait) return false;
        var f = ex.form;
        if (f.choices && f.choices.length > 0) return true;
        if (f.textarea && typeof f.textarea === 'object' && f.textarea.name) return true;
        if (f.input == null) return false;
        if (Array.isArray(f.input)) return f.input.length > 0;
        return true;
    }

    /**
     * @param {string} sessionId
     * @returns {HTMLElement}
     */
    function escapeHtml(s) {
        if (s == null) return '';
        const el = document.createElement('div');
        el.textContent = typeof s === 'string' ? s : String(s);
        return el.innerHTML;
    }

    function escapeHtmlAttr(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;');
    }

    /**
     * Normalize value from getStoredClientApiUrl (string or mistaken object); strip trailing slash.
     * @returns {string} empty if unusable
     */
    function normalizeStoredClientApiUrl(raw) {
        if (raw == null) return '';
        var v = raw;
        if (typeof v === 'object') {
            v = v.url || v.apiBase || (typeof v.toString === 'function' ? v.toString() : '') || '';
        }
        var s = String(v).trim();
        if (!s || s === '[object Object]') return '';
        return s.replace(/\/?$/, '');
    }

    /** @param {object} [state] SessionStore.getState() */
    function readStoreExecute(state) {
        if (!state) return undefined;
        return state.execute ?? state._state?.execute;
    }

    /** @param {object} [state] SessionStore.getState() */
    function readStoreContext(state) {
        if (!state) return {};
        return state.context ?? state._state?.context ?? {};
    }

    /** @param {object} [state] SessionStore.getState() */
    function readStorePromisePending(state) {
        if (!state) return false;
        return !!(state.promisePending ?? state.core?.promise?.isPending ?? state.promise?.isPending);
    }

    /**
     * Single place for task-flow panel: history vs execute vs waiting (floating windows, etc.).
     * @param {object} [state] SessionStore.getState()
     */
    function getTaskFlowPanelViewState(state) {
        const execute = readStoreExecute(state);
        const context = readStoreContext(state);
        const promisePending = readStorePromisePending(state);
        const hasActionableForm = executeHasActionableForm(execute);
        const inputBlocked =
            typeof state?.isInputBlocked === 'function'
                ? state.isInputBlocked()
                : !!state?.isInputBlocked;
        const isWaiting = !!promisePending || inputBlocked;
        return { execute, context, promisePending, hasActionableForm, inputBlocked, isWaiting };
    }

    /** Client API session payloads may use `id` or `sessionId`. */
    function resolveSessionIdFromPayload(obj) {
        if (obj == null || typeof obj !== 'object') return null;
        var id = obj.id != null ? obj.id : obj.sessionId;
        if (id == null || id === '') return null;
        return String(id);
    }

    /**
     * Project id from #projectSelect, else ProjectManager last selected (sync; for TaskFlow).
     */
    function getProjectIdSync() {
        var sel = document.getElementById('projectSelect');
        if (sel && sel.value) return sel.value;
        var pm = global.ProjectManager;
        if (pm && typeof pm.getLastSelectedProjectId === 'function') {
            return pm.getLastSelectedProjectId() || null;
        }
        return null;
    }

    /** Taskbar session strip: SessionManager ref or first `.taskbar-content`. */
    function resolveTaskbarContentEl() {
        return global.SessionManager?.getTaskbarContentEl?.() || document.querySelector('.taskbar-content');
    }

    global.escapeHtml = escapeHtml;
    global.escapeHtmlAttr = escapeHtmlAttr;
    global.executeHasActionableForm = executeHasActionableForm;
    global.normalizeStoredClientApiUrl = normalizeStoredClientApiUrl;
    global.readStoreExecute = readStoreExecute;
    global.readStoreContext = readStoreContext;
    global.readStorePromisePending = readStorePromisePending;
    global.getTaskFlowPanelViewState = getTaskFlowPanelViewState;
    global.resolveSessionIdFromPayload = resolveSessionIdFromPayload;
    global.getProjectIdSync = getProjectIdSync;
    global.resolveTaskbarContentEl = resolveTaskbarContentEl;
})(typeof window !== 'undefined' ? window : globalThis);
