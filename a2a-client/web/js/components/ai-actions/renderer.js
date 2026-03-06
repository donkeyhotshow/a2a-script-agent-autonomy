/**
 * AI Actions Session Panel - Renderer Module
 * Рендеринг UI компонентов
 */

(function (global) {
    'use strict';

    /**
     * Вспомогательная функция для экранирования HTML
     */
    function escapeHtml(s) {
        const el = document.createElement('div');
        el.textContent = s;
        return el.innerHTML;
    }

    /**
     * Модуль рендеринга
     */
    const Renderer = {
        /**
         * Рендеринг списка сессий
         * @private
         */
        _renderSessionList() {
            const sessionListEl = this.container.querySelector('#sessionList');
            if (!sessionListEl) return;

            const sessions = Array.from(this.sessions.values()).sort((a, b) =>
                new Date(b.updatedAt) - new Date(a.updatedAt)
            );

            if (sessions.length === 0) {
                sessionListEl.innerHTML = '<div class="empty-sessions">No sessions yet</div>';
                return;
            }

            sessionListEl.innerHTML = sessions.map(session => {
                const isActive = session.id === this.currentSessionId;
                const statusClass = session.status || 'active';
                return `
                    <div class="session-item ${isActive ? 'active' : ''}" data-session-id="${escapeHtml(session.id)}">
                        <span class="session-name">${escapeHtml(session.id)}</span>
                        <span class="session-actions-count">${session.actions.length}</span>
                        <span class="session-status-badge ${statusClass}">${escapeHtml(statusClass)}</span>
                    </div>
                `;
            }).join('');

            // Bind click events
            sessionListEl.querySelectorAll('.session-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const sessionId = item.dataset.sessionId;
                    this.switchToSession(sessionId);
                });
            });
        },

        /**
         * Рендеринг контента сессии
         * @param {string} sessionId - ID сессии
         * @private
         */
        _renderSessionContent(sessionId) {
            const session = this.sessions.get(sessionId);
            if (!session) {
                this._renderEmptyContent();
                return;
            }

            const contentEl = this.container.querySelector('#sessionContent');
            const infoEl = this.container.querySelector('.session-info');
            const statusEl = this.container.querySelector('.session-status');

            if (infoEl) {
                infoEl.querySelector('.session-id').textContent = session.id;
            }

            if (statusEl) {
                statusEl.textContent = session.status;
            }

            if (session.actions.length === 0) {
                contentEl.innerHTML = '<div class="empty-actions">No actions yet</div>';
                return;
            }

            // Render actions in reverse order (newest first)
            contentEl.innerHTML = session.actions.slice().reverse().map(action => {
                return this._renderAction(action);
            }).join('');
        },

        /**
         * Рендеринг пустого контента
         * @private
         */
        _renderEmptyContent() {
            const contentEl = this.container.querySelector('#sessionContent');
            const infoEl = this.container.querySelector('.session-info');
            const statusEl = this.container.querySelector('.session-status');

            if (infoEl) {
                infoEl.querySelector('.session-id').textContent = 'No session selected';
            }

            if (statusEl) {
                statusEl.textContent = '-';
            }

            if (contentEl) {
                contentEl.innerHTML = '<div class="empty-content">Select a session to view actions</div>';
            }
        },

        /**
         * Рендеринг одного действия
         * @param {Object} action - действие
         * @private
         */
        _renderAction(action) {
            const actionType = this._getActionType(action);
            const statusClass = action.status || 'completed';
            const timestamp = this._formatTime(action.timestamp);

            return `
                <div class="action-item" data-action-id="${escapeHtml(action.id)}" data-action-type="${escapeHtml(actionType)}">
                    <div class="action-header">
                        <span class="action-type">${escapeHtml(actionType)}</span>
                        <span class="action-status ${statusClass}">${escapeHtml(statusClass)}</span>
                        <span class="action-time">${escapeHtml(timestamp)}</span>
                    </div>
                    <div class="action-content">
                        ${this._renderActionContent(action)}
                    </div>
                </div>
            `;
        },

        /**
         * Рендеринг контента действия по типу
         * @param {Object} action - действие
         * @private
         */
        _renderActionContent(action) {
            switch (action.type) {
                case 'form':
                    // Support both direct form and nested execute.form structure
                    const formData = action.form || action;
                    const choices = formData.choices || action.choices || [];
                    const title = formData.title || action.title || 'Form';
                    const inputFields = formData.input || action.input || [];

                    let formHtml = `<div class="form-title">${escapeHtml(title)}</div>`;

                    // Render choices
                    if (choices.length > 0) {
                        formHtml += '<div class="form-choices">';
                        choices.forEach(choice => {
                            const choiceId = choice.id || choice;
                            const choiceLabel = choice.label || choice.title || choiceId;
                            const choiceDescription = choice.description || '';
                            formHtml += `
                                <button class="choice-button" data-choice-id="${escapeHtml(String(choiceId))}">
                                    <span class="choice-label">${escapeHtml(String(choiceLabel))}</span>
                                    ${choiceDescription ? `<span class="choice-description">${escapeHtml(String(choiceDescription))}</span>` : ''}
                                </button>
                            `;
                        });
                        formHtml += '</div>';
                    }

                    // Render input fields
                    if (inputFields.length > 0) {
                        formHtml += '<div class="form-inputs">';
                        inputFields.forEach(field => {
                            const fieldName = field.name || field.id || 'field';
                            const fieldLabel = field.label || fieldName;
                            const fieldType = field.type || 'text';
                            const fieldRequired = field.required ? 'required' : '';
                            formHtml += `
                                <div class="form-field">
                                    <label for="${escapeHtml(fieldName)}">${escapeHtml(fieldLabel)}</label>
                                    <input type="${escapeHtml(fieldType)}" name="${escapeHtml(fieldName)}" ${fieldRequired}>
                                </div>
                            `;
                        });
                        formHtml += '</div>';
                        formHtml += '<button class="form-submit">Submit</button>';
                    }

                    return formHtml;

                case 'message':
                    // Support both direct message and nested execute.message structure
                    const msgData = action.message || action;
                    const msgContent = msgData.content || msgData.text || msgData.message || action.content || action.text || 'No content';
                    return `<div class="message-content">${escapeHtml(String(msgContent))}</div>`;

                case 'script':
                    const scriptResult = action.result?.script || action.script || {};
                    return `
                        <div class="script-result">
                            <pre>${escapeHtml(scriptResult.output || scriptResult.stdout || 'No output')}</pre>
                            ${scriptResult.error ? `<div class="script-error">${escapeHtml(String(scriptResult.error))}</div>` : ''}
                        </div>
                    `;

                case 'rag-search':
                    const ragResult = action.result?.['rag-search'] || action['rag-search'] || {};
                    return `
                        <div class="rag-result">
                            <div class="rag-query">${escapeHtml(ragResult.query || 'No query')}</div>
                            <div class="rag-results-count">${ragResult.results?.length || 0} results</div>
                        </div>
                    `;

                case 'read-file':
                    const readResult = action.result?.['read-file'] || action['read-file'] || {};
                    return `
                        <div class="read-file-result">
                            <div class="file-path">${escapeHtml(readResult.path || 'No path')}</div>
                            <pre class="file-content">${escapeHtml(readResult.content?.substring(0, 500) || 'No content')}</pre>
                        </div>
                    `;

                case 'write-file':
                    const writeResult = action.result?.['write-file'] || action['write-file'] || {};
                    return `
                        <div class="write-file-result">
                            <div class="file-path">${escapeHtml(writeResult.path || 'No path')}</div>
                            <div class="write-status">${writeResult.success ? '✓ Written successfully' : '✗ Write failed'}</div>
                        </div>
                    `;

                case 'execute-command':
                    const cmdResult = action.result?.['execute-command'] || action['execute-command'] || {};
                    return `
                        <div class="command-result">
                            <div class="command">${escapeHtml(cmdResult.command || 'No command')}</div>
                            <pre>${escapeHtml(cmdResult.stdout || cmdResult.output || 'No output')}</pre>
                            ${cmdResult.stderr ? `<div class="command-error">${escapeHtml(String(cmdResult.stderr))}</div>` : ''}
                        </div>
                    `;

                case 'finalResult':
                    const finalResult = action.finalResult || action;
                    const summary = finalResult.summary || {};
                    const summaryHtml = Object.entries(summary)
                        .map(([key, value]) => `<div class="summary-item"><span class="summary-key">${escapeHtml(String(key))}:</span> <span class="summary-value">${escapeHtml(String(value))}</span></div>`)
                        .join('');
                    return `
                        <div class="final-result">
                            <div class="result-message">${escapeHtml(finalResult.message || 'Task completed')}</div>
                            ${summaryHtml ? `<div class="summary">${summaryHtml}</div>` : ''}
                        </div>
                    `;

                default:
                    return `<div class="unknown-action">Unknown action type: ${escapeHtml(action.type)}</div>`;
            }
        },

        /**
         * Определить тип действия
         * @param {Object} action - действие
         * @private
         */
        _getActionType(action) {
            // Check direct type first
            if (action.type) return action.type;

            // Check execute object structure (new protocol v2.0)
            if (action.execute) {
                if (action.execute.finalResult) return 'finalResult';
                if (action.execute.form) return 'form';
                if (action.execute.message) return 'message';
                if (action.execute.script) return 'script';
                if (action.execute['rag-search']) return 'rag-search';
                if (action.execute['read-file']) return 'read-file';
                if (action.execute['write-file']) return 'write-file';
                if (action.execute['execute-command']) return 'execute-command';
            }

            // Check for result object with action types
            if (action.result) {
                if (action.result.script) return 'script';
                if (action.result['rag-search']) return 'rag-search';
                if (action.result['read-file']) return 'read-file';
                if (action.result['write-file']) return 'write-file';
                if (action.result['execute-command']) return 'execute-command';
            }

            return 'unknown';
        },

        /**
         * Обновить статус действия по типу
         * @param {string} sessionId - ID сессии
         * @param {string} actionType - тип действия
         * @param {string} status - статус
         * @private
         */
        _updateActionStatusByType(sessionId, actionType, status) {
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
        },

        /**
         * Обновить результат действия
         * @param {string} sessionId - ID сессии
         * @param {string} actionType - тип действия
         * @param {Object} result - результат
         * @param {string} status - статус
         * @private
         */
        _updateActionResult(sessionId, actionType, result, status) {
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
        }
    };

    // Export
    global.AIActionsSessionPanelRenderer = Renderer;

})(typeof window !== 'undefined' ? window : global);
