/**
 * WebAPIClient - Browser-compatible API client for A2A Server
 * Uses fetch API and supports SSE for real-time updates
 */

const WebAPIClient = {
    serverUrl: 'http://localhost:8080/api/v1',
    token: null,
    clientId: null,
    timeout: 30000,

    // Polling configuration
    polling: {
        interval: 2000,
        maxAttempts: 180 // 6 minutes max
    },
    activePollers: new Map(),

    /**
     * Configure the client
     */
    configure(options = {}) {
        if (options.serverUrl) this.serverUrl = options.serverUrl.replace(/\/?$/, '');
        if (options.token) this.token = options.token;
        if (options.clientId) this.clientId = options.clientId;
        if (options.timeout) this.timeout = options.timeout;
        if (options.polling) this.polling = {...this.polling, ...options.polling};
        return this;
    },

    /**
     * Build request headers
     */
    _getHeaders() {
        const headers = {'Content-Type': 'application/json'};
        if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
        if (this.clientId) headers['X-Client-ID'] = this.clientId;
        return headers;
    },

    /**
     * Make HTTP request
     */
    async request(method, path, body = null) {
        const url = `${this.serverUrl}${path}`;
        const options = {
            method,
            headers: this._getHeaders(),
            timeout: this.timeout
        };
        if (body) options.body = JSON.stringify(body);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);
            options.signal = controller.signal;

            const response = await fetch(url, options);
            clearTimeout(timeoutId);

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                const error = data?.error || {message: 'Request failed'};
                throw new ApiError(error.message, response.status, data);
            }

            return data;
        } catch (err) {
            if (err.name === 'AbortError') {
                throw new ApiError('Request timeout', 408);
            }
            throw err;
        }
    },

    /**
     * Create a request (task/message) - uses /invoke endpoint
     */
    async createRequest(requestData) {
        const data = await this.request('POST', '/invoke', requestData);
        return data.data || data;
    },

    /**
     * Create a new session (simulated - uses invoke endpoint)
     */
    async createSession(projectId, title = 'New Session') {
        const requestData = {
            context: {
                project_id: projectId,
                title: title,
                version: '1.0'
            },
            message: 'Create session'
        };
        const data = await this.request('POST', '/invoke', requestData);
        const result = data.data || data;
        return {
            session_id: result.promiseId,
            id: result.promiseId,
            projectId,
            title,
            status: 'active'
        };
    },

    /**
     * Alternative: create request via /requests
     */
    async createRequestViaRequests(requestData) {
        const data = await this.request('POST', '/requests', requestData);
        return data.data || data;
    },

    /**
     * Get request status
     */
    async getRequestStatus(promiseId) {
        const data = await this.request('GET', `/requests/${promiseId}/status`);
        return data.data || data;
    },

    /**
     * Get request result
     */
    async getRequestResult(promiseId) {
        const data = await this.request('GET', `/requests/${promiseId}/result`);
        return data.data || data;
    },

    /**
     * Cancel a request
     */
    async cancelRequest(promiseId) {
        const data = await this.request('DELETE', `/requests/${promiseId}`);
        return data.data || data;
    },

    /**
     * Poll for request completion
     */
    async waitForResult(promiseId, callbacks = {}) {
        const {onStatus, onComplete, onError} = callbacks;
        let attempts = 0;

        return new Promise((resolve, reject) => {
            const poll = async () => {
                attempts++;

                try {
                    const status = await this.getRequestStatus(promiseId);
                    onStatus?.(status);

                    if (status.status === 'completed') {
                        const result = await this.getRequestResult(promiseId);
                        onComplete?.(result);
                        resolve(result);
                    } else if (status.status === 'failed') {
                        const result = await this.getRequestResult(promiseId);
                        const error = result?.error || {message: 'Request failed'};
                        onError?.(error);
                        reject(new ApiError(error.message, 500, result));
                    } else if (status.status === 'cancelled') {
                        onError?.({message: 'Request was cancelled'});
                        reject(new ApiError('Request was cancelled', 0, status));
                    } else if (attempts >= this.polling.maxAttempts) {
                        onError?.({message: 'Polling timeout exceeded'});
                        reject(new ApiError('Polling timeout exceeded', 408));
                    } else {
                        // Continue polling
                        setTimeout(poll, this.polling.interval);
                    }
                } catch (err) {
                    onError?.({message: err.message});
                    reject(err);
                }
            };

            poll();
        });
    },

    /**
     * Send a message (create task)
     */
    async sendMessage(sessionId, message, context = {}) {
        const requestData = {
            sessionId,
            message,
            context: {
                version: '1.0',
                session_id: sessionId,
                ...context
            }
        };

        const created = await this.createRequest(requestData);
        return this.waitForResult(created.promiseId, {
            onStatus: (status) => {
                this._emit('status', {sessionId, promiseId: created.promiseId, status});
            },
            onComplete: (result) => {
                this._emit('complete', {sessionId, promiseId: created.promiseId, result});
            },
            onError: (error) => {
                this._emit('error', {sessionId, promiseId: created.promiseId, error});
            }
        });
    },

    /**
     * Continue action (approve/continue workflow)
     */
    async continueAction(sessionId, stepId, stepResult) {
        const requestData = {
            sessionId,
            context: {
                version: '1.0',
                session_id: sessionId,
                continue: true,
                step_id: stepId,
                step_result: stepResult
            }
        };

        const created = await this.createRequest(requestData);
        return this.waitForResult(created.promiseId);
    },

    /**
     * Confirm action (approve proposed actions)
     */
    async confirmAction(sessionId, approvedActions) {
        const requestData = {
            sessionId,
            context: {
                version: '1.0',
                session_id: sessionId,
                confirmed: true,
                actions: approvedActions
            }
        };

        const created = await this.createRequest(requestData);
        return this.waitForResult(created.promiseId);
    },

    /**
     * Start a new task (convenience method)
     */
    async startTask(projectId, task) {
        const session = await this.createSession(projectId);
        const sessionId = session.session_id || session.id;

        if (!sessionId) {
            throw new ApiError('No session_id in response', 500);
        }

        return this.sendMessage(sessionId, task);
    },

    /**
     * Event handlers for SSE
     */
    _eventHandlers: {},

    /**
     * Register event handler
     */
    on(event, handler) {
        if (!this._eventHandlers[event]) {
            this._eventHandlers[event] = [];
        }
        this._eventHandlers[event].push(handler);
    },

    /**
     * Unregister event handler
     */
    off(event, handler) {
        if (!this._eventHandlers[event]) return;
        const index = this._eventHandlers[event].indexOf(handler);
        if (index > -1) {
            this._eventHandlers[event].splice(index, 1);
        }
    },

    /**
     * Emit event to handlers
     */
    _emit(event, data) {
        if (!this._eventHandlers[event]) return;
        this._eventHandlers[event].forEach(handler => {
            try {
                handler(data);
            } catch (e) {
                console.error(`[WebAPI] Handler error for ${event}:`, e);
            }
        });
    },

    /**
     * SSE connection
     */
    _sse: null,

    /**
     * Connect to SSE for real-time updates
     */
    connectSSE(sessionId) {
        if (this._sse) {
            this.disconnectSSE();
        }

        const url = `${this.serverUrl}/sse/${sessionId}`;
        console.log('[WebAPI] Connecting to SSE:', url);

        try {
            this._sse = new EventSource(url);

            this._sse.onopen = () => {
                console.log('[WebAPI] SSE Connected');
                this._emit('connected', {sessionId});
            };

            this._sse.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('[WebAPI] SSE Message:', data);
                    this._emit('message', data);
                } catch (e) {
                    console.error('[WebAPI] SSE parse error:', e);
                }
            };

            this._sse.onerror = (error) => {
                console.error('[WebAPI] SSE Error:', error);
                this._emit('sseError', error);
            };

            // Named event handlers
            this._sse.addEventListener('log', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this._emit('log', data);
                } catch (e) {
                }
            });

            this._sse.addEventListener('progress', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this._emit('progress', data);
                } catch (e) {
                }
            });

            this._sse.addEventListener('status', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this._emit('status', data);
                } catch (e) {
                }
            });

            this._sse.addEventListener('complete', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this._emit('complete', data);
                } catch (e) {
                }
            });

            this._sse.addEventListener('error', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this._emit('error', data);
                } catch (e) {
                }
            });

            this._sse.sessionId = sessionId;
        } catch (e) {
            console.error('[WebAPI] SSE connection failed:', e);
        }
    },

    /**
     * Disconnect from SSE
     */
    disconnectSSE() {
        if (this._sse) {
            this._sse.close();
            this._sse = null;
            console.log('[WebAPI] SSE Disconnected');
            this._emit('disconnected', {});
        }
    },

    /**
     * Check if SSE is connected
     */
    isSSEConnected() {
        return this._sse && this._sse.readyState === EventSource.OPEN;
    }
};

/**
 * ApiError class
 */
class ApiError extends Error {
    constructor(message, status = 0, data = {}) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

// Make global
window.WebAPIClient = WebAPIClient;
window.ApiError = ApiError;

// Also export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {WebAPIClient, ApiError};
}
