/**
 * AI Actions API Module - интеграция с API и выполнение действий
 */

(function (global) {
    'use strict';

    /**
     * Добавить методы API к классу AIActionsSessionPanel
     * @param {Function} PanelClass - класс AIActionsSessionPanel
     */
    function mixinAPI(PanelClass) {
        
        /**
         * Интеграция с Web API для отправки результатов
         * @private
         */
        PanelClass.prototype._setupWebAPIIntegration = function() {
            // Подписка на глобальные события от WebApiClient
            if (global.webApiClient) {
                // Слушаем события выбора choice
                global.webApiClient.on('choiceSelected', async (data) => {
                    if (data?.sessionId && data?.result) {
                        await this._sendResultToServer(data.sessionId, data.result);
                    }
                });
            }

            // Также слушаем глобальные события от aiActionsPanel
            if (global.aiActionsPanel) {
                global.aiActionsPanel.on('choiceSelected', async (data) => {
                    if (data?.sessionId && data?.result) {
                        await this._sendResultToServer(data.sessionId, data.result);
                    }
                });
            }
        };

        /**
         * Отправить результат на сервер
         * @private
         * @param {string} sessionId - ID сессии
         * @param {Object} result - Результат для отправки
         */
        PanelClass.prototype._sendResultToServer = async function(sessionId, result) {
            // Clear execute to hide form immediately after sending
            const store = global.SessionStore;
            if (store?.setExecute) store.setExecute(null);
            if (store?.clearPendingForm) store.clearPendingForm();

            try {
                const api = global.apiIntegration;
                const projectId = store?.projectId ?? await (global.ProjectManager?.getSelectedProjectId?.()) ?? null;
                const response = api?.sendResult
                    ? await api.sendResult(sessionId, result, projectId)
                    : await this._request('POST', `/sessions/${sessionId}/result`, result);

                if (response?.execute) this.processExecute(response.execute, response.context);
                if (response?.finalResult) this.processExecute({ finalResult: response.finalResult }, response.context);
                if (response?.context?.execution?.status === 'completed') this.updateSessionStatus(sessionId, 'completed');
                this.emit('resultSent', { sessionId, response });
                console.log('[AIActionsSessionPanel] Result sent to server:', result);
            } catch (error) {
                console.error('[AIActionsSessionPanel] Failed to send result to server:', error);
                this.emit('error', error);
            }
        };

        /**
         * Выполнить HTTP запрос
         * @private
         */
        PanelClass.prototype._request = async function(method, path, body = null) {
            const apiBase = global.apiIntegration?.apiBase || '/api';
            const url = `${apiBase}${path}`;
            const options = { method, headers: { 'Content-Type': 'application/json' } };
            if (body) options.body = JSON.stringify(body);

            try {
                const response = await fetch(url, options);
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(data?.error?.message || `Request failed: ${response.status}`);
                }
                return data.data || data;
            } catch (error) {
                console.error('[AIActionsSessionPanel] Request error:', error);
                throw error;
            }
        };

        /**
         * Выбрать вариант из формы выбора (execute.form.choices)
         * @param {string} sessionId - ID сессии
         * @param {string} choiceId - ID выбранного варианта
         * @param {HTMLElement} buttonElement - Кнопка (опционально)
         */
        PanelClass.prototype.selectChoice = function(sessionId, choiceId, buttonElement = null) {
            const session = this.sessions.get(sessionId);
            if (!session) {
                console.warn(`[AIActionsSessionPanel] Session ${sessionId} not found`);
                return;
            }

            // Mark button as selected if provided
            if (buttonElement) {
                const allButtons = this.container.querySelectorAll('.choice-button');
                allButtons.forEach(btn => btn.classList.remove('selected'));
                buttonElement.classList.add('selected');
            }

            // Создаем result в формате action-key shape: { choice: "..." }
            // Это соответствует протоколу A2A
            const result = { choice: choiceId };

            // Add action to session
            this.addActionToSession(sessionId, {
                type: 'choice-selection',
                choiceId: choiceId,
                result: result,
                status: 'completed',
                timestamp: new Date().toISOString()
            });

            // Emit event for external handlers (e.g., SessionManager)
            this.emit('choiceSelected', {
                sessionId,
                choiceId,
                result,
                action: session.metadata?.selectedAction
            });

            // Отправляем результат на сервер
            this._sendResultToServer(sessionId, result);

            console.log(`[AIActionsSessionPanel] Choice selected: ${choiceId}`);
        };

        /**
         * Отправить данные формы (execute.form.input)
         * @param {string} sessionId - ID сессии
         * @param {HTMLElement} buttonElement - Кнопка Submit
         */
        PanelClass.prototype.submitFormInput = function(sessionId, buttonElement = null) {
            const session = this.sessions.get(sessionId);
            if (!session) {
                console.warn(`[AIActionsSessionPanel] Session ${sessionId} not found`);
                return;
            }

            // Collect form data
            const formInputs = this.container.querySelectorAll('.form-inputs input');
            const inputData = {};
            formInputs.forEach(input => {
                inputData[input.name] = input.value;
            });

            // Создаем result в формате action-key shape: { input: {...} }
            const result = { input: inputData };

            // Add action to session
            this.addActionToSession(sessionId, {
                type: 'form-submission',
                input: inputData,
                result: result,
                status: 'completed',
                timestamp: new Date().toISOString()
            });

            // Emit event for external handlers
            this.emit('formSubmitted', {
                sessionId,
                input: inputData,
                result
            });

            // Отправляем результат на сервер
            this._sendResultToServer(sessionId, result);

            console.log(`[AIActionsSessionPanel] Form submitted:`, inputData);
        };

        /**
         * Обработать execute объект от сервера (новый протокол v2.0)
         * @param {Object} execute - execute объект от сервера
         * @param {Object} context - context объект (опционально)
         */
        PanelClass.prototype.processExecute = function(execute, context = null) {
            if (!this.currentSessionId) {
                console.warn('[AIActionsSessionPanel] No active session');
                return;
            }

            // Handle execute.finalResult (task completion)
            if (execute?.finalResult) {
                this.addActionToSession(this.currentSessionId, {
                    type: 'finalResult',
                    finalResult: execute.finalResult,
                    context: context,
                    status: 'completed',
                    timestamp: new Date().toISOString()
                });
                // Update session status to completed
                this.updateSessionStatus(this.currentSessionId, 'completed');
                return;
            }

            // Handle execute.form
            if (execute?.form) {
                const form = execute.form;
                this.addActionToSession(this.currentSessionId, {
                    type: 'form',
                    form: form,
                    title: form.title,
                    choices: form.choices,
                    input: form.input,
                    context: context,
                    status: 'pending',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // Handle execute.message
            if (execute?.message) {
                const message = typeof execute.message === 'string'
                    ? { content: execute.message }
                    : execute.message;
                this.addActionToSession(this.currentSessionId, {
                    type: 'message',
                    message: message,
                    context: context,
                    status: 'completed',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // Handle execute.script - auto-execute client-side
            if (execute?.script) {
                this.addActionToSession(this.currentSessionId, {
                    type: 'script',
                    script: execute.script,
                    context: context,
                    status: 'pending',
                    timestamp: new Date().toISOString()
                });
                // Auto-execute client-side action
                this._executeClientAction('script', execute.script, context);
                return;
            }

            // Handle execute['rag-search'] - auto-execute client-side
            if (execute?.['rag-search']) {
                this.addActionToSession(this.currentSessionId, {
                    type: 'rag-search',
                    'rag-search': execute['rag-search'],
                    context: context,
                    status: 'pending',
                    timestamp: new Date().toISOString()
                });
                // Auto-execute client-side action
                this._executeClientAction('rag-search', execute['rag-search'], context);
                return;
            }

            // Handle execute['read-file'] - auto-execute client-side
            if (execute?.['read-file']) {
                this.addActionToSession(this.currentSessionId, {
                    type: 'read-file',
                    'read-file': execute['read-file'],
                    context: context,
                    status: 'pending',
                    timestamp: new Date().toISOString()
                });
                // Auto-execute client-side action
                this._executeClientAction('read-file', execute['read-file'], context);
                return;
            }

            // Handle execute['write-file'] - auto-execute client-side
            if (execute?.['write-file']) {
                this.addActionToSession(this.currentSessionId, {
                    type: 'write-file',
                    'write-file': execute['write-file'],
                    context: context,
                    status: 'pending',
                    timestamp: new Date().toISOString()
                });
                // Auto-execute client-side action
                this._executeClientAction('write-file', execute['write-file'], context);
                return;
            }

            // Handle execute['execute-command'] - auto-execute client-side
            if (execute?.['execute-command']) {
                this.addActionToSession(this.currentSessionId, {
                    type: 'execute-command',
                    'execute-command': execute['execute-command'],
                    context: context,
                    status: 'pending',
                    timestamp: new Date().toISOString()
                });
                // Auto-execute client-side action
                this._executeClientAction('execute-command', execute['execute-command'], context);
                return;
            }

            // Unknown execute type
            console.warn('[AIActionsSessionPanel] Unknown execute type:', execute);
        };

        /**
         * Execute client-side action and send result to server
         * @param {string} actionType - Type of action (script, read-file, etc.)
         * @param {Object} actionData - Action data from execute
         * @param {Object} context - Context from server
         * @private
         */
        PanelClass.prototype._executeClientAction = async function(actionType, actionData, context = null) {
            const sessionId = this.currentSessionId;
            if (!sessionId) {
                console.warn('[AIActionsSessionPanel] Cannot execute action: no active session');
                return;
            }

            // Update action status to executing
            this._updateActionStatusByType(sessionId, actionType, 'executing');

            let result = null;
            let error = null;

            try {
                switch (actionType) {
                    case 'script':
                        result = await this._executeScript(actionData);
                        break;
                    case 'read-file':
                        result = await this._executeReadFile(actionData);
                        break;
                    case 'write-file':
                        result = await this._executeWriteFile(actionData);
                        break;
                    case 'execute-command':
                        result = await this._executeCommand(actionData);
                        break;
                    case 'rag-search':
                        result = await this._executeRagSearch(actionData);
                        break;
                    default:
                        throw new Error(`Unknown client action type: ${actionType}`);
                }
            } catch (err) {
                error = err.message || String(err);
                console.error(`[AIActionsSessionPanel] Action execution failed:`, err);
            }

            // Build action-key result
            const actionResult = error
                ? { [actionType]: { error, success: false } }
                : { [actionType]: result };

            // Update action with result
            this._updateActionResult(sessionId, actionType, actionResult, error ? 'error' : 'completed');

            // Send result to server via ActionHandler
            if (global.ActionHandler) {
                try {
                    const store = global.SessionStore;
                    const projectId = store?.projectId || context?.project_id;
                    await global.ActionHandler.submit(sessionId, projectId, actionResult, context);
                } catch (submitErr) {
                    console.error('[AIActionsSessionPanel] Failed to submit result:', submitErr);
                }
            }
        };

        /**
         * Execute script: use Client API /api/terminal/execute for command-like code
         * @private
         */
        PanelClass.prototype._executeScript = async function(scriptData) {
            const { input, output, code } = scriptData;
            console.log('[AIActionsSessionPanel] Executing script:', { input, output, code: code?.substring(0, 100) });

            const api = global.apiIntegration;
            const trimmed = (code || '').trim();
            const singleLine = trimmed.indexOf('\n') === -1 && trimmed.length > 0;
            if (singleLine && api) {
                try {
                    const data = await api.request('POST', '/terminal/execute', { command: trimmed, timeout: 120 });
                    const out = data?.stdout ?? data?.output ?? '';
                    const err = data?.stderr ?? data?.error ?? '';
                    return {
                        output: [out, err].filter(Boolean).join('\n') || (output || ''),
                        input: input || {},
                        executed: true
                    };
                } catch (e) {
                    return {
                        output: (output || '') + (e?.message ? `\nError: ${e.message}` : ''),
                        input: input || {},
                        executed: false
                    };
                }
            }
            return {
                output: output || 'Script sent to server for execution',
                input: input || {},
                executed: true
            };
        };

        /**
         * Execute read-file action
         * @private
         */
        PanelClass.prototype._executeReadFile = async function(fileData) {
            const { path } = fileData;
            if (!path) throw new Error('File path required');

            console.log('[AIActionsSessionPanel] Reading file:', path);

            if (global.FileSystemAPI) {
                try {
                    const content = await global.FileSystemAPI.readFile(path);
                    return { path, content, success: true };
                } catch (err) {
                    return { path, content: null, error: err.message, success: false };
                }
            }

            const projectId = global.SessionStore?.projectId;
            const api = global.apiIntegration;
            if (projectId && api) {
                try {
                    const encPath = path.split('/').map(encodeURIComponent).join('/');
                    const base = (api.apiBase || '').replace(/\/?$/, '');
                    const url = `${base}/projects/${projectId}/files/${encPath}`;
                    const res = await fetch(url, { headers: api._getHeaders?.() || {} });
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const content = await res.text();
                    return { path, content, success: true };
                } catch (err) {
                    return { path, content: null, error: err.message, success: false };
                }
            }

            return { path, content: null, error: 'FileSystemAPI and project file API unavailable', success: false };
        };

        /**
         * Execute write-file action
         * @private
         */
        PanelClass.prototype._executeWriteFile = async function(fileData) {
            const { path, content } = fileData;
            if (!path) throw new Error('File path required');

            console.log('[AIActionsSessionPanel] Writing file:', path, 'size:', content?.length);

            if (global.FileSystemAPI) {
                try {
                    await global.FileSystemAPI.writeFile(path, content);
                    return { path, success: true };
                } catch (err) {
                    return { path, error: err.message, success: false };
                }
            }

            return { path, error: 'FileSystemAPI required for write in browser', success: false };
        };

        /**
         * Execute command action
         * @private
         */
        PanelClass.prototype._executeCommand = async function(commandData) {
            const { command } = commandData;
            if (!command) throw new Error('Command required');

            console.log('[AIActionsSessionPanel] Executing command:', command);

            // Commands cannot be executed in browser - return error or use TerminalAPI
            if (global.TerminalAPI) {
                try {
                    const output = await global.TerminalAPI.execute(command);
                    return { command, exitCode: 0, stdout: output, stderr: '', success: true };
                } catch (err) {
                    return { command, exitCode: 1, stdout: '', stderr: err.message, success: false };
                }
            }

            return {
                command,
                exitCode: -1,
                stdout: '',
                stderr: 'Command execution not available in browser',
                success: false,
                error: 'TerminalAPI not available'
            };
        };

        /**
         * Execute RAG search action
         * @private
         */
        PanelClass.prototype._executeRagSearch = async function(searchData) {
            const { query, projectId } = searchData;
            if (!query) throw new Error('Search query required');

            console.log('[AIActionsSessionPanel] RAG search:', query);

            if (global.RAGSearchUI || global.apiIntegration) {
                try {
                    const results = await (global.RAGSearchUI?.search || global.apiIntegration?.searchActions)?.(query);
                    return {
                        query,
                        results: results || [],
                        success: true
                    };
                } catch (err) {
                    return { query, results: [], error: err.message, success: false };
                }
            }

            return {
                query,
                results: [],
                error: 'RAG/search API not available',
                success: false
            };
        };

        /**
         * Update action status by type
         * @private
         */
        PanelClass.prototype._updateActionStatusByType = function(sessionId, actionType, status) {
            const session = this.sessions.get(sessionId);
            if (!session) return;

            // Find the most recent action of this type with 'pending' status
            const action = [...session.actions].reverse().find(a =>
                a.type === actionType && a.status === 'pending'
            );

            if (action) {
                action.status = status;
                action.updatedAt = new Date().toISOString();
                if (this.currentSessionId === sessionId) {
                    this._renderSessionContent(sessionId);
                }
            }
        };

        /**
         * Update action with execution result
         * @private
         */
        PanelClass.prototype._updateActionResult = function(sessionId, actionType, result, status) {
            const session = this.sessions.get(sessionId);
            if (!session) return;

            const action = [...session.actions].reverse().find(a =>
                a.type === actionType && (a.status === 'executing' || a.status === 'pending')
            );

            if (action) {
                action.result = result;
                action.status = status;
                action.completedAt = new Date().toISOString();
                if (this.currentSessionId === sessionId) {
                    this._renderSessionContent(sessionId);
                }
            }
        };

        return PanelClass;
    }

    // Export mixin
    global.mixinAIAPI = mixinAPI;

})(typeof window !== 'undefined' ? window : globalThis);
