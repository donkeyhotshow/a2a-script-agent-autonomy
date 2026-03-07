/**
 * AI Actions Render Module - методы рендеринга панели AI Actions
 */

(function (global) {
    'use strict';

    /**
     * Добавить методы рендеринга к классу AIActionsSessionPanel
     * @param {Function} PanelClass - класс AIActionsSessionPanel
     */
    function mixinRender(PanelClass) {
        /**
         * Рендер содержимого панели
         * @private
         */
        PanelClass.prototype._render = function() {
            // If container doesn't have pui-panel-content, render directly into container
            let contentEl = this.container.querySelector('.pui-panel-content');
            if (!contentEl) {
                contentEl = this.container;
            }

            contentEl.innerHTML = `
                <div class="ai-actions-panel">
                    <div class="ai-actions-header">
                        <h3>AI Actions Sessions</h3>
                        <div class="ai-actions-controls">
                            <button class="btn-refresh" title="Refresh">⟳</button>
                        </div>
                    </div>
                    <div class="ai-actions-body">
                        <div class="session-list-container">
                            <div class="session-list-header">
                                <h4>Sessions</h4>
                                <span class="session-count">0</span>
                            </div>
                            <div class="session-list" id="sessionList">
                                <!-- Сессии будут добавляться здесь -->
                            </div>
                        </div>
                        <div class="session-content-container">
                            <div class="session-content-header">
                                <div class="session-info">
                                    <span class="session-id">No session selected</span>
                                    <span class="session-status">-</span>
                                </div>
                                <div class="session-actions">
                                    <button class="btn-clear-actions" title="Clear Actions">Clear</button>
                                    <button class="btn-export" title="Export">Export</button>
                                </div>
                            </div>
                            <div class="session-content" id="sessionContent">
                                <div class="empty-state">
                                    <p>Select a session to view its actions</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        };

        /**
         * Привязка обработчиков событий
         * @private
         */
        PanelClass.prototype._bindEvents = function() {
            // If container doesn't have pui-panel-content, bind directly to container
            let contentEl = this.container.querySelector('.pui-panel-content');
            if (!contentEl) {
                contentEl = this.container;
            }

            // Обновление
            contentEl.querySelector('.btn-refresh')?.addEventListener('click', () => {
                this.refreshSessions();
            });

            // Очистка действий
            contentEl.querySelector('.btn-clear-actions')?.addEventListener('click', () => {
                if (this.currentSessionId) {
                    this.clearSessionActions(this.currentSessionId);
                }
            });

            // Экспорт
            contentEl.querySelector('.btn-export')?.addEventListener('click', () => {
                if (this.currentSessionId) {
                    this.exportSession(this.currentSessionId);
                }
            });
        };

        /**
         * Рендер списка сессий
         * @private
         */
        PanelClass.prototype._renderSessionList = function() {
            const sessionListEl = this.container.querySelector('#sessionList');
            if (!sessionListEl) return;

            const sessions = Array.from(this.sessions.values()).sort((a, b) => 
                new Date(b.updatedAt) - new Date(a.updatedAt)
            );

            sessionListEl.innerHTML = sessions.map(session => `
                <div class="session-item ${session.id === this.currentSessionId ? 'active' : ''}" 
                     data-session-id="${session.id}"
                     onclick="window.aiActionsPanel?.switchToSession('${session.id}')">
                    <div class="session-item-header">
                        <span class="session-item-id">${session.id}</span>
                        <span class="session-item-status ${session.status}">${session.status}</span>
                    </div>
                    <div class="session-item-meta">
                        <span class="session-item-time">${this._formatTime(session.updatedAt)}</span>
                        <span class="session-item-count">${session.actions.length} actions</span>
                    </div>
                </div>
            `).join('');

            // Добавляем обработчики кликов
            sessionListEl.querySelectorAll('.session-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const sessionId = item.dataset.sessionId;
                    this.switchToSession(sessionId);
                });
            });
        };

        /**
         * Рендер содержимого сессии
         * @param {string} sessionId
         * @private
         */
        PanelClass.prototype._renderSessionContent = function(sessionId) {
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
                infoEl.querySelector('.session-status').textContent = session.status;
            }

            if (statusEl) {
                statusEl.textContent = session.status;
            }

            if (!contentEl) return;

            if (session.actions.length === 0) {
                contentEl.innerHTML = `
                    <div class="empty-state">
                        <p>No actions in this session yet</p>
                        <p class="empty-hint">Waiting for AI actions...</p>
                    </div>
                `;
                return;
            }

            contentEl.innerHTML = `
                <div class="actions-list">
                    ${session.actions.map(action => this._renderAction(action)).join('')}
                </div>
            `;
        };

        /**
         * Рендер пустого содержимого
         * @private
         */
        PanelClass.prototype._renderEmptyContent = function() {
            const contentEl = this.container.querySelector('#sessionContent');
            const infoEl = this.container.querySelector('.session-info');
            const statusEl = this.container.querySelector('.session-status');

            if (infoEl) {
                infoEl.querySelector('.session-id').textContent = 'No session selected';
                infoEl.querySelector('.session-status').textContent = '-';
            }

            if (statusEl) {
                statusEl.textContent = '-';
            }

            if (contentEl) {
                contentEl.innerHTML = `
                    <div class="empty-state">
                        <p>Select a session to view its actions</p>
                        <p class="empty-hint">Use the + button in the taskbar to create a new task</p>
                    </div>
                `;
            }
        };

        /**
         * Рендер отдельного действия
         * @param {Object} action
         * @returns {string}
         * @private
         */
        PanelClass.prototype._renderAction = function(action) {
            const actionType = this._getActionType(action);
            const statusClass = action.status || 'completed';
            const timestamp = this._formatTime(action.timestamp);

            return `
                <div class="action-item ${statusClass}">
                    <div class="action-header">
                        <span class="action-type">${actionType}</span>
                        <span class="action-timestamp">${timestamp}</span>
                        <span class="action-status ${statusClass}">${statusClass}</span>
                    </div>
                    <div class="action-content">
                        ${this._renderActionContent(action)}
                    </div>
                </div>
            `;
        };

        /**
         * Рендер содержимого действия в зависимости от типа
         * @param {Object} action
         * @returns {string}
         * @private
         */
        PanelClass.prototype._renderActionContent = function(action) {
            const escapeHtml = global.escapeHtml || ((str) => String(str).replace(/[&<>"']/g, c => ({
                '&': '&', '<': '<', '>': '>', '"': '"', "'": '''
            })[c]));

            switch (action.type) {
                case 'form':
                    // Support both direct form and nested execute.form structure
                    const formData = action.form || action;
                    const choices = formData.choices || action.choices || [];
                    const title = formData.title || action.title || 'Form';
                    const inputFields = formData.input || action.input || [];
                    
                    return `
                        <div class="action-form">
                            <div class="form-title">${escapeHtml(title)}</div>
                            ${choices.length > 0 ? `
                                <div class="form-choices">
                                    ${choices.map((choice, idx) => `
                                        <button class="choice-button" 
                                                data-choice-id="${escapeHtml(String(choice.id))}"
                                                data-choice-index="${idx}"
                                                onclick="window.aiActionsPanel?.selectChoice('${this.currentSessionId}', '${escapeHtml(String(choice.id))}', this)">
                                            ${escapeHtml(String(choice.label || choice.id))}
                                        </button>
                                    `).join('')}
                                </div>
                            ` : ''}
                            ${inputFields.length > 0 ? `
                                <div class="form-inputs">
                                    ${inputFields.map(field => `
                                        <div class="input-field">
                                            <label>${escapeHtml(String(field.label || field.name || ''))}</label>
                                            <input type="${field.type || 'text'}" 
                                                   name="${escapeHtml(String(field.name || ''))}" 
                                                   placeholder="${escapeHtml(String(field.placeholder || ''))}" />
                                        </div>
                                    `).join('')}
                                    <button class="submit-form-btn" onclick="window.aiActionsPanel?.submitFormInput('${this.currentSessionId}', this)">Submit</button>
                                </div>
                            ` : ''}
                        </div>
                    `;

                case 'message':
                    // Support both direct message and nested execute.message structure
                    const msgData = action.message || action;
                    const msgContent = msgData.content || msgData.text || msgData.message || action.content || action.text || 'No content';
                    return `
                        <div class="action-message">
                            <div class="message-content">${escapeHtml(String(msgContent))}</div>
                            ${msgData.type ? `<div class="message-type">${escapeHtml(String(msgData.type))}</div>` : ''}
                        </div>
                    `;

                case 'script':
                    const scriptResult = action.result?.script || action.script || {};
                    return `
                        <div class="action-script">
                            <div class="script-header">
                                <span class="script-status ${action.status}">${action.status}</span>
                            </div>
                            <div class="script-input">Input: ${JSON.stringify(scriptResult.input || action.script?.input || {}, null, 2)}</div>
                            <div class="script-output">Output: ${scriptResult.output || action.script?.output || 'No output'}</div>
                            ${scriptResult.error ? `<div class="script-error">Error: ${escapeHtml(String(scriptResult.error))}</div>` : ''}
                            <div class="script-code"><pre>${escapeHtml(String(action.script?.code || 'No code').substring(0, 500))}</pre></div>
                        </div>
                    `;

                case 'rag-search':
                    const ragResult = action.result?.['rag-search'] || action['rag-search'] || {};
                    return `
                        <div class="action-rag">
                            <div class="rag-header">
                                <span class="rag-status ${action.status}">${action.status}</span>
                            </div>
                            <div class="rag-query">Query: ${escapeHtml(String(ragResult.query || action['rag-search']?.query || 'No query'))}</div>
                            <div class="rag-results">
                                Results: ${(ragResult.results || []).length} items
                                ${(ragResult.results || []).length > 0 ? `
                                    <ul class="rag-results-list">
                                        ${ragResult.results.slice(0, 5).map(r => `
                                            <li>${escapeHtml(String(r.title || r.path || r.id || JSON.stringify(r)))}</li>
                                        `).join('')}
                                        ${ragResult.results.length > 5 ? `<li>... and ${ragResult.results.length - 5} more</li>` : ''}
                                    </ul>
                                ` : ''}
                            </div>
                            ${ragResult.error ? `<div class="rag-error">Error: ${escapeHtml(String(ragResult.error))}</div>` : ''}
                        </div>
                    `;

                case 'read-file':
                    const readResult = action.result?.['read-file'] || action['read-file'] || {};
                    return `
                        <div class="action-file">
                            <div class="file-header">
                                <span class="file-status ${action.status}">${action.status}</span>
                            </div>
                            <div class="file-path">Path: ${escapeHtml(String(readResult.path || action['read-file']?.path || 'Unknown'))}</div>
                            ${readResult.error ?
                                `<div class="file-error">Error: ${escapeHtml(String(readResult.error))}</div>` :
                                `<div class="file-content"><pre>${escapeHtml(String(readResult.content || 'No content').substring(0, 500))}</pre></div>`
                            }
                        </div>
                    `;

                case 'write-file':
                    const writeResult = action.result?.['write-file'] || action['write-file'] || {};
                    return `
                        <div class="action-file">
                            <div class="file-header">
                                <span class="file-status ${action.status}">${action.status}</span>
                            </div>
                            <div class="file-path">Path: ${escapeHtml(String(writeResult.path || action['write-file']?.path || 'Unknown'))}</div>
                            <div class="file-size">Size: ${action['write-file']?.content?.length || 0} chars</div>
                            ${writeResult.error ? `<div class="file-error">Error: ${escapeHtml(String(writeResult.error))}</div>` : ''}
                            ${writeResult.success ? '<div class="file-success">File written successfully</div>' : ''}
                        </div>
                    `;

                case 'execute-command':
                    const cmdResult = action.result?.['execute-command'] || action['execute-command'] || {};
                    return `
                        <div class="action-command">
                            <div class="command-header">
                                <span class="command-status ${action.status}">${action.status}</span>
                                ${cmdResult.exitCode !== undefined ? `<span class="command-exit-code">exit: ${cmdResult.exitCode}</span>` : ''}
                            </div>
                            <div class="command-text">${escapeHtml(String(cmdResult.command || action['execute-command']?.command || 'No command'))}</div>
                            ${cmdResult.stdout ? `<div class="command-stdout"><pre>${escapeHtml(String(cmdResult.stdout).substring(0, 300))}</pre></div>` : ''}
                            ${cmdResult.stderr ? `<div class="command-stderr"><pre>${escapeHtml(String(cmdResult.stderr).substring(0, 300))}</pre></div>` : ''}
                            ${cmdResult.error ? `<div class="command-error">Error: ${escapeHtml(String(cmdResult.error))}</div>` : ''}
                        </div>
                    `;

                case 'finalResult':
                    const finalResult = action.finalResult || action;
                    const summary = finalResult.summary || {};
                    const summaryHtml = Object.entries(summary)
                        .map(([key, value]) => `<div class="summary-item"><span class="summary-key">${escapeHtml(String(key))}:</span> <span class="summary-value">${escapeHtml(String(value))}</span></div>`)
                        .join('');
                    return `
                        <div class="action-final-result">
                            <div class="final-result-header">Task Completed: ${escapeHtml(String(finalResult.action || 'Unknown'))}</div>
                            <div class="final-result-summary">
                                ${summaryHtml || '<div class="no-summary">No summary available</div>'}
                            </div>
                        </div>
                    `;

                default:
                    return `
                        <div class="action-unknown">
                            <div class="unknown-type">Unknown action type: ${action.type}</div>
                            <div class="action-data">${JSON.stringify(action, null, 2)}</div>
                        </div>
                    `;
            }
        };

        /**
         * Получить тип действия
         * @param {Object} action
         * @returns {string}
         * @private
         */
        PanelClass.prototype._getActionType = function(action) {
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

            // Legacy format check
            if (action.finalResult) return 'finalResult';
            if (action.form) return 'form';
            if (action.message) return 'message';
            if (action.script) return 'script';
            if (action['rag-search']) return 'rag-search';
            if (action['read-file']) return 'read-file';
            if (action['write-file']) return 'write-file';
            if (action['execute-command']) return 'execute-command';
            return 'unknown';
        };

        /**
         * Форматировать время
         * @param {string} isoString
         * @returns {string}
         * @private
         */
        PanelClass.prototype._formatTime = function(isoString) {
            if (typeof formatTime === 'function') {
                return formatTime(isoString);
            }
            if (!isoString) return '';
            try {
                const date = new Date(isoString);
                return date.toLocaleTimeString();
            } catch (e) {
                return isoString;
            }
        };

        return PanelClass;
    }

    // Export mixin
    global.mixinAIRender = mixinRender;

})(typeof window !== 'undefined' ? window : globalThis);
