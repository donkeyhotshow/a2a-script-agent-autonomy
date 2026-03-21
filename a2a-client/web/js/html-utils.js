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

    global.escapeHtml = escapeHtml;
    global.escapeHtmlAttr = escapeHtmlAttr;
    global.executeHasActionableForm = executeHasActionableForm;
    global.normalizeStoredClientApiUrl = normalizeStoredClientApiUrl;
})(typeof window !== 'undefined' ? window : globalThis);
