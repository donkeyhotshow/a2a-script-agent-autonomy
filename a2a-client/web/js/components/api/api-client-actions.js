/**
 * API Client Actions Module - выполнение действий на стороне клиента
 */

(function (global) {
    'use strict';

    /**
     * Добавить методы выполнения клиентских действий к классу
     * @param {Function} PanelClass - класс AIActionsSessionPanel
     */
    function mixinClientActions(PanelClass) {

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

    // Export
    global.mixinClientActions = mixinClientActions;

})(typeof window !== 'undefined' ? window : globalThis);
