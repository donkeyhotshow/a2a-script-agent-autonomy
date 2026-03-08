/**
 * AI Actions Templates - HTML шаблоны для панели AI Actions
 */

(function (global) {
    'use strict';

    /**
     * HTML шаблоны для панели AI Actions
     */
    const templates = {
        /**
         * Основной шаблон панели
         */
        panel: `
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
        `,

        /**
         * Шаблон пустого списка сессий
         */
        emptyContent: `
            <div class="empty-state">
                <p>Select a session to view its actions</p>
                <p class="empty-hint">Use the + button in the taskbar to create a new task</p>
            </div>
        `,

        /**
         * Шаблон пустой сессии
         */
        emptySession: `
            <div class="empty-state">
                <p>No actions in this session yet</p>
                <p class="empty-hint">Waiting for AI actions...</p>
            </div>
        `,

        /**
         * Шаблон элемента сессии
         */
        sessionItem: (session, isActive, timeFormatted, actionCount) => `
            <div class="session-item ${isActive ? 'active' : ''}" 
                 data-session-id="${session.id}"
                 onclick="window.aiActionsPanel?.switchToSession('${session.id}')">
                <div class="session-item-header">
                    <span class="session-item-id">${session.id}</span>
                    <span class="session-item-status ${session.status}">${session.status}</span>
                </div>
                <div class="session-item-meta">
                    <span class="session-item-time">${timeFormatted}</span>
                    <span class="session-item-count">${actionCount} actions</span>
                </div>
            </div>
        `,

        /**
         * Шаблон элемента действия
         */
        actionItem: (actionType, statusClass, timestamp, actionHtml) => `
            <div class="action-item ${statusClass}">
                <div class="action-header">
                    <span class="action-type">${actionType}</span>
                    <span class="action-timestamp">${timestamp}</span>
                    <span class="action-status ${statusClass}">${statusClass}</span>
                </div>
                <div class="action-content">
                    ${actionHtml}
                </div>
            </div>
        `,

        /**
         * Шаблон финального результата
         */
        finalResult: (finalResult, escapeHtml) => {
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
        },

        /**
         * Шаблон неизвестного типа
         */
        unknownAction: (action, escapeHtml) => `
            <div class="action-unknown">
                <div class="unknown-type">Unknown action type: ${action.type}</div>
                <div class="action-data">${JSON.stringify(action, null, 2)}</div>
            </div>
        `
    };

    // Export templates
    global.aiActionsTemplates = templates;

})(typeof window !== 'undefined' ? window : globalThis);
