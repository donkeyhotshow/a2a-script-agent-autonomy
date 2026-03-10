/**
 * Action Handler - Unified action submission
 * Standardizes all submissions on action-key shape
 * Handles: choice, message, script, rag-search, read-file, write-file, execute-command
 * 
 * @see docs/new-request-flow/PROTOCOLS/actions/ - Детальные протоколы действий
 * @see docs/new-request-flow/PROTOCOLS/states/ - Состояния системы
 */

(function (global) {
    'use strict';

    // Fetch with timeout and retry logic (reused from global helper when available)
    const DEFAULT_TIMEOUT = 15000;
    const MAX_RETRIES = 3;
    const BASE_DELAY = 1000;

    const sharedFetchWithRetry = global.fetchWithRetry;

    async function localFetchWithRetry(url, options = {}, retryCount = 0) {
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
            console.warn(`[ActionHandler] Retry ${retryCount + 1}/${MAX_RETRIES} after ${delay}ms: ${url}`);
            await new Promise(resolve => setTimeout(resolve, delay));

            return localFetchWithRetry(url, options, retryCount + 1);
        }
    }

    const fetchWithRetry = typeof sharedFetchWithRetry === 'function'
        ? sharedFetchWithRetry
        : localFetchWithRetry;

    const ActionHandler = {
        apiBase: '/api',

        init(options = {}) {
            this.apiBase = options.apiBase || this.apiBase;
            console.log('[ActionHandler] Initialized');
            return this;
        },

        _getHeaders() {
            const headers = { 'Content-Type': 'application/json' };
            const token = global.apiIntegration?.token;
            if (token) headers['Authorization'] = `Bearer ${token}`;
            return headers;
        },

        async _request(method, path, body = null) {
            const url = `${this.apiBase}${path}`;
            const options = { method, headers: this._getHeaders() };
            if (body) options.body = JSON.stringify(body);

            const response = await fetchWithRetry(url, options);
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data?.error?.message || `Request failed: ${response.status}`);
            }
            return data.data || data;
        },

        /**
         * Submit any action result in standardized action-key shape
         * @param {string} sessionId - Session ID
         * @param {string} projectId - Project ID  
         * @param {Object} result - Result in action-key shape: { [actionType]: data }
         * @param {Object} context - Optional context to include
         * @returns {Promise<Object>} Server response
         */
        async submit(sessionId, projectId, result, context = null) {
            if (!sessionId) {
                throw new Error('Session ID required');
            }

            // Validate action-key shape
            const actionTypes = Object.keys(result);
            if (actionTypes.length !== 1) {
                throw new Error('Result must have exactly one action-type key');
            }

            // Match simulations client.json: { projectId, sessionId, result }
            const requestBody = {
                projectId: projectId ?? null,
                sessionId,
                result,
                ...(context && { context })
            };

            try {
                const response = await this._request('POST', `/sessions/${encodeURIComponent(sessionId)}/result`, requestBody);
                // Sync flow (dialog simulation): apply execute/context from response immediately
                const store = global.SessionStore;
                if (store?.applyServerResponse) {
                    const execute = response?.execute ?? response?.data?.execute;
                    const context = response?.context ?? response?.data?.context;
                    if (execute || context) {
                        store.applyServerResponse({ execute, context });
                    }
                }
                return response;
            } catch (error) {
                // Unblock input on error so user can retry
                global.SessionStore?.setPromisePending?.(false);
                throw error;
            }
        },

        /**
         * Send choice selection (form submission)
         * Action-key: { choice: "choice_id" }
         */
        async sendChoice(sessionId, projectId, choiceId) {
            const store = global.SessionStore;
            
            // Block if already waiting for response
            if (store?.isInputBlocked?.()) {
                console.log('[ActionHandler] Input blocked - waiting for server response');
                return Promise.reject(new Error('Waiting for server response'));
            }
            
            // Clear form and execute to hide UI immediately
            store?.clearPendingForm();
            store?.setExecute?.(null);
            store?.setPromisePending?.(true);

            return this.submit(sessionId, projectId, { choice: choiceId });
        },

        /**
         * Send message/continue
         * Action-key: { message: "text" }
         */
        async sendMessage(sessionId, projectId, text) {
            const store = global.SessionStore;
            
            // Block if already waiting for response
            if (store?.isInputBlocked?.()) {
                console.log('[ActionHandler] Input blocked - waiting for server response');
                return Promise.reject(new Error('Waiting for server response'));
            }
            
            const payload = (text || '').trim() || 'continue';
            
            // Clear execute to hide form immediately after sending
            store?.setExecute?.(null);
            store?.setPromisePending?.(true);

            return this.submit(sessionId, projectId, { message: payload });
        },

        /**
         * Submit script execution result
         * Action-key: { script: { input, output, error? } }
         */
        async submitScriptResult(sessionId, projectId, scriptResult) {
            return this.submit(sessionId, projectId, { script: scriptResult });
        },

        /**
         * Submit RAG search result
         * Action-key: { 'rag-search': { query, results, context? } }
         */
        async submitRagSearchResult(sessionId, projectId, searchResult) {
            return this.submit(sessionId, projectId, { 'rag-search': searchResult });
        },

        /**
         * Submit file read result
         * Action-key: { 'read-file': { path, content, error? } }
         */
        async submitReadFileResult(sessionId, projectId, fileResult) {
            return this.submit(sessionId, projectId, { 'read-file': fileResult });
        },

        /**
         * Submit file write result  
         * Action-key: { 'write-file': { path, content, success, error? } }
         */
        async submitWriteFileResult(sessionId, projectId, fileResult) {
            return this.submit(sessionId, projectId, { 'write-file': fileResult });
        },

        /**
         * Submit command execution result
         * Action-key: { 'execute-command': { command, exitCode, stdout, stderr } }
         */
        async submitCommandResult(sessionId, projectId, commandResult) {
            return this.submit(sessionId, projectId, { 'execute-command': commandResult });
        },

        /**
         * Generic execute processor - handles any execute type uniformly
         * @param {Object} execute - Execute object from server
         * @returns {Object} Normalized execute info
         */
        processExecute(execute) {
            if (!execute) return { type: 'unknown', data: null };

            // Check for each action type in priority order
            const actionTypes = [
                'finalResult',
                'form',
                'message', 
                'script',
                'rag-search',
                'read-file',
                'write-file',
                'execute-command'
            ];

            for (const type of actionTypes) {
                if (execute[type]) {
                    return {
                        type,
                        data: execute[type],
                        action: type,
                        isInput: type === 'form' || type === 'message',
                        isClientAction: ['script', 'rag-search', 'read-file', 'write-file', 'execute-command'].includes(type)
                    };
                }
            }

            return { type: 'unknown', data: execute, action: null };
        },

        /**
         * Build context for submission (legacy compatibility)
         */
        buildContext(baseContext = {}, overrides = {}) {
            const context = { ...baseContext };
            
            if (overrides.task) context.task = overrides.task;
            if (overrides.execution) {
                context.execution = {
                    ...context.execution,
                    ...overrides.execution
                };
            }
            
            return context;
        }
    };

    // Export
    global.ActionHandler = ActionHandler;

})(typeof window !== 'undefined' ? window : globalThis);
