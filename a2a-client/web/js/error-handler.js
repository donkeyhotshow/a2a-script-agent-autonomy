/**
 * Error Handler UI Module
 * Centralized error handling and display for the web interface.
 * API errors are routed via fetch wrapper below and handleApiError(); user messages
 * Session panel: lastError via store.setError (status banner, not SYSTEM chat). Global: addNotification.
 * 
 * @see docs/new-request-flow/PROTOCOLS/states/error.md - Состояние ошибки
 */

(function (global) {
    'use strict';

    if (!global.ErrorHandler) Object.assign(global, { ErrorHandler: {} });
    const EH = global.ErrorHandler;

    Object.assign(EH, {
        errors: [],
        maxErrors: 50,
        
        config: {
            showDismissButton: true,
            autoHideDelay: 8000,
            showStackTrace: false,
            showDetailsButton: true,
            logToConsole: true,
            retryDelay: 2000,
            maxRetries: 3,
            retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMIT', 'LLM_ERROR'],
            nonRetryableErrors: ['VALIDATION_ERROR', 'FILE_NOT_FOUND', 'PERMISSION_DENIED', 'EXECUTION_ERROR', 'INTERNAL_ERROR']
        },
        
        _listeners: new Map(),
        _sessionErrorSink: null,

        init(options = {}) {
            Object.assign(this.config, options);
            if (typeof options.sessionErrorSink === 'function') {
                this._sessionErrorSink = options.sessionErrorSink;
            }
            console.log('[ErrorHandler] Initialized');
            return this;
        },

        setSessionErrorSink(sink) {
            this._sessionErrorSink = typeof sink === 'function' ? sink : null;
            return this;
        },

        handle(error, context) {
            const normalizedError = this._normalizeError ? this._normalizeError(error) : error;
            const resolvedContext = context ?? normalizedError.context;
            if (!resolvedContext) {
                console.warn('[ErrorHandler] Error context missing for', normalizedError);
            }

            normalizedError.context = resolvedContext;
            normalizedError.timestamp = new Date().toISOString();
            
            if (this._isRetryable) {
                normalizedError.retryable = this._isRetryable(normalizedError);
            }
            
            this.errors.unshift(normalizedError);
            if (this.errors.length > this.maxErrors) {
                this.errors.pop();
            }

            if (this.config.logToConsole) {
                console.error('[ErrorHandler]', normalizedError);
            }

            this.emit('error', normalizedError);
            
            if (this.displayError) {
                this.displayError(normalizedError);
            }

            return normalizedError;
        },

        handleApiError(response, context) {
            const url = context?.url || '';
            const isStorage404 = url.includes('/api/storage/') && response?.status === 404;
            if (isStorage404) {
                console.log('[ErrorHandler] Ignoring expected storage 404 in handleApiError:', url);
                return null;
            }

            const userMessage = this._formatApiMessage ? this._formatApiMessage(response) : 'API request failed';
            const code = response?.data?.error?.code
                || response?.error?.code
                || response?.code
                || 'API_ERROR';

            if (!context) {
                console.warn('[ErrorHandler] handleApiError called without context metadata');
            }
            
            const normalized = this.handle(new Error(userMessage || 'API request failed'), {
                ...(context ?? {}),
                code,
                status: response?.status,
                response
            });

            if (this._pushSessionMessage) {
                this._pushSessionMessage(userMessage || 'API request failed', {
                    code,
                    status: response?.status,
                    context: normalized.context
                });
            }

            return normalized;
        },

        handleNetworkError(error, context) {
            if (!context) {
                console.warn('[ErrorHandler] handleNetworkError called without context metadata');
            }
            const normalized = this.handle(error, {
                ...(context ?? {}),
                type: 'network',
                code: 'NETWORK_ERROR'
            });
            if (this._pushSessionMessage) {
                this._pushSessionMessage(error?.message || 'Network error', {
                    code: 'NETWORK_ERROR',
                    status: context?.status,
                    type: 'network'
                });
            }
            return normalized;
        },

        handleValidationError(errors, context) {
            if (!context) {
                console.warn('[ErrorHandler] handleValidationError called without context metadata');
            }
            const message = Array.isArray(errors) 
                ? errors.map(e => e.message || e).join(', ')
                : 'Validation failed';
            
            return this.handle(new Error(message), {
                ...(context ?? {}),
                type: 'validation',
                code: 'VALIDATION_ERROR',
                validationErrors: errors
            });
        },

        on(event, callback) {
            if (!this._listeners.has(event)) {
                this._listeners.set(event, new Set());
            }
            this._listeners.get(event).add(callback);
            return () => this.off(event, callback);
        },

        off(event, callback) {
            this._listeners.get(event)?.delete(callback);
        },

        emit(event, data) {
            this._listeners.get(event)?.forEach(cb => {
                try { cb(data); } catch (e) { console.error('[ErrorHandler] Event error:', e); }
            });
        },

        clearErrors() {
            if (this.cancelAllRetries) this.cancelAllRetries();
            
            this.errors = [];
            const container = document.getElementById('errorNotifications');
            if (container) {
                container.innerHTML = '';
            }
            this.emit('cleared');
        },

        getErrorsByCode(code) {
            return this.errors.filter(e => e.code === code);
        },

        getRecentErrors(count = 10) {
            return this.errors.slice(0, count);
        }
    });

    // Build request context (url, method, payload) for error details
    function getRequestContext(input, options) {
        const url = typeof input === 'string' ? input : (input?.url || String(input));
        const method = (options?.method || input?.method || 'GET').toUpperCase();
        let payload = options?.body !== undefined ? options.body : input?.body;
        if (payload != null && typeof payload !== 'string') {
            try {
                payload = typeof payload === 'object' && (payload instanceof FormData || payload instanceof URLSearchParams)
                    ? payload.toString()
                    : JSON.stringify(payload);
            } catch (err) {
                console.error('[ErrorHandler] Request payload JSON.stringify failed:', err);
                payload = String(payload);
            }
        }
        return { url, method, payload: payload != null ? String(payload) : undefined };
    }

    // Auto-integrate with fetch
    if (typeof window !== 'undefined') {
        const originalFetch = window.fetch;
        window.fetch = async function(...args) {
            const input = args[0];
            const options = args.length > 1 ? args[1] : undefined;
            const reqCtx = getRequestContext(input, options);
            const shouldHandleErrors = options?.silent !== true && options?.handleErrors !== false;

            try {
                const response = await originalFetch.apply(this, args);

                if (shouldHandleErrors && !response.ok) {
                    const responseClone = response.clone();
                    const errText = await responseClone.text();
                    let data = {};
                    try {
                        data = errText ? JSON.parse(errText) : {};
                    } catch (parseErr) {
                        console.error('[ErrorHandler] Error response body is not JSON:', parseErr);
                        if (errText) data = { _nonJsonBody: errText.slice(0, 2000) };
                    }
                    EH.handleApiError(
                        {
                            status: response.status,
                            data
                        },
                        { ...reqCtx }
                    );
                }

                return response;
            } catch (error) {
                if (shouldHandleErrors) {
                    EH.handleNetworkError(error, { ...reqCtx });
                }
                throw error;
            }
        };
    }

})(typeof window !== 'undefined' ? window : globalThis);
