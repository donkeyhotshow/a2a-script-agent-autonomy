/**
 * Shared HTML escaping, session inline loader DOM, execute.form detection.
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
        if (f.input == null) return false;
        if (Array.isArray(f.input)) return f.input.length > 0;
        return true;
    }

    var SESSION_INLINE_LOADER_INNER = '<div class="task-flow-spinner"></div><p>Processing...</p>';

    /**
     * @param {string} sessionId
     * @returns {HTMLElement}
     */
    function ensureSessionInlineLoader(sessionId) {
        var id = 'session-loader-' + sessionId;
        var el = document.getElementById(id);
        if (el) return el;
        el = document.createElement('div');
        el.id = id;
        el.className = 'task-flow-inline-loader';
        el.innerHTML = SESSION_INLINE_LOADER_INNER;
        var panel = document.getElementById('session-' + sessionId);
        (panel || document.body).appendChild(el);
        return el;
    }

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

    global.escapeHtml = escapeHtml;
    global.escapeHtmlAttr = escapeHtmlAttr;
    global.ensureSessionInlineLoader = ensureSessionInlineLoader;
    global.executeHasActionableForm = executeHasActionableForm;
})(typeof window !== 'undefined' ? window : globalThis);
