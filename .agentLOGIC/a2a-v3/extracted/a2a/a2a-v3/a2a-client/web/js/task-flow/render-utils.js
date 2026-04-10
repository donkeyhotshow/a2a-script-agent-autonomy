/**
 * TaskFlow Render Utilities
 * Common helpers for render modules
 */

(function (global) {
    'use strict';

    if (!global.TaskFlowRender) global.TaskFlowRender = {};
    const TFR = global.TaskFlowRender;

    const escapeHtml = global.escapeHtml || function(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };

    function formatLastError(err) {
        if (err == null) return '';
        if (typeof err === 'string') return err;
        return err.message != null ? String(err.message) : String(err);
    }

    function renderDialogErrorBanner(lastError) {
        const text = formatLastError(lastError);
        if (!text) return '';
        return `<div class="task-flow-dialog-error" role="status">${escapeHtml(text)}</div>`;
    }

    function buildRenderErrorHtml(message) {
        return `<div class="task-flow-history-error">${escapeHtml(message)}</div>`;
    }

    function handleRenderError(action, message, details) {
        const errMsg = `[TaskFlowRender] ${message}`;
        console.error(errMsg, details);
        const err = new Error(errMsg);
        global.ErrorHandler?.handle?.(err, { action, ...details });
        return buildRenderErrorHtml(errMsg);
    }

    function requireRenderStore(action, storeCandidate, context = {}) {
        const resolved = storeCandidate ?? context.store ?? global.SessionStore;
        if (resolved) {
            return { store: resolved };
        }
        return { error: handleRenderError(action, 'Session store is required', context) };
    }

    function messageBodyText(message) {
        if (message == null) return '';
        if (typeof message === 'string') return message;
        return message.content || message.text || '';
    }

    // Attach to TFR object
    TFR.escapeHtml = escapeHtml;
    TFR.formatLastError = formatLastError;
    TFR.renderDialogErrorBanner = renderDialogErrorBanner;
    TFR.buildRenderErrorHtml = buildRenderErrorHtml;
    TFR.handleRenderError = handleRenderError;
    TFR.requireRenderStore = requireRenderStore;
    TFR.messageBodyText = messageBodyText;

})(typeof window !== 'undefined' ? window : global);
