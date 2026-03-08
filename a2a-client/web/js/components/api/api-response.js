/**
 * API Response Module - обработка ответов от сервера
 */

(function (global) {
    'use strict';

    /**
     * Добавить методы обработки ответов к классу
     * @param {Function} PanelClass - класс AIActionsSessionPanel
     */
    function mixinApiResponse(PanelClass) {

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

        return PanelClass;
    }

    // Export
    global.mixinApiResponse = mixinApiResponse;

})(typeof window !== 'undefined' ? window : globalThis);
