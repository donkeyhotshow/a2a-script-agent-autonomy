/**
 * AI Actions Renderers - рендер содержимого для разных типов действий
 */

(function (global) {
    'use strict';

    /**
     * Утилита экранирования HTML
     */
    function getEscapeHtml() {
        return global.escapeHtml || ((str) => String(str).replace(/[&<>"']/g, c => ({
            '&': '&', '<': '<', '>': '>', '"': '"', "'": '''
        })[c]));
    }

    /**
     * Рендер формы
     */
    function renderForm(action, escapeHtml, currentSessionId) {
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
                                    onclick="window.aiActionsPanel?.selectChoice('${currentSessionId}', '${escapeHtml(String(choice.id))}', this)">
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
                        <button class="submit-form-btn" onclick="window.aiActionsPanel?.submitFormInput('${currentSessionId}', this)">Submit</button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Рендер сообщения
     */
    function renderMessage(action, escapeHtml) {
        const msgData = action.message || action;
        const msgContent = msgData.content || msgData.text || msgData.message || action.content || action.text || 'No content';
        return `
            <div class="action-message">
                <div class="message-content">${escapeHtml(String(msgContent))}</div>
                ${msgData.type ? `<div class="message-type">${escapeHtml(String(msgData.type))}</div>` : ''}
            </div>
        `;
    }

    /**
     * Рендер скрипта
     */
    function renderScript(action, escapeHtml) {
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
    }

    /**
     * Рендер RAG поиска
     */
    function renderRagSearch(action, escapeHtml) {
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
    }

    /**
     * Рендер чтения файла
     */
    function renderReadFile(action, escapeHtml) {
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
    }

    /**
     * Рендер записи файла
     */
    function renderWriteFile(action, escapeHtml) {
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
    }

    /**
     * Рендер выполнения команды
     */
    function renderExecuteCommand(action, escapeHtml) {
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
    }

    /**
     * Рендер финального результата
     */
    function renderFinalResult(action, escapeHtml) {
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
    }

    /**
     * Рендер неизвестного типа
     */
    function renderUnknown(action, escapeHtml) {
        return `
            <div class="action-unknown">
                <div class="unknown-type">Unknown action type: ${action.type}</div>
                <div class="action-data">${JSON.stringify(action, null, 2)}</div>
            </div>
        `;
    }

    /**
     * Map рендеров по типам действий
     */
    const actionRenderers = {
        'form': renderForm,
        'message': renderMessage,
        'script': renderScript,
        'rag-search': renderRagSearch,
        'read-file': renderReadFile,
        'write-file': renderWriteFile,
        'execute-command': renderExecuteCommand,
        'finalResult': renderFinalResult
    };

    /**
     * Получить рендер по типу действия
     */
    function getRenderer(actionType) {
        return actionRenderers[actionType] || renderUnknown;
    }

    /**
     * Рендер содержимого действия
     */
    function renderActionContent(action, currentSessionId) {
        const escapeHtml = getEscapeHtml();
        const renderer = getRenderer(action.type);
        return renderer(action, escapeHtml, currentSessionId);
    }

    // Export renderers
    global.aiActionsRenderers = {
        renderActionContent,
        renderForm,
        renderMessage,
        renderScript,
        renderRagSearch,
        renderReadFile,
        renderWriteFile,
        renderExecuteCommand,
        renderFinalResult,
        renderUnknown,
        getRenderer
    };

})(typeof window !== 'undefined' ? window : globalThis);
