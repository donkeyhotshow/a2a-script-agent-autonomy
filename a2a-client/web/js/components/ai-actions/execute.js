/**
 * AI Actions Session Panel - Execute Module
 * Выполнение действий на клиенте
 */

(function (global) {
    'use strict';

    /**
     * Модуль выполнения действий
     */
    const Execute = {
        /**
         * Обработать execute команду от сервера
         * @param {Object} execute - объект execute
         * @param {Object} context - контекст
         */
        processExecute(execute, context = null) {
            if (!this.currentSessionId) {
                console.warn('[AIActionsSessionPanel] No active session');
                return;
            }

            // Handle execute.finalResult (task completion)
            if (execute?.finalResult) {
                this.addActionToSession(this.currentSessionId, {
                    type: 'finalResult',
                    finalResult: execute.finalResult,
                    status: 'completed'
                });
                this.updateSessionStatus(this.currentSessionId, 'completed');
                this.emit('execute', { type: 'finalResult', data: execute.finalResult, context });
                return;
            }

            // Handle execute.form
            if (execute?.form) {
                const form = execute.form;
                this.addActionToSession(this.currentSessionId, {
                    type: 'form',
                    form: form,
                    status: 'pending'
                });
                this.emit('execute', { type: 'form', data: form, context });
            }

            // Handle execute.message
            if (execute?.message) {
                const message = typeof execute.message === 'string'
                    ? { content: execute.message }
                    : execute.message;
                this.addActionToSession(this.currentSessionId, {
                    type: 'message',
                    message: message,
                    status: 'completed'
                });
                this.emit('execute', { type: 'message', data: message, context });
            }

            // Handle execute.script - auto-execute client-side
            if (execute?.script) {
                this.addActionToSession(this.currentSessionId, {
                    type: 'script',
                    script: execute.script,
                    status: 'pending'
                });
                this._executeClientAction('script', execute.script, context);
            }

            // Handle execute['rag-search'] - auto-execute client-side
            if (execute?.['rag-search']) {
                this.addActionToSession(this.currentSessionId, {
                    type: 'rag-search',
                    'rag-search': execute['rag-search'],
                    status: 'pending'
                });
                this._executeClientAction('rag-search', execute['rag-search'], context);
            }

            // Handle execute['read-file'] - auto-execute client-side
            if (execute?.['read-file']) {
                this.addActionToSession(this.currentSessionId, {
                    type: 'read-file',
                    'read-file': execute['read-file'],
                    status: 'pending'
                });
                this._executeClientAction('read-file', execute['read-file'], context);
            }

            // Handle execute['write-file'] - auto-execute client-side
            if (execute?.['write-file']) {
                this.addActionToSession(this.currentSessionId, {
                    type: 'write-file',
                    'write-file': execute['write-file'],
                    status: 'pending'
                });
                this._executeClientAction('write-file', execute['write-file'], context);
            }

            // Handle execute['execute-command'] - auto-execute client-side
            if (execute?.['execute-command']) {
                this.addActionToSession(this.currentSessionId, {
                    type: 'execute-command',
                    'execute-command': execute['execute-command'],
                    status: 'pending'
                });
                this._executeClientAction('execute-command', execute['execute-command'], context);
            }
        },

        /**
         * Выполнить клиентское действие
         * @param {string} actionType - тип действия
         * @param {Object} actionData - данные действия
         * @param {Object} context - контекст
         * @private
         */
        async _executeClientAction(actionType, actionData, context = null) {
            const sessionId = this.currentSessionId;
            if (!sessionId) {
                console.warn('[AIActionsSessionPanel] Cannot execute action: no active session');
                return;
            }

            // Update status to executing
            this._updateActionStatusByType(sessionId, actionType, 'executing');

            let result = null;
            let error = null;

            try {
                switch (actionType) {
                    case 'script':
                        result = await this._executeScript(actionData, context);
                        break;
                    case 'read-file':
                        result = await this._readFile(actionData, context);
                        break;
                    case 'write-file':
                        result = await this._writeFile(actionData, context);
                        break;
                    case 'execute-command':
                        result = await this._executeCommand(actionData, context);
                        break;
                    case 'rag-search':
                        result = await this._ragSearch(actionData, context);
                        break;
                    default:
                        error = `Unknown action type: ${actionType}`;
                }
            } catch (e) {
                error = e.message || String(e);
            }

            // Update status based on result
            const status = error ? 'failed' : 'completed';
            this._updateActionResult(sessionId, actionType, result || { error }, status);

            // Send result to server via ActionHandler
            if (global.ActionHandler) {
                try {
                    const store = global.SessionStore;
                    const projectId = store?.projectId || context?.project_id;
                    await global.ActionHandler.submit(sessionId, projectId, result, context);
                } catch (e) {
                    console.error('[AIActionsSessionPanel] Failed to submit result:', e);
                }
            }
        },

        /**
         * Выполнить скрипт
         * @param {Object} scriptData - данные скрипта
         * @param {Object} context - контекст
         * @private
         */
        async _executeScript(scriptData, context = null) {
            const code = scriptData.code || scriptData.script;
            if (!code) {
                return { error: 'No code provided', success: false };
            }

            try {
                // Execute in sandboxed function
                const sandboxedFn = new Function('context', `
                    "use strict";
                    ${code}
                `);
                const output = sandboxedFn(context || {});
                return { output: String(output), success: true };
            } catch (e) {
                return { error: e.message, success: false };
            }
        },

        /**
         * Прочитать файл
         * @param {Object} fileData - данные файла
         * @param {Object} context - контекст
         * @private
         */
        async _readFile(fileData, context = null) {
            const path = fileData.path;
            if (!path) {
                return { error: 'No path provided', success: false };
            }

            // Use FileSystem API if available, otherwise placeholder
            if (global.FileSystemAPI) {
                try {
                    const content = await global.FileSystemAPI.readFile(path);
                    return { path, content, success: true };
                } catch (e) {
                    return { path, error: e.message, success: false };
                }
            }

            return { path, content: '[FileSystemAPI not available]', success: false };
        },

        /**
         * Записать файл
         * @param {Object} fileData - данные файла
         * @param {Object} context - контекст
         * @private
         */
        async _writeFile(fileData, context = null) {
            const path = fileData.path;
            const content = fileData.content;
            
            if (!path || content === undefined) {
                return { error: 'Path or content not provided', success: false };
            }

            if (global.FileSystemAPI) {
                try {
                    await global.FileSystemAPI.writeFile(path, content);
                    return { path, success: true };
                } catch (e) {
                    return { path, error: e.message, success: false };
                }
            }

            return { path, error: 'FileSystemAPI not available', success: false };
        },

        /**
         * Выполнить команду
         * @param {Object} cmdData - данные команды
         * @param {Object} context - контекст
         * @private
         */
        async _executeCommand(cmdData, context = null) {
            const command = cmdData.command;
            if (!command) {
                return { error: 'No command provided', success: false };
            }

            // Commands cannot be executed in browser - return error or use TerminalAPI
            if (global.TerminalAPI) {
                try {
                    const output = await global.TerminalAPI.execute(command);
                    return { command, exitCode: 0, stdout: output, stderr: '', success: true };
                } catch (e) {
                    return { command, exitCode: 1, stdout: '', stderr: e.message, success: false };
                }
            }

            return { command, exitCode: -1, stdout: '', stderr: 'TerminalAPI not available in browser', success: false };
        },

        /**
         * Выполнить RAG поиск
         * @param {Object} searchData - данные поиска
         * @param {Object} context - контекст
         * @private
         */
        async _ragSearch(searchData, context = null) {
            const query = searchData.query;
            if (!query) {
                return { error: 'No query provided', success: false };
            }

            if (global.RAGSearchUI || global.apiIntegration) {
                try {
                    const results = await (global.RAGSearchUI?.search || global.apiIntegration?.searchActions)?.(query);
                    return { query, results: results || [], success: true };
                } catch (e) {
                    return { query, error: e.message, success: false };
                }
            }

            return { query, results: [], success: false, error: 'RAG search not available' };
        }
    };

    // Export
    global.AIActionsSessionPanelExecute = Execute;

})(typeof window !== 'undefined' ? window : global);
