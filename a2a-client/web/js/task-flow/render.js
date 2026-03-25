/**
 * TaskFlow Render Module
 * Функции рендеринга UI компонентов
 */

 (function (global) {
     'use strict';

    function formatLastError(err) {
        if (err == null) return '';
        if (typeof err === 'string') return err;
        return err.message != null ? String(err.message) : String(err);
    }

    function renderDialogErrorBanner(lastError) {
        const text = formatLastError(lastError);
        if (!text) return '';
        return `<div class="task-flow-dialog-error" role="status">${escapeHtml(text)}</div>`;
    }

    function isSystemErrorChatMessage(msg) {
        const role = msg.role || 'assistant';
        if (role !== 'system') return false;
        const m = msg.metadata || {};
        return m.type === 'error' || m.severity === 'error' || m.severity === 'warning';
    }

    /**
     * Обновить статус
     * @param {HTMLElement} contentEl - элемент контента
     * @param {string} text - текст статуса
     */


    /**
     * Рендеринг истории сообщений
     * @param {HTMLElement} contentEl - элемент контента
     * @param {Object} [store] - optional store (per-window); falls back to global.SessionStore
     */
    /** Collapsible server-side LLM / interrupt chain (`context.workbench.slots.interruptTrace`). */
    function buildInterruptTraceHtml(context) {
        const slots = context?.workbench?.slots;
        const events = slots?.interruptTrace;
        if (!Array.isArray(events) || events.length === 0) return '';
        const rows = events
            .map((ev, i) => {
                if (!ev || typeof ev !== 'object') return '';
                const k = escapeHtml(String(ev.kind || '?'));
                const parts = [k];
                if (ev.phase) parts.push(escapeHtml(String(ev.phase)));
                if (ev.chars != null) parts.push(`${escapeHtml(String(ev.chars))} chars`);
                if (ev.interruptReason) parts.push('→ ' + escapeHtml(String(ev.interruptReason)));
                if (ev.reason) parts.push(escapeHtml(String(ev.reason)));
                if (ev.continueLoop != null) parts.push(ev.continueLoop ? 'reenter' : 'stop');
                if (ev.purpose) parts.push(escapeHtml(String(ev.purpose)));
                if (ev.ok != null) parts.push(ev.ok ? 'ok' : 'fail');
                if (ev.meta) parts.push(escapeHtml(String(ev.meta)));
                if (ev.note) parts.push(escapeHtml(String(ev.note)));
                if (ev.detail) parts.push(escapeHtml(String(ev.detail)));
                const line = parts.filter(Boolean).join(' · ');
                return `<li class="task-flow-interrupt-trace-item"><span class="task-flow-interrupt-trace-idx">${i + 1}.</span> ${line}</li>`;
            })
            .filter(Boolean)
            .join('');
        if (!rows) return '';
        return `<details class="task-flow-interrupt-trace"><summary class="task-flow-interrupt-trace-summary">Server LLM chain (${events.length} steps)</summary><ol class="task-flow-interrupt-trace-list">${rows}</ol></details>`;
    }

    function renderMessageHistory(contentEl, store) {
        store = store || global.SessionStore;
        const state = store?.getState?.() || {};
        let messages = state.messages ?? store?.messages;
        if (!messages) {
            messages = [];
        }

        const banner = renderDialogErrorBanner(state.lastError);
        const visible = (messages || []).filter((msg) => !isSystemErrorChatMessage(msg));

        if (!visible.length) {
            const empty = '<div class="task-flow-history-empty">No messages yet</div>';
            return banner ? `${banner}${empty}` : empty;
        }

        const historyHtml = visible.map((msg) => {
            const role = msg.role || 'assistant';
            let content = msg.content || msg.message || msg.text;
            if (!content) {
                content = '';
            }
            const timestamp = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : '';

            return `
                <div class="task-flow-message ${escapeHtml(role)}">
                    <div class="task-flow-message-role">${escapeHtml(role)}</div>
                    <div class="task-flow-message-content">${escapeHtml(String(content))}</div>
                    ${timestamp ? `<div class="task-flow-message-time">${escapeHtml(timestamp)}</div>` : ''}
                </div>
            `;
        }).join('');

        return `${banner}<div class="task-flow-history">${historyHtml}</div>`;
    }

    /**
     * Рендеринг execute блока
     * @param {HTMLElement} contentEl - элемент контента
     * @param {Object} execute - объект execute
     * @param {Object} data - данные
     * @param {Object} store - хранилище (или null для fallback на global.SessionStore)
     * @param {Object} taskFlowRef - ссылка на TaskFlow
     */
    function renderExecute(contentEl, execute, data, store, taskFlowRef) {
        if (!contentEl || !execute) return;

        const context = data?.context;
        const execution = context?.execution;

        // Build execution step display
        let executionStepHtml = '';
        if (execution?.step) {
            const isLlmRequest = execution.step === 'request' || execution.action?.startsWith('ai-');
            const stepLabel = isLlmRequest ? 'request' : execution.step;
            executionStepHtml = `
                <div class="task-flow-execution-step">
                    <span class="step-label">${escapeHtml(stepLabel)}</span>
                    ${execution.action ? `<span class="step-action">${escapeHtml(execution.action)}</span>` : ''}
                </div>
            `;
        }

        // Build progress bar display
        let progressBarHtml = '';
        if (execution?.progress !== undefined) {
            const n = Number(execution.progress);
            const progress = Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
            progressBarHtml = `
                <div class="task-flow-progress">
                    <div class="task-flow-progress-bar" style="width: ${progress}%"></div>
                    <span class="task-flow-progress-text">${progress}%</span>
                </div>
            `;
        }

        const interruptTraceHtml = buildInterruptTraceHtml(context);
        executionStepHtml = executionStepHtml + interruptTraceHtml;

        const result = data?.result;
        const protocolCompleted =
            execution?.status === 'completed' ||
            execute?.completed === true ||
            (result && typeof result === 'object' && result.completed === true);

        // Completion banner: use execution + top-level result only (not execute.finalResult)
        let finalResultHtml = '';
        if (protocolCompleted) {
            const summary = {};
            if (result && typeof result === 'object') {
                for (const [k, v] of Object.entries(result)) {
                    if (k !== 'completed') summary[k] = v;
                }
            }
            const actionName = execution?.action || 'task';

            let summaryHtml = '';
            if (typeof summary === 'object' && summary !== null && Object.keys(summary).length > 0) {
                summaryHtml = Object.entries(summary)
                    .map(([key, value]) => `<div class="summary-item"><span class="summary-key">${escapeHtml(String(key))}:</span> <span class="summary-value">${escapeHtml(String(value))}</span></div>`)
                    .join('');
            }

            finalResultHtml = `
                <div class="task-flow-final-result">
                    <div class="result-header">
                        <span class="result-action">${escapeHtml(actionName)}</span>
                        <span class="result-status completed">✓ Completed</span>
                    </div>
                    ${summaryHtml ? `<div class="result-summary">${summaryHtml}</div>` : ''}
                </div>
            `;
        }

        // Build result display
        let resultHtml = '';
        if (result && typeof result === 'object') {
            resultHtml = renderResultBlock(result);
        }

        // Route to specific renderer
        // execute.form.input + execute.message: message shown via history (set by SessionStore), input stays open
        // execute.form.choices: choice buttons
        // execute.form.input only: text input
        // execute.message (+ optional llmMessage, attachments): Client API sanitizes rag-search/read-file into these
        store = store || data?.store || global.SessionStore;
        if (execute.form) {
            return renderForm(contentEl, execute.form, executionStepHtml, progressBarHtml, finalResultHtml, resultHtml, taskFlowRef, store);
        }
        const attHtml = renderAttachmentsBlock(execute.attachments);
        const mainText = messageBodyText(execute.message);
        const llmText = messageBodyText(execute.llmMessage);
        const hasMain = mainText.trim().length > 0;
        const hasLlm = llmText.trim().length > 0;
        if (hasMain || hasLlm || attHtml) {
            return renderWebExecuteMessage(
                contentEl,
                execute,
                { mainText, llmText, attHtml },
                executionStepHtml,
                progressBarHtml,
                finalResultHtml,
                resultHtml,
                taskFlowRef,
                store
            );
        } else if (
            execute.script ||
            execute['rag-search'] ||
            execute['read-file'] ||
            execute['write-file'] ||
            execute['execute-command'] ||
            execute['list-directory'] ||
            execute['grep-search'] ||
            execute['file-exists'] ||
            execute['edit-patch'] ||
            execute['run-script']
        ) {
            // Deterministic action-key selection based on priority list
            const actionPriority = ['script', 'rag-search', 'read-file', 'write-file', 'execute-command', 'list-directory', 'grep-search', 'file-exists', 'edit-patch', 'run-script'];
            let selectedKey = null;
            for (const key of actionPriority) {
                if (execute[key]) {
                    selectedKey = key;
                    break;
                }
            }
            // Fallback to first key if not in priority list (shouldn't happen with proper sanitization)
            if (!selectedKey) {
                const keys = Object.keys(execute);
                selectedKey = keys.length > 0 ? keys[0] : null;
                if (keys.length > 1) {
                    console.warn('[Render] Multiple action keys detected, using first:', selectedKey);
                }
            }
            return renderClientAction(contentEl, selectedKey, execute, executionStepHtml, progressBarHtml, finalResultHtml, resultHtml, taskFlowRef);
        } else if (execute.debug) {
            return renderDebug(contentEl, data, executionStepHtml, progressBarHtml, finalResultHtml, resultHtml, taskFlowRef);
        }
    }

    function messageBodyText(message) {
        if (message == null) return '';
        if (typeof message === 'string') return message;
        return message.content || message.text || '';
    }

    function renderAttachmentsBlock(attachments) {
        if (!attachments || typeof attachments !== 'object') return '';
        const parts = [];
        const rf = attachments.readFiles;
        if (Array.isArray(rf) && rf.length) {
            const lines = rf
                .map((f) => {
                    const p = typeof f === 'string' ? f : f && f.path;
                    return p ? `<li><code>${escapeHtml(String(p))}</code></li>` : '';
                })
                .filter(Boolean);
            if (lines.length) {
                parts.push(
                    `<div class="task-flow-attachments-readfiles"><div class="task-flow-attachments-title">Read files</div><ul>${lines.join('')}</ul></div>`
                );
            }
        }
        if (typeof attachments.ragQuery === 'string' && attachments.ragQuery.trim()) {
            parts.push(
                `<div class="task-flow-attachments-rag"><span class="task-flow-attachments-title">Search</span> <code>${escapeHtml(attachments.ragQuery.trim())}</code></div>`
            );
        }
        const wf = attachments.writtenFiles;
        if (Array.isArray(wf) && wf.length) {
            const lines = wf
                .map((f) => (f && f.path ? `<li><code>${escapeHtml(String(f.path))}</code></li>` : ''))
                .filter(Boolean);
            if (lines.length) {
                parts.push(
                    `<div class="task-flow-attachments-written"><div class="task-flow-attachments-title">Written files</div><ul>${lines.join('')}</ul></div>`
                );
            }
        }
        if (typeof attachments.shellCommand === 'string' && attachments.shellCommand.trim()) {
            parts.push(
                `<div class="task-flow-attachments-cmd"><span class="task-flow-attachments-title">Command</span> <code>${escapeHtml(
                    attachments.shellCommand.trim()
                )}</code></div>`
            );
        }
        if (typeof attachments.listDirectoryPath === 'string' && attachments.listDirectoryPath.trim()) {
            parts.push(
                `<div class="task-flow-attachments-listdir"><span class="task-flow-attachments-title">Directory</span> <code>${escapeHtml(
                    attachments.listDirectoryPath.trim()
                )}</code></div>`
            );
        }
        if (typeof attachments.grepPattern === 'string' && attachments.grepPattern.trim()) {
            const gp = escapeHtml(attachments.grepPattern.trim());
            const gpath =
                typeof attachments.grepPath === 'string' && attachments.grepPath.trim()
                    ? ` <span class="task-flow-attachments-meta">in <code>${escapeHtml(
                          attachments.grepPath.trim()
                      )}</code></span>`
                    : '';
            const gglob =
                typeof attachments.grepGlob === 'string' && attachments.grepGlob.trim()
                    ? ` <span class="task-flow-attachments-meta">glob <code>${escapeHtml(
                          attachments.grepGlob.trim()
                      )}</code></span>`
                    : '';
            parts.push(
                `<div class="task-flow-attachments-grep"><span class="task-flow-attachments-title">Grep</span> <code>${gp}</code>${gpath}${gglob}</div>`
            );
        }
        if (typeof attachments.fileExistsPath === 'string' && attachments.fileExistsPath.trim()) {
            parts.push(
                `<div class="task-flow-attachments-fileexists"><span class="task-flow-attachments-title">Check path</span> <code>${escapeHtml(
                    attachments.fileExistsPath.trim()
                )}</code></div>`
            );
        }
        if (typeof attachments.editPatchPath === 'string' && attachments.editPatchPath.trim()) {
            parts.push(
                `<div class="task-flow-attachments-patch"><span class="task-flow-attachments-title">Patch target</span> <code>${escapeHtml(
                    attachments.editPatchPath.trim()
                )}</code></div>`
            );
        }
        if (typeof attachments.runScriptId === 'string' && attachments.runScriptId.trim()) {
            parts.push(
                `<div class="task-flow-attachments-runscript"><span class="task-flow-attachments-title">Script</span> <code>${escapeHtml(
                    attachments.runScriptId.trim()
                )}</code></div>`
            );
        }
        return parts.length ? `<div class="task-flow-attachments">${parts.join('')}</div>` : '';
    }

    /**
     * Рендеринг блока результата
     * @param {Object} result - объект result
     * @returns {string} HTML для отображения результата
     */
    function renderResultBlock(result) {
        if (!result || typeof result !== 'object') return '';

        // Получаем первый ключ результата (должен быть только один согласно спецификации)
        const resultKeys = Object.keys(result);
        if (resultKeys.length === 0) return '';

        const actionType = resultKeys[0];
        const actionData = result[actionType];

        // Определяем иконки и метки для разных типов результатов
        const typeLabels = {
            'read-file': 'Read File Result',
            'grep-search': 'Grep Search Results',
            'execute-command': 'Command Output',
            'script': 'Script Output',
            'list-directory': 'Directory Listing',
            'file-exists': 'File Exists Check',
            'write-file': 'Write File Result',
            'edit-patch': 'Edit Patch Result',
            'rag-search': 'RAG Search Results',
            'run-script': 'Run Script Output'
        };

        const typeIcons = {
            'read-file': '📄',
            'grep-search': '🔎',
            'execute-command': '▶',
            'script': '⚡',
            'list-directory': '📁',
            'file-exists': '❓',
            'write-file': '✏️',
            'edit-patch': '📋',
            'rag-search': '🔍',
            'run-script': '⚡'
        };

        const icon = typeIcons[actionType] || '⚙️';
        const label = typeLabels[actionType] || actionType;

        let contentHtml = '';

        // Специализированное отображение для разных типов результатов
        switch (actionType) {
            case 'read-file':
                if (actionData && typeof actionData === 'object' && actionData.content !== undefined) {
                    contentHtml = `<pre class="result-content">${escapeHtml(String(actionData.content))}</pre>`;
                    if (actionData.path) {
                        contentHtml = `<div><strong>File:</strong> ${escapeHtml(String(actionData.path))}</div>${contentHtml}`;
                    }
                } else {
                    contentHtml = `<pre>${escapeHtml(JSON.stringify(actionData, null, 2))}</pre>`;
                }
                break;

            case 'grep-search':
                if (actionData && typeof actionData === 'object' && Array.isArray(actionData.results)) {
                    const results = actionData.results;
                    if (results.length === 0) {
                        contentHtml = '<div>No matches found</div>';
                    } else {
                        const lines = results.map((match, index) => {
                            // Поддерживаем разные форматы результатов grep
                            if (typeof match === 'string') {
                                return `<div class="grep-match">${escapeHtml(match)}</div>`;
                            } else if (match && typeof match === 'object') {
                                const lineNum = match.line !== undefined ? match.line : match.lineNumber !== undefined ? match.lineNumber : index + 1;
                                const content = match.content !== undefined ? match.content : match.match !== undefined ? match.match : '';
                                const file = match.file !== undefined ? match.file : '';
                                let matchHtml = `<div class="grep-match">`;
                                if (file) {
                                    matchHtml += `<span class="grep-file">${escapeHtml(String(file))}</span>:`;
                                }
                                if (lineNum !== undefined) {
                                    matchHtml += `<span class="grep-line">${escapeHtml(String(lineNum))}</span>:`;
                                }
                                matchHtml += `<span class="grep-content">${escapeHtml(String(content))}</span></div>`;
                                return matchHtml;
                            } else {
                                return `<div class="grep-match">${escapeHtml(String(match))}</div>`;
                            }
                        }).join('');
                        contentHtml = `
                            <div><strong>Pattern:</strong> ${escapeHtml(String(actionData.pattern || ''))}</div>
                            <div><strong>Matches:</strong> ${results.length}</div>
                            <div class="grep-results">${lines}</div>
                        `;
                    }
                } else {
                    contentHtml = `<pre>${escapeHtml(JSON.stringify(actionData, null, 2))}</pre>`;
                }
                break;

            case 'execute-command':
                if (actionData && typeof actionData === 'object' && actionData.output !== undefined) {
                    contentHtml = `<pre class="result-output">${escapeHtml(String(actionData.output))}</pre>`;
                    if (actionData.command) {
                        contentHtml = `<div><strong>Command:</strong> ${escapeHtml(String(actionData.command))}</div>${contentHtml}`;
                    }
                } else {
                    contentHtml = `<pre>${escapeHtml(JSON.stringify(actionData, null, 2))}</pre>`;
                }
                break;

            case 'script':
                if (actionData && typeof actionData === 'object' && actionData.output !== undefined) {
                    contentHtml = `<pre class="result-output">${escapeHtml(String(actionData.output))}</pre>`;
                    if (actionData.code) {
                        contentHtml = `<div><strong>Script:</strong></div><pre class="script-code">${escapeHtml(String(actionData.code))}</pre>${contentHtml}`;
                    }
                } else {
                    contentHtml = `<pre>${escapeHtml(JSON.stringify(actionData, null, 2))}</pre>`;
                }
                break;

            case 'list-directory':
                if (actionData && typeof actionData === 'object' && Array.isArray(actionData.entries)) {
                    const entries = actionData.entries;
                    if (entries.length === 0) {
                        contentHtml = '<div>Directory is empty</div>';
                    } else {
                        const lines = entries.map((entry) => {
                            if (typeof entry === 'string') {
                                return `<div class="dir-entry">${escapeHtml(entry)}</div>`;
                            } else if (entry && typeof entry === 'object') {
                                const name = entry.name !== undefined ? entry.name : entry.path !== undefined ? entry.path : '';
                                const type = entry.type !== undefined ? entry.type : entry.isDirectory !== undefined ? (entry.isDirectory ? 'directory' : 'file') : 'unknown';
                                const size = entry.size !== undefined ? entry.size : '';
                                let entryHtml = `<div class="dir-entry">`;
                                if (type === 'directory') {
                                    entryHtml += `<span class="dir-type">📁 </span>`;
                                } else {
                                    entryHtml += `<span class="dir-type">📄 </span>`;
                                }
                                entryHtml += `${escapeHtml(String(name))}`;
                                if (size !== '' && type !== 'directory') {
                                    entryHtml += ` <span class="dir-size">(${escapeHtml(String(size))} bytes)</span>`;
                                }
                                entryHtml += '</div>';
                                return entryHtml;
                            } else {
                                return `<div class="dir-entry">${escapeHtml(String(entry))}</div>`;
                            }
                        }).join('');
                        contentHtml = `<div class="dir-entries">${lines}</div>`;
                    }
                } else {
                    contentHtml = `<pre>${escapeHtml(JSON.stringify(actionData, null, 2))}</pre>`;
                }
                break;

            case 'file-exists':
                if (actionData && typeof actionData === 'object' && actionData.exists !== undefined) {
                    const exists = actionData.exists;
                    contentHtml = `
                        <div><strong>Path:</strong> ${escapeHtml(String(actionData.path || ''))}</div>
                        <div><strong>Exists:</strong> <span class="exists-status">${exists ? 'Yes' : 'No'}</span></div>
                    `;
                } else {
                    contentHtml = `<pre>${escapeHtml(JSON.stringify(actionData, null, 2))}</pre>`;
                }
                break;

            case 'write-file':
                if (actionData && typeof actionData === 'object' && actionData.path !== undefined) {
                    contentHtml = `
                        <div><strong>Written to:</strong> ${escapeHtml(String(actionData.path))}</div>
                        ${actionData.bytes !== undefined ? `<div><strong>Bytes written:</strong> ${escapeHtml(String(actionData.bytes))}</div>` : ''}
                    `;
                } else {
                    contentHtml = `<pre>${escapeHtml(JSON.stringify(actionData, null, 2))}</pre>`;
                }
                break;

            case 'edit-patch':
                if (actionData && typeof actionData === 'object' && actionData.applied !== undefined) {
                    const applied = actionData.applied;
                    contentHtml = `
                        <div><strong>Patch applied:</strong> <span class="patch-status">${applied ? 'Yes' : 'No'}</span></div>
                        ${actionData.path ? `<div><strong>Target file:</strong> ${escapeHtml(String(actionData.path))}</div>` : ''}
                        ${actionData.rejectedCount !== undefined ? `<div><strong>Rejected chunks:</strong> ${escapeHtml(String(actionData.rejectedCount))}</div>` : ''}
                    `;
                } else {
                    contentHtml = `<pre>${escapeHtml(JSON.stringify(actionData, null, 2))}</pre>`;
                }
                break;

            case 'rag-search':
                if (actionData && typeof actionData === 'object' && Array.isArray(actionData.results)) {
                    const results = actionData.results;
                    if (results.length === 0) {
                        contentHtml = '<div>No RAG results found</div>';
                    } else {
                        const lines = results.map((result, index) => {
                            if (typeof result === 'string') {
                                return `<div class="rag-result">${escapeHtml(result)}</div>`;
                            } else if (result && typeof result === 'object') {
                                const content = result.content !== undefined ? result.content : result.text !== undefined ? result.text : '';
                                const score = result.score !== undefined ? result.score : result.relevance !== undefined ? result.relevance : '';
                                const source = result.source !== undefined ? result.source : result.file !== undefined ? result.file : '';
                                let resultHtml = `<div class="rag-result">`;
                                if (source) {
                                    resultHtml += `<span class="rag-source">[${escapeHtml(String(source))}]</span> `;
                                }
                                if (score !== '') {
                                    resultHtml += `<span class="rag-score">(score: ${escapeHtml(String(score))})</span> `;
                                }
                                resultHtml += `${escapeHtml(String(content))}</div>`;
                                return resultHtml;
                            } else {
                                return `<div class="rag-result">${escapeHtml(String(result))}</div>`;
                            }
                        }).join('');
                        contentHtml = `
                            <div><strong>Query:</strong> ${escapeHtml(String(actionData.query || ''))}</div>
                            <div><strong>Results:</strong> ${results.length}</div>
                            <div class="rag-results">${lines}</div>
                        `;
                    }
                } else {
                    contentHtml = `<pre>${escapeHtml(JSON.stringify(actionData, null, 2))}</pre>`;
                }
                break;

            case 'run-script':
                if (actionData && typeof actionData === 'object' && actionData.output !== undefined) {
                    contentHtml = `<pre class="result-output">${escapeHtml(String(actionData.output))}</pre>`;
                    if (actionData.scriptId) {
                        contentHtml = `<div><strong>Script ID:</strong> ${escapeHtml(String(actionData.scriptId))}</div>${contentHtml}`;
                    }
                } else {
                    contentHtml = `<pre>${escapeHtml(JSON.stringify(actionData, null, 2))}</pre>`;
                }
                break;

            default:
                // Для неизвестных типов результатов показываем JSON
                contentHtml = `<pre>${escapeHtml(JSON.stringify(actionData, null, 2))}</pre>`;
                break;
        }

        return `
            <div class="task-flow-result-block">
                <div class="result-header">
                    <span class="result-type-icon">${icon}</span>
                    <span class="result-type-label">${escapeHtml(label)}</span>
                </div>
                <div class="result-content">${contentHtml}</div>
            </div>
        `;
    }

    /**
     * Primary message + optional LLM block + attachments (from Client API web execute DTO).
     */
    function renderWebExecuteMessage(
        contentEl,
        execute,
        texts,
        executionStepHtml,
        progressBarHtml,
        finalResultHtml,
        resultHtml,
        taskFlowRef,
        store
    ) {
        const effectiveStore = store || global.SessionStore;
        const historyHtml = renderMessageHistory(contentEl, effectiveStore);
        const mainBlock =
            texts.mainText.trim().length > 0
                ? `<div class="task-flow-message-display">${escapeHtml(texts.mainText)}</div>`
                : '';
        const llmBlock =
            texts.llmText.trim().length > 0
                ? `<div class="task-flow-llm-message"><div class="task-flow-form-title">Model</div><div class="task-flow-message-display">${escapeHtml(
                      texts.llmText
                  )}</div></div>`
                : '';
        contentEl.innerHTML = `
            ${historyHtml}
            <div class="task-flow-execute-card">
                ${executionStepHtml}
                ${progressBarHtml}
                <div class="task-flow-message-container">
                    <div class="task-flow-form-header">
                        <span class="task-flow-form-icon">ℹ</span>
                        <div class="task-flow-form-title">Message</div>
                    </div>
                    ${mainBlock}
                    ${llmBlock}
                    ${texts.attHtml || ''}
                </div>
                ${finalResultHtml}
                ${resultHtml || ''}
            </div>
        `;
    }

    /**
     * Рендеринг формы
     * @param {HTMLElement} contentEl - элемент контента
     * @param {Object} form - данные формы
     * @param {string} executionStepHtml - HTML шага выполнения
     * @param {string} progressBarHtml - HTML прогресс бара
     * @param {string} finalResultHtml - HTML финального результата
     * @param {Object} taskFlowRef - ссылка на TaskFlow
     */
    function renderForm(contentEl, form, executionStepHtml, progressBarHtml, finalResultHtml, resultHtml, taskFlowRef, store) {
        // Use explicitly passed store (fallback to global if not provided)
        const effectiveStore = store || global.SessionStore;
        
        // Check if promise is pending - if so, hide form and show loader instead
        const storeState = effectiveStore?.getState?.() || {};
        if (storeState.promisePending) {
            const historyHtml = renderMessageHistory(contentEl, effectiveStore);
            contentEl.innerHTML = historyHtml;
            // Skip inline loader - use window-events.js spinner instead
            return;
        }

        const hasChoices = (form?.choices?.length > 0) || (form?.meta?.routerChoices?.length > 0);
        
        // Support both form.choices and form.meta.routerChoices
        const choices = form?.choices || form?.meta?.routerChoices || [];
        let inputFields = [];
        if (form?.input) {
            if (Array.isArray(form.input)) {
                inputFields = form.input;
            } else if (typeof form.input === 'object' && form.input !== null) {
                inputFields = [form.input];
            }
        }
        // If no input found in form.input, look for direct properties that are objects with a 'name'
        if (inputFields.length === 0 && form && typeof form === 'object') {
            for (const key in form) {
                if (key === 'choices' || key === 'meta' || key === 'title' || key === 'description') {
                    continue; // skip known non-input properties
                }
                const prop = form[key];
                if (prop && typeof prop === 'object' && !Array.isArray(prop) && prop.name !== undefined) {
                    inputFields.push(prop);
                }
            }
        }

        let formContent = '';

        const formIcon = hasChoices ? '☰' : (inputFields.length > 0 ? '✏️' : '⚙️');
        const formTitle = form.title || (hasChoices ? 'Choose an option' : 'Enter details');

        if (hasChoices) {
            const buttons = choices.map((c, i) =>
                `<button type="button" class="task-flow-choice-btn" data-choice-id="${escapeHtml(c.id)}">
                    <span class="task-flow-choice-index">${i + 1}</span>
                    <span class="task-flow-choice-label">${escapeHtml(c.label || c.id)}</span>
                    <span class="task-flow-choice-arrow">›</span>
                </button>`
            ).join('');
            formContent += `<div class="task-flow-choices">${buttons}</div>`;
        }

        if (inputFields.length > 0) {
            const inputsHtml = inputFields.map((f) => {
                const name = f.name || 'input';
                const label = f.label ? `<label for="task-flow-input-${escapeHtml(name)}">${escapeHtml(f.label)}</label>` : '';
                const placeholder = f.placeholder || '';
                const required = f.required ? 'required' : '';
                return `<div class="task-flow-input-group">${label}<textarea id="task-flow-input-${escapeHtml(name)}" name="${escapeHtml(name)}" placeholder="${escapeHtml(placeholder)}" ${required} class="task-flow-input-field" autocomplete="off" rows="4"></textarea></div>`;
            }).join('');
            formContent += `<div class="task-flow-inputs">${inputsHtml}</div><div class="task-flow-submit-row"><button type="button" class="task-flow-submit-btn">Send →</button></div>`;
        }

        const historyHtml = renderMessageHistory(contentEl, effectiveStore);

        contentEl.innerHTML = `
            ${historyHtml}
            <div class="task-flow-execute-card">
                ${executionStepHtml}
                ${progressBarHtml}
                <div class="task-flow-form-container">
                    <div class="task-flow-form-header">
                        <span class="task-flow-form-icon">${formIcon}</span>
                        <div>
                            <div class="task-flow-form-title">${escapeHtml(formTitle)}</div>
                        </div>
                    </div>
                    ${formContent}
                </div>
                ${finalResultHtml}
                ${resultHtml || ''}
            </div>
        `;

        // Bind choice button handlers
        contentEl.querySelectorAll('.task-flow-choice-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const choiceId = btn.getAttribute('data-choice-id');
                if (choiceId && taskFlowRef?.sendChoice) {
                    taskFlowRef.sendChoice(choiceId, contentEl);
                }
            });
        });

        // Bind input form submit
        const submitBtn = contentEl.querySelector('.task-flow-submit-btn');
        const inputEl = contentEl.querySelector('.task-flow-input-field');
        if (submitBtn && inputEl && taskFlowRef?.sendMessageResult) {
                const doSubmit = () => {
                    const val = inputEl.value?.trim();
                    if (val) {
                        const card = contentEl.querySelector('.task-flow-execute-card');
                        if (card) card.style.display = 'none';
                        taskFlowRef.sendMessageResult(val, contentEl);
                    }
                };

            submitBtn.addEventListener('click', doSubmit);
            inputEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSubmit(); }
            });
            // autofocus first input
            setTimeout(() => inputEl.focus(), 50);
        }
    }
    

    /**
     * Рендеринг сообщения
     * @param {HTMLElement} contentEl - элемент контента
     * @param {Object} message - сообщение
     * @param {string} executionStepHtml - HTML шага выполнения
     * @param {string} progressBarHtml - HTML прогресс бара
     * @param {string} finalResultHtml - HTML финального результата
     * @param {Object} taskFlowRef - ссылка на TaskFlow
     */
    function renderMessage(contentEl, message, executionStepHtml, progressBarHtml, finalResultHtml, taskFlowRef, store) {
        const messageContent = typeof message === 'string' ? message : (message.content || message.text || '');
        const messageType = typeof message === 'object' ? (message.type || 'info') : 'info';
        const typeIcons = { success: '✓', error: '⚠', warning: '⚠', info: 'ℹ' };
        const icon = typeIcons[messageType] || 'ℹ';
        const effectiveStore = store || global.SessionStore;
        const historyHtml = renderMessageHistory(contentEl, effectiveStore);

        contentEl.innerHTML = `
            ${historyHtml}
            <div class="task-flow-execute-card">
                ${executionStepHtml}
                ${progressBarHtml}
                <div class="task-flow-message-container">
                    <div class="task-flow-form-header">
                        <span class="task-flow-form-icon">${icon}</span>
                        <div class="task-flow-form-title">Message</div>
                    </div>
                    <div class="task-flow-message-display">${escapeHtml(messageContent)}</div>
                </div>
                ${finalResultHtml}
            </div>
        `;
    }

    /**
     * Рендеринг клиентского действия
     * @param {HTMLElement} contentEl - элемент контента
     * @param {string} actionType - тип действия
     * @param {Object} data - данные
     * @param {string} executionStepHtml - HTML шага выполнения
     * @param {string} progressBarHtml - HTML прогресс бара
     * @param {string} finalResultHtml - HTML финального результата
     * @param {Object} taskFlowRef - ссылка на TaskFlow
     */
    function renderClientAction(contentEl, actionType, data, executionStepHtml, progressBarHtml, finalResultHtml, resultHtml, taskFlowRef, store) {
        const typeLabels = {
            'script': 'Script Execution',
            'rag-search': 'RAG Search',
            'read-file': 'Read File',
            'write-file': 'Write File',
            'execute-command': 'Execute Command',
            'list-directory': 'List Directory',
            'grep-search': 'Grep Search',
            'file-exists': 'File Exists',
            'edit-patch': 'Edit Patch',
            'run-script': 'Run Script'
        };
        const typeIcons = {
            'script': '⚡',
            'rag-search': '🔍',
            'read-file': '📄',
            'write-file': '✏️',
            'execute-command': '▶',
            'list-directory': '📁',
            'grep-search': '🔎',
            'file-exists': '❓',
            'edit-patch': '📋',
            'run-script': '⚡'
        };

        const actionData = data[actionType];
        const effectiveStore = store || global.SessionStore;
        const historyHtml = renderMessageHistory(contentEl, effectiveStore);
        const icon = typeIcons[actionType] || '⚙️';
        const label = typeLabels[actionType] || actionType;

        contentEl.innerHTML = `
            ${historyHtml}
            <div class="task-flow-execute-card">
                ${executionStepHtml}
                ${progressBarHtml}
                <div class="task-flow-client-action">
                    <div class="action-type"><span class="action-type-icon">${icon}</span>${escapeHtml(label)}</div>
                    <pre class="action-data">${escapeHtml(JSON.stringify(actionData, null, 2))}</pre>
                </div>
                ${finalResultHtml}
                ${resultHtml || ''}
            </div>
        `;
    }

    /**
     * Рендеринг отладочной информации
     * @param {HTMLElement} contentEl - элемент контента
     * @param {Object} data - данные
     * @param {string} executionStepHtml - HTML шага выполнения
     * @param {string} progressBarHtml - HTML прогресс бара
     * @param {string} finalResultHtml - HTML финального результата
     * @param {Object} taskFlowRef - ссылка на TaskFlow
     */
    function renderDebug(contentEl, data, executionStepHtml, progressBarHtml, finalResultHtml, resultHtml, taskFlowRef, store) {
        const ctx = data?.context ? JSON.stringify(data.context, null, 2) : '';
        const exec = data?.execute ? JSON.stringify(data.execute, null, 2) : '';
        const effectiveStore = store || global.SessionStore;

        const historyHtml = renderMessageHistory(contentEl, effectiveStore);

        contentEl.innerHTML = `
            ${historyHtml}
            <div class="task-flow-debug">
                ${executionStepHtml}
                ${progressBarHtml}
                <details>
                    <summary>Context</summary>
                    <pre>${escapeHtml(ctx)}</pre>
                </details>
                <details>
                    <summary>Execute</summary>
                    <pre>${escapeHtml(exec)}</pre>
                </details>
                ${finalResultHtml}
                ${resultHtml || ''}
            </div>
        `;
    }

    function setPanelContent(contentEl, kind, data, taskFlowRef) {
        if (!contentEl) return;
        if (kind === 'execute' && data?.execute) {
            renderExecute(contentEl, data.execute, data, null, taskFlowRef);
            return;
        }
        if (kind === 'error') {
            const msg = escapeHtml(String(data?.error || 'Error'));
            contentEl.innerHTML = `<div class="task-flow-error"><p>${msg}</p></div>`;
        }
    }

      // Export
      global.TaskFlowRender = {
          renderMessageHistory,
          renderExecute,
          renderForm,
          renderMessage,
          renderClientAction,
          renderDebug,
          renderResultBlock,
          setPanelContent
      };

})(typeof window !== 'undefined' ? window : global);
