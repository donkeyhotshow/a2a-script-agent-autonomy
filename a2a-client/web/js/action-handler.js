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
    const BASE_DELAY = 2000; // 2 seconds per PROTOCOLS specification

    const sharedFetchWithRetry = global.fetchWithRetry;
    const CLIENT_ACTIONS = ['script', 'rag-search', 'read-file', 'write-file', 'execute-command'];

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

    const ResultBuilder = {
        buildChoiceResult(choiceId) {
            return { choice: choiceId };
        },
        buildMessageResult(message) {
            const payload = (message || '').trim() || 'continue';
            return { message: payload };
        },
        buildActionResult(actionType, data) {
            if (!actionType) {
                return data && typeof data === 'object' ? data : { value: data };
            }
            return { [actionType]: data ?? {} };
        }
    };

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
            // Use apiIntegration if available (preferred)
            if (global.apiIntegration?.request) {
                return global.apiIntegration.request(method, path, body);
            }
            
            // Fallback to direct fetch
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

        buildChoiceResult(choiceId) {
            return ResultBuilder.buildChoiceResult(choiceId);
        },

        buildMessageResult(message) {
            return ResultBuilder.buildMessageResult(message);
        },

        buildActionResult(actionType, data) {
            return ResultBuilder.buildActionResult(actionType, data);
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
            // Note: Client API uses promiseId polling internally, returns when completed
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
            store?.clearPendingForm?.();
            store?.setExecute?.(null);
            store?.pushMessage?.({ content: choiceId }, 'user');
            store?.setPromisePending?.(true);

            const result = this.buildChoiceResult(choiceId);
            return this.submit(sessionId, projectId, result);
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
            
            const result = this.buildMessageResult(text);
            const payload = result.message;
            
            // Clear execute to hide form immediately after sending
            store?.setExecute?.(null);
            store?.pushMessage?.({ content: payload }, 'user');
            store?.setPromisePending?.(true);

            return this.submit(sessionId, projectId, result);
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

            if (execute.finalResult) {
                return {
                    type: 'finalResult',
                    data: execute.finalResult,
                    action: execute.finalResult.action || null
                };
            }

            if (execute.form) {
                return {
                    type: 'form',
                    data: execute.form,
                    action: execute?.execution?.action ?? null,
                    isInput: true
                };
            }

            if (execute.message) {
                const messageData = typeof execute.message === 'string'
                    ? { content: execute.message }
                    : execute.message;
                return {
                    type: 'message',
                    data: messageData,
                    isInput: true
                };
            }

            const actionType = CLIENT_ACTIONS.find(type => execute[type]);
            if (actionType) {
                return {
                    type: 'actions',
                    actionType,
                    data: execute[actionType],
                    action: actionType,
                    isClientAction: true
                };
            }

            return { type: 'unknown', data: execute };
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

    ActionHandler.ResultBuilder = ResultBuilder;

    // Export
    global.ActionHandler = ActionHandler;

})(typeof window !== 'undefined' ? window : globalThis);
