/**
 * API Integration Module
 * Connects UI components with A2A Server API
 *
 * TODO(Task-07): use only Client API base URL (no direct a2a-server) – tasks/client/07-web-client-api-only-no-direct-server.md
 * TODO(Task-07): single config for "API base" = Client API (e.g. localhost:3001); remove server URL
 */

// Fetch with timeout and retry logic
const DEFAULT_TIMEOUT = 15000;
const MAX_RETRIES = 3;
const BASE_DELAY = 1000;

async function fetchWithRetry(url, options = {}, retryCount = 0) {
    const controller = new AbortController();
    const timeout = options.timeout || DEFAULT_TIMEOUT;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError' || retryCount >= MAX_RETRIES) {
            throw error;
        }

        const delay = BASE_DELAY * Math.pow(2, retryCount);
        console.warn(`[API] Retry ${retryCount + 1}/${MAX_RETRIES} after ${delay}ms: ${url}`);
        await new Promise(resolve => setTimeout(resolve, delay));

        return fetchWithRetry(url, options, retryCount + 1);
    }
}

class APIIntegration {
    constructor() {
        this.apiBase = '/api';
        this.token = null;
        this.connected = false;
        this.sseConnected = false;
        this.currentSession = null;
        this.currentPromiseId = null;
        this.listeners = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    get serverUrl() {
        return this.apiBase;
    }

    set serverUrl(value) {
        if (value) {
            this.configure({ apiBase: value });
        }
    }

    /**
     * Configure API client
     */
    configure(options = {}) {
        const base = options.apiBase || options.clientApiUrl || options.serverUrl;
        if (base) {
            this.apiBase = String(base).replace(/\/?$/, '');
        }
        if (options.token) this.token = options.token;

        console.log('[API] Configured:', this.apiBase);
        return this;
    }

    /**
     * Get headers for requests
     */
    _getHeaders() {
        const headers = {'Content-Type': 'application/json'};
        if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
        return headers;
    }

    /**
     * Make HTTP request
     */
    async request(method, path, body = null, meta = {}) {
        const base = this.apiBase.replace(/\/?$/, '');
        const url = path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
        const options = {
            method,
            headers: this._getHeaders()
        };

        if (body) options.body = JSON.stringify(body);

        const errorContext = {
            module: meta.module || 'APIIntegration',
            path: url,
            method,
            ...(meta.context || {})
        };

        try {
            const response = await fetchWithRetry(url, options);
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                // Skip error handling for storage API 404s (expected when key doesn't exist)
                const isStorage404 = url.includes('/api/storage/') && response.status === 404;
                if (!isStorage404) {
                    (typeof window !== 'undefined' ? window : globalThis).ErrorHandler?.handleApiError({
                        status: response.status,
                        data,
                        error: data?.error
                    }, errorContext);
                }
                throw new Error(data?.error?.message || `Request failed: ${response.status}`);
            }

            return data.data || data;
        } catch (error) {
            console.error('[API] Request error:', error);
            (typeof window !== 'undefined' ? window : globalThis).ErrorHandler?.handleNetworkError(error, errorContext);
            throw error;
        }
    }

    /**
     * Send task to server
     */
    async sendTask(taskText, options = {}) {
        const {projectPath = '', codeBlocks = [], context = {}} = options;

        console.log('[API] Sending task:', taskText);

        // Emit loading state
        if (window.appState) {
            window.appState.set('loading.tasks', true);
        }
        this.emit('taskSending', {task: taskText});

        try {
            const requestData = {
                message: taskText,
                context: {
                    project_id: projectPath,
                    version: '1.0',
                    ...context
                },
                code_blocks: codeBlocks
            };

            const result = await this.request('POST', '/invoke', requestData);

            this.currentPromiseId = result.promiseId || result.promise_id;

            if (window.appState) {
                window.appState.set('loading.tasks', false);
            }

            this.emit('taskSent', {task: taskText, result});

            return result;
        } catch (error) {
            if (window.appState) {
                window.appState.set('loading.tasks', false);
            }
            this.emit('taskError', error);
            throw error;
        }
    }

    /**
     * Send step result
     */
    async sendStepResult(stepResult) {
        if (!this.currentSession) {
            throw new Error('No active session');
        }

        const requestData = {
            context: {
                session_id: this.currentSession,
                step_result: stepResult
            }
        };

        try {
            const result = await this.request('POST', '/invoke', requestData);
            this.emit('stepResultSent', {stepResult, result});
            return result;
        } catch (error) {
            this.emit('stepResultError', error);
            throw error;
        }
    }

    /**
     * Get sessions
     */
    async getSessions(projectId = null) {
        const path = projectId ? `/sessions?projectId=${projectId}` : '/sessions';
        return this.request('GET', path);
    }

    /**
     * Get session by ID
     */
    async getSession(sessionId) {
        return this.request('GET', `/sessions/${sessionId}`);
    }

    /**
     * Delete session
     */
    async deleteSession(sessionId) {
        return this.request('DELETE', `/sessions/${sessionId}`);
    }

    /**
     * Search actions (using AI)
     */
    async searchActions(query) {
        const result = await this.sendTask(`Find relevant actions for: ${query}`);
        return result;
    }

    /**
     * Analyze task query and get suggested actions from AI
     */
    async analyzeTask(query, context = 'new-task') {
        try {
            // Try the dedicated analyze endpoint first
            const result = await this.request('POST', '/tasks/analyze', {
                query,
                context
            });
            return result;
        } catch (error) {
            // Fallback: use generic invoke to get suggestions
            console.log('[API] Analyze endpoint not available, using fallback');
            const result = await this.sendTask(`Analyze this request and suggest the best way to proceed: "${query}". Return a JSON with "options" array containing objects with "title", "description", "action", and optional "icon" fields.`);

            // Parse suggestions from result if available
            if (result?.execute?.message?.content) {
                try {
                    const content = result.execute.message.content;
                    const jsonMatch = content.match(/\{[\s\S]*"options"[\s\S]*\}/);
                    if (jsonMatch) {
                        return JSON.parse(jsonMatch[0]);
                    }
                } catch (parseError) {
                    console.warn('[API] Failed to parse suggestions:', parseError);
                }
            }

            // Return default options if parsing fails
            return {
                summary: `Task: ${query}`,
                options: [
                    {
                        title: 'Start General Task',
                        description: `Work on: ${query.slice(0, 60)}${query.length > 60 ? '...' : ''}`,
                        action: 'general-task',
                        icon: '🚀'
                    },
                    {
                        title: 'Ask for Clarification',
                        description: 'Get more details before proceeding',
                        action: 'clarify',
                        icon: '❓'
                    }
                ]
            };
        }
    }

    /**
     * Subscribe to events
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);

        return () => this.listeners.get(event)?.delete(callback);
    }

    /**
     * Emit event
     */
    emit(event, data) {
        this.listeners.get(event)?.forEach(cb => cb(data));
    }
}

// Create singleton instance
const apiIntegration = new APIIntegration();

// Make available globally
if (typeof window !== 'undefined') {
    window.APIIntegration = APIIntegration;
    window.apiIntegration = apiIntegration;
}
