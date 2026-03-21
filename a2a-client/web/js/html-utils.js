/**
 * Shared HTML escaping + session inline loader DOM (single implementation).
 */
(function (global) {
    'use strict';

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
})(typeof window !== 'undefined' ? window : globalThis);
