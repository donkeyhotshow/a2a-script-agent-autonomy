/**
 * AI Actions Render Module - методы рендеринга панели AI Actions
 * Использует внешние модули:
 * - ai-actions-templates.js - HTML шаблоны
 * - ai-actions-renderers.js - рендеры содержимого действий
 * - ai-actions-utils.js - утилиты
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

            // Use templates module
            contentEl.innerHTML = global.aiActionsTemplates?.panel || '';
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

            // Use utils module
            const sessions = global.aiActionsUtils?.sortSessions(this.sessions) || 
                Array.from(this.sessions.values()).sort((a, b) => 
                    new Date(b.updatedAt) - new Date(a.updatedAt)
                );

            // Use templates module
            const templates = global.aiActionsTemplates || {};
            const formatTime = global.aiActionsUtils?.formatTime || this._formatTime.bind(this);

            sessionListEl.innerHTML = sessions.map(session => 
                templates.sessionItem ? 
                    templates.sessionItem(session, session.id === this.currentSessionId, formatTime(session.updatedAt), session.actions.length) :
                    ''
            ).join('');

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
                // Use templates module
                contentEl.innerHTML = global.aiActionsTemplates?.emptySession || 
                    '<div class="empty-state"><p>No actions in this session yet</p></div>';
                return;
            }

            // Use renderers module
            const renderActionContent = global.aiActionsRenderers?.renderActionContent || 
                this._renderActionContent.bind(this);

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
                // Use templates module
                contentEl.innerHTML = global.aiActionsTemplates?.emptyContent || 
                    '<div class="empty-state"><p>Select a session</p></div>';
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

            // Use renderers module
            const renderActionContent = global.aiActionsRenderers?.renderActionContent;

            return `
                <div class="action-item ${statusClass}">
                    <div class="action-header">
                        <span class="action-type">${actionType}</span>
                        <span class="action-timestamp">${timestamp}</span>
                        <span class="action-status ${statusClass}">${statusClass}</span>
                    </div>
                    <div class="action-content">
                        ${renderActionContent ? renderActionContent(action, this.currentSessionId) : ''}
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
            // Delegate to renderers module
            const renderActionContent = global.aiActionsRenderers?.renderActionContent;
            if (renderActionContent) {
                return renderActionContent(action, this.currentSessionId);
            }

            // Fallback - should not happen if modules are loaded
            return '<div class="action-error">Renderer not available</div>';
        };

        /**
         * Получить тип действия
         * @param {Object} action
         * @returns {string}
         * @private
         */
        PanelClass.prototype._getActionType = function(action) {
            // Use utils module
            return global.aiActionsUtils?.getActionType(action) || 'unknown';
        };

        /**
         * Форматировать время
         * @param {string} isoString
         * @returns {string}
         * @private
         */
        PanelClass.prototype._formatTime = function(isoString) {
            // Use utils module
            const formatTime = global.aiActionsUtils?.formatTime;
            if (formatTime) {
                return formatTime(isoString);
            }
            
            // Fallback
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
