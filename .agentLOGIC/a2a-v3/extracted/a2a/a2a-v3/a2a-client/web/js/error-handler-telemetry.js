/**
 * Error Handler Telemetry Module
 * Handles normalization, analytics matching, session message injection, and categorization.
 */

(function (global) {
    'use strict';

    if (!global.ErrorHandler) global.ErrorHandler = {};
    const EH = global.ErrorHandler;

    EH._normalizeError = function(error) {
        if (error == null) {
            return {
                message: 'Unknown error',
                name: 'Error',
                code: 'UNKNOWN',
                stack: undefined,
                original: error
            };
        }

        if (typeof error === 'string') {
            return {
                message: error,
                name: 'Error',
                code: 'STRING_ERROR',
                stack: undefined,
                original: error
            };
        }

        const message = error?.message ?? error?.error?.message ?? error?.msg ?? 'Unknown error';
        const name = error?.name ?? 'Error';
        const code = error?.code ?? error?.error?.code ?? 'UNKNOWN';

        return {
            message: String(message),
            name: String(name),
            code: String(code),
            stack: error?.stack,
            original: error
        };
    };

    EH._formatApiMessage = function(response) {
        if (!response) return '';
        const segments = [];
        const apiError = response?.data?.error || response?.error;
        if (apiError?.message) segments.push(apiError.message);
        if (apiError?.details) {
            const details = typeof apiError.details === 'string'
                ? apiError.details
                : JSON.stringify(apiError.details);
            segments.push(details);
        }
        if (response?.data?.message && !segments.includes(response.data.message)) {
            segments.push(response.data.message);
        }
        if (response?.message && !segments.includes(response.message)) {
            segments.push(response.message);
        }
        if (response?.status) {
            segments.push(`status ${response.status}`);
        }
        return segments.filter(Boolean).join(' · ');
    };

    EH._pushSessionMessage = function(message, meta = {}) {
        if (!message) return;

        const err = new Error(message);
        if (meta && typeof meta === 'object') {
            Object.assign(err, meta);
        }

        const sink = this._sessionErrorSink || global.sessionErrorSink;
        if (typeof sink === 'function') {
            try {
                sink(err, meta);
                return;
            } catch (sinkErr) {
                console.warn('[ErrorHandler] sessionErrorSink failed:', sinkErr);
            }
        }

        const store = global.SessionStore;
        if (store?.setError) {
            store.setError(err);
            return;
        }

        const vm = global.SessionViewModel;
        if (vm?.setError) vm.setError(err);
    };

})(typeof window !== 'undefined' ? window : globalThis);
