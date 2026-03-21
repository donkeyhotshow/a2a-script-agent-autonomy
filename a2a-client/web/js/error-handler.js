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

    const ErrorHandler = {
        // Error storage
        errors: [],
        maxErrors: 50,
        
        // Configuration
        config: {
            showDismissButton: true,
            autoHideDelay: 8000,
            showStackTrace: false,
            showDetailsButton: true,
            logToConsole: true,
            // Retry configuration
            retryDelay: 2000, // 2 seconds
            maxRetries: 3,
            // Retryable error codes (can be retried)
            retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMIT', 'LLM_ERROR'],
            // Non-retryable error codes (should not be retried)
            nonRetryableErrors: ['VALIDATION_ERROR', 'FILE_NOT_FOUND', 'PERMISSION_DENIED', 'EXECUTION_ERROR', 'INTERNAL_ERROR']
        },
        
        // Active retry timers (for cleanup)
        _retryTimers: new Map(),
        
        // Event listeners
        _listeners: new Map(),

        /**
         * Initialize error handler
         */
        init(options = {}) {
            Object.assign(this.config, options);
            console.log('[ErrorHandler] Initialized');
            return this;
        },

        /**
         * Handle error from any source
         */
        handle(error, context = {}) {
            // Normalize error object
            const normalizedError = this._normalizeError(error);
            
            // Add context
            normalizedError.context = context;
            normalizedError.timestamp = new Date().toISOString();
            
            // Determine if retryable
            normalizedError.retryable = this._isRetryable(normalizedError);
            
            // Store error
            this.errors.unshift(normalizedError);
            if (this.errors.length > this.maxErrors) {
                this.errors.pop();
            }

            // Log to console
            if (this.config.logToConsole) {
                console.error('[ErrorHandler]', normalizedError);
            }

            // Emit event
            this.emit('error', normalizedError);

            // Display error UI
            this.displayError(normalizedError);

            return normalizedError;
        },

        /**
         * Handle API errors specifically
         */
        handleApiError(response, context = {}) {
            // Skip storage API 404s - they are expected when key doesn't exist
            const url = context?.url || '';
            const isStorage404 = url.includes('/api/storage/') && response?.status === 404;
            if (isStorage404) {
                console.log('[ErrorHandler] Ignoring expected storage 404 in handleApiError:', url);
                return null;
            }

            const userMessage = this._formatApiMessage(response) || 'API request failed';
            const code = response?.data?.error?.code
                || response?.error?.code
                || response?.code
                || 'API_ERROR';

            const normalized = this.handle(new Error(userMessage), {
                ...context,
                code,
                status: response?.status,
                response
            });

            this._pushSessionMessage(userMessage, {
                code,
                status: response?.status,
                context: normalized.context
            });

            return normalized;
        },

        /**
         * Handle network errors
         */
        handleNetworkError(error, context = {}) {
            const normalized = this.handle(error, {
                ...context,
                type: 'network',
                code: 'NETWORK_ERROR'
            });
            this._pushSessionMessage(error?.message || 'Network error', {
                code: 'NETWORK_ERROR',
                status: context?.status,
                type: 'network'
            });
            return normalized;
        },

        /**
         * Handle validation errors
         */
        handleValidationError(errors, context = {}) {
            const message = Array.isArray(errors) 
                ? errors.map(e => e.message || e).join(', ')
                : 'Validation failed';
            
            return this.handle(new Error(message), {
                ...context,
                type: 'validation',
                code: 'VALIDATION_ERROR',
                validationErrors: errors
            });
        },

        /**
         * Display error in UI
         */
        displayError(error) {
            // Check if error notification container exists
            let container = document.getElementById('errorNotifications');
            if (!container) {
                container = this._createErrorContainer();
            }

            const errorEl = this._createErrorElement(error);
            container.appendChild(errorEl);

            // Auto-hide after delay
            if (this.config.autoHideDelay > 0) {
                setTimeout(() => {
                    errorEl.classList.add('hiding');
                    setTimeout(() => errorEl.remove(), 300);
                }, this.config.autoHideDelay);
            }

            // Also show in notifications panel if available
            if (global.addNotification) {
                global.addNotification(error.message, 'error');
            }
        },

        /**
         * Create error container
         */
        _createErrorContainer() {
            const container = document.createElement('div');
            container.id = 'errorNotifications';
            container.className = 'error-notifications';
            document.body.appendChild(container);
            return container;
        },

        /**
         * Create error element
         */
        _createErrorElement(error) {
            const el = document.createElement('div');
            el.className = `error-notification error-${error.code?.toLowerCase() || 'general'}`;
            
            let html = `
                <div class="error-notification-icon">⚠️</div>
                <div class="error-notification-content">
                    <div class="error-notification-message">${global.escapeHtml(error.message)}</div>
            `;

            if (error.context?.action) {
                html += `<div class="error-notification-action">Action: ${global.escapeHtml(error.context.action)}</div>`;
            }

            if (this.config.showStackTrace && error.stack) {
                html += `<pre class="error-notification-stack">${global.escapeHtml(error.stack)}</pre>`;
            }

            if (this.config.showDetailsButton) {
                html += `<button class="error-notification-details" title="Показать детали">Details</button>`;
            }

            html += '</div>';

            if (this.config.showDismissButton) {
                html += `<button class="error-notification-close" title="Dismiss">&times;</button>`;
            }

            if (error.retryable) {
                const retryId = `retry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                html += `<button class="error-notification-retry" data-retry-id="${retryId}" title="Retry">↻ Повторить</button>`;
                html += `<div class="error-notification-retry-info" data-retry-id="${retryId}"></div>`;
            }

            el.innerHTML = html;

            // Bind events
            const closeBtn = el.querySelector('.error-notification-close');
            closeBtn?.addEventListener('click', () => {
                el.classList.add('hiding');
                setTimeout(() => el.remove(), 300);
            });

            const retryBtn = el.querySelector('.error-notification-retry');
            retryBtn?.addEventListener('click', () => {
                this._executeRetry(error, retryId, el);
            });

            const detailsBtn = el.querySelector('.error-notification-details');
            detailsBtn?.addEventListener('click', () => this.showErrorDetails(error));

            return el;
        },

        showErrorDetails(error) {
            if (typeof document === 'undefined') return;

            const ctx = error.context ?? {};
            const requestUrl = ctx.url ?? ctx.requestUrl ?? '';
            const requestMethod = (ctx.method ?? ctx.requestMethod ?? 'GET').toUpperCase();
            const requestPayload = ctx.payload ?? ctx.body ?? ctx.requestPayload;

            const stackText = error.stack || 'Stack trace unavailable';
            const contextText = JSON.stringify(ctx, null, 2) || 'No context data';
            const metaPieces = [];
            if (error.code) metaPieces.push(error.code);
            if (ctx.status) metaPieces.push(`status ${ctx.status}`);
            const metaText = metaPieces.join(' · ') || 'Details';

            const requestBlock = [
                requestUrl ? `URL: ${requestUrl}` : null,
                `Method: ${requestMethod}`,
                requestPayload != null && requestPayload !== '' ? `Request payload:\n${typeof requestPayload === 'string' ? requestPayload : JSON.stringify(requestPayload, null, 2)}` : null
            ].filter(Boolean).join('\n');

            const copyPayload = [
                `Message: ${error.message}`,
                `Code: ${error.code || 'UNSPECIFIED'}`,
                requestBlock ? `Request:\n${requestBlock}` : null,
                'Stack trace:',
                stackText,
                'Context:',
                contextText
            ].filter(Boolean).join('\n\n');

            const existingOverlay = document.querySelector('.error-detail-backdrop');
            if (existingOverlay) existingOverlay.remove();

            const backdrop = document.createElement('div');
            backdrop.className = 'error-detail-backdrop';
            backdrop.addEventListener('click', (evt) => {
                if (evt.target === backdrop) backdrop.remove();
            });

            const modal = document.createElement('div');
            modal.className = 'error-detail-modal';

            const header = document.createElement('div');
            header.className = 'error-detail-header';

            const titleWrapper = document.createElement('div');
            const title = document.createElement('div');
            title.className = 'error-detail-title';
            title.textContent = error.message || 'Error details';

            const meta = document.createElement('div');
            meta.className = 'error-detail-meta';
            meta.textContent = metaText;

            titleWrapper.appendChild(title);
            titleWrapper.appendChild(meta);

            const closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.className = 'error-detail-close';
            closeBtn.textContent = '×';
            closeBtn.addEventListener('click', () => backdrop.remove());

            header.appendChild(titleWrapper);
            header.appendChild(closeBtn);

            const body = document.createElement('div');
            body.className = 'error-detail-body';

            if (requestUrl || requestPayload != null) {
                const reqLabel = document.createElement('div');
                reqLabel.className = 'error-detail-section-title';
                reqLabel.textContent = 'Request';
                const reqPre = document.createElement('pre');
                reqPre.className = 'error-detail-request';
                reqPre.textContent = [
                    requestUrl ? `URL: ${requestUrl}` : null,
                    `Method: ${requestMethod}`,
                    requestPayload != null && requestPayload !== ''
                        ? `Payload:\n${(typeof requestPayload === 'string' ? requestPayload : JSON.stringify(requestPayload, null, 2))}`
                        : null
                ].filter(Boolean).join('\n');
                body.appendChild(reqLabel);
                body.appendChild(reqPre);
            }

            const stackLabel = document.createElement('div');
            stackLabel.className = 'error-detail-section-title';
            stackLabel.textContent = 'Stack trace';

            const stackPre = document.createElement('pre');
            stackPre.className = 'error-detail-stack';
            stackPre.textContent = stackText;

            const contextLabel = document.createElement('div');
            contextLabel.className = 'error-detail-section-title';
            contextLabel.textContent = 'Context';

            const contextPre = document.createElement('pre');
            contextPre.className = 'error-detail-context';
            contextPre.textContent = contextText;

            body.appendChild(stackLabel);
            body.appendChild(stackPre);
            body.appendChild(contextLabel);
            body.appendChild(contextPre);

            const footer = document.createElement('div');
            footer.className = 'error-detail-footer';

            const copyBtn = document.createElement('button');
            copyBtn.type = 'button';
            copyBtn.className = 'error-detail-copy';
            copyBtn.textContent = 'Copy';
            copyBtn.addEventListener('click', async () => {
                try {
                    if (navigator.clipboard?.writeText) {
                        await navigator.clipboard.writeText(copyPayload);
                    } else {
                        throw new Error('clipboard not available');
                    }
                    copyBtn.textContent = 'Copied';
                } catch (err) {
                    const tmp = document.createElement('textarea');
                    tmp.value = copyPayload;
                    document.body.appendChild(tmp);
                    tmp.select();
                    document.execCommand('copy');
                    tmp.remove();
                    copyBtn.textContent = 'Copied';
                } finally {
                    setTimeout(() => {
                        copyBtn.textContent = 'Copy';
                    }, 1500);
                }
            });

            footer.appendChild(copyBtn);

            modal.appendChild(header);
            modal.appendChild(body);
            modal.appendChild(footer);
            backdrop.appendChild(modal);
            document.body.appendChild(backdrop);
        },

        /**
         * Normalize error to consistent format
         */
        _normalizeError(error) {
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

            // Handle various error object shapes
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
        },

        /**
         * Check if error is retryable
         * Returns true only for NETWORK_ERROR, TIMEOUT, RATE_LIMIT, LLM_ERROR
         */
        _isRetryable(error) {
            const code = error.code || '';
            
            // First check non-retryable errors (explicit exclusion)
            if (this.config.nonRetryableErrors.includes(code)) {
                return false;
            }
            
            // Then check retryable errors (exact match required)
            return this.config.retryableErrors.includes(code);
        },

        /**
         * Execute retry with delay and attempt tracking
         * @param {Object} error - The error object
         * @param {string} retryId - Unique ID for this retry operation
         * @param {HTMLElement} element - The error notification element
         */
        _executeRetry(error, retryId, element) {
            const context = error.context || {};
            const attemptNumber = context.retryAttempt || 0;
            const maxRetries = this.config.maxRetries;
            const retryDelay = this.config.retryDelay;
            
            // Check if max retries exceeded
            if (attemptNumber >= maxRetries) {
                this._showRetryResult(element, retryId, false, 'Превышен максимум попыток');
                console.warn(`[ErrorHandler] Max retries (${maxRetries}) exceeded for error:`, error.code);
                return;
            }
            
            // Disable retry button and show countdown
            const retryBtn = element.querySelector('.error-notification-retry');
            const retryInfo = element.querySelector('.error-notification-retry-info');
            
            if (retryBtn) {
                retryBtn.disabled = true;
                retryBtn.textContent = '⏳';
            }
            
            let remainingSeconds = Math.ceil(retryDelay / 1000);
            
            // Update retry info display
            const updateCountdown = () => {
                if (retryInfo) {
                    retryInfo.textContent = `Повтор через ${remainingSeconds}с... (попытка ${attemptNumber + 1}/${maxRetries})`;
                }
            };
            
            updateCountdown();
            
            // Create countdown timer
            const countdownTimer = setInterval(() => {
                remainingSeconds--;
                if (remainingSeconds > 0) {
                    updateCountdown();
                }
            }, 1000);
            
            // Create retry timer
            const retryTimer = setTimeout(() => {
                // Clear countdown
                clearInterval(countdownTimer);
                
                // Clean up old timer reference
                this._retryTimers.delete(retryId);
                
                // Update context with attempt number
                const retryContext = {
                    ...context,
                    retryAttempt: attemptNumber + 1,
                    originalError: error
                };
                
                console.log(`[ErrorHandler] Executing retry ${attemptNumber + 1}/${maxRetries} for error:`, error.code);
                
                // Emit retry event with updated context
                this.emit('retry', {
                    ...error,
                    context: retryContext,
                    retryAttempt: attemptNumber + 1
                });
                
                // Remove error element
                element.remove();
                
            }, retryDelay);
            
            // Store timers for cleanup
            this._retryTimers.set(retryId, { retryTimer, countdownTimer });
            
            // Allow cancellation
            element._retryId = retryId;
        },

        /**
         * Show retry result message
         */
        _showRetryResult(element, retryId, success, message) {
            const retryInfo = element.querySelector('.error-notification-retry-info');
            if (retryInfo) {
                retryInfo.textContent = message;
                retryInfo.className = 'error-notification-retry-info ' + (success ? 'success' : 'failed');
            }
            
            const retryBtn = element.querySelector('.error-notification-retry');
            if (retryBtn) {
                retryBtn.disabled = true;
                retryBtn.textContent = success ? '✓' : '✗';
            }
        },

        /**
         * Cancel retry operation
         * @param {string} retryId - The retry ID to cancel
         */
        cancelRetry(retryId) {
            const timers = this._retryTimers.get(retryId);
            if (timers) {
                clearTimeout(timers.retryTimer);
                clearInterval(timers.countdownTimer);
                this._retryTimers.delete(retryId);
                console.log(`[ErrorHandler] Cancelled retry:`, retryId);
            }
        },

        /**
         * Cancel all pending retry operations
         */
        cancelAllRetries() {
            for (const [retryId, timers] of this._retryTimers) {
                clearTimeout(timers.retryTimer);
                clearInterval(timers.countdownTimer);
            }
            this._retryTimers.clear();
            console.log('[ErrorHandler] Cancelled all retries');
        },

        _formatApiMessage(response) {
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
        },

        _pushSessionMessage(message, meta = {}) {
            if (!message) return;

            const sessionId = meta?.sessionId
                || meta?.context?.sessionId
                || meta?.context?.session_id
                || global.SessionManager?.getActiveSessionId?.();

            const store = sessionId
                ? global.WindowRegistry?.getSessionStore?.(sessionId) || global.SessionStore
                : global.SessionStore;

            const err = new Error(message);
            if (meta && typeof meta === 'object') {
                Object.assign(err, meta);
            }

            if (store?.setError) {
                store.setError(err);
                return;
            }

            const vm = global.SessionViewModel;
            if (vm?.setError) vm.setError(err);
        },

        /**
         * Subscribe to events
         */
        on(event, callback) {
            if (!this._listeners.has(event)) {
                this._listeners.set(event, new Set());
            }
            this._listeners.get(event).add(callback);
            return () => this.off(event, callback);
        },

        /**
         * Unsubscribe from events
         */
        off(event, callback) {
            this._listeners.get(event)?.delete(callback);
        },

        /**
         * Emit event
         */
        emit(event, data) {
            this._listeners.get(event)?.forEach(cb => {
                try { cb(data); } catch (e) { console.error('[ErrorHandler] Event error:', e); }
            });
        },

        /**
         * Clear all errors
         */
        clearErrors() {
            // Cancel all pending retry operations
            this.cancelAllRetries();
            
            this.errors = [];
            const container = document.getElementById('errorNotifications');
            if (container) {
                container.innerHTML = '';
            }
            this.emit('cleared');
        },

        /**
         * Get errors by code
         */
        getErrorsByCode(code) {
            return this.errors.filter(e => e.code === code);
        },

        /**
         * Get recent errors
         */
        getRecentErrors(count = 10) {
            return this.errors.slice(0, count);
        }
    };

    // Export
    global.ErrorHandler = ErrorHandler;

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
            const options = args[1] || {};
            const reqCtx = getRequestContext(input, options);
            const url = reqCtx.url;
            const isStorageApi = url.includes('/api/storage/');

            try {
                const response = await originalFetch.apply(this, args);

                // Check for error status (skip storage API 404s - they are expected when key doesn't exist)
                if (!response.ok) {
                    const isExpected404 = isStorageApi && response.status === 404;

                    if (isStorageApi && response.status === 404) {
                        console.log('[ErrorHandler] Skipping expected storage 404 - returning response without error');
                    }

                    if (!isExpected404) {
                        // Clone response before reading body to preserve it for original caller
                        const responseClone = response.clone();
                        const errText = await responseClone.text();
                        let data = {};
                        try {
                            data = errText ? JSON.parse(errText) : {};
                        } catch (parseErr) {
                            console.error('[ErrorHandler] Error response body is not JSON:', parseErr);
                            if (errText) data = { _nonJsonBody: errText.slice(0, 2000) };
                        }
                        ErrorHandler.handleApiError({
                            status: response.status,
                            data
                        }, { ...reqCtx });
                    }
                }

                return response;
            } catch (error) {
                if (!isStorageApi) {
                    ErrorHandler.handleNetworkError(error, { ...reqCtx });
                }
                throw error;
            }
        };
    }

})(typeof window !== 'undefined' ? window : globalThis);
