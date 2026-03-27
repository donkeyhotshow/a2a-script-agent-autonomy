/**
 * TaskFlow Render Module
 * Функции рендеринга UI компонентов
 */

 (function (global) {
     'use strict';

    const escapeHtml = global.escapeHtml;

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

    function buildRenderErrorHtml(message) {
        return `<div class="task-flow-history-error">${escapeHtml(message)}</div>`;
    }

    function handleRenderError(action, message, details) {
        const errMsg = `[TaskFlowRender] ${message}`;
        console.error(errMsg, details);
        const err = new Error(errMsg);
        global.ErrorHandler?.handle?.(err, { action, ...details });
        return buildRenderErrorHtml(errMsg);
    }

    function requireRenderStore(action, storeCandidate, context = {}) {
        const resolved = storeCandidate ?? context.store ?? global.SessionStore;
        if (resolved) {
            return { store: resolved };
        }
        return { error: handleRenderError(action, 'Session store is required', context) };
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

    /** Рендеринг workbench.sections */
    function buildWorkbenchSectionsHtml(context) {
        const sections = context?.workbench?.sections;
        if (!sections) return '';

        // Отобразить секции как структурированные данные
        let html = '<div class="task-flow-workbench-sections">';
        
        // Отображаем каждую секцию
        for (const [sectionName, sectionData] of Object.entries(sections)) {
            if (sectionData === null || sectionData === undefined) continue;
            
            let sectionHtml = '';
            if (Array.isArray(sectionData)) {
                // Для массивов показываем как список
                sectionHtml = `<ul class="task-flow-section-list">${sectionData.map(item => {
                    if (typeof item === 'object' && item !== null) {
                        try {
                            const content = JSON.stringify(item, null, 2);
                            return `<li><details><summary>${escapeHtml(String(sectionName))} item</summary><pre class="task-flow-section-json">${escapeHtml(content)}</pre></details></li>`;
                        } catch (e) {
                            return `<li>${escapeHtml(String(sectionName))}: ${escapeHtml(String(item))}</li>`;
                        }
                    } else {
                        return `<li>${escapeHtml(String(item))}</li>`;
                    }
                }).join('')}</ul>`;
            } else if (typeof sectionData === 'object' && sectionData !== null) {
                // Для объектов показываем как JSON
                try {
                    const content = JSON.stringify(sectionData, null, 2);
                    sectionHtml = `<details><summary>${escapeHtml(String(sectionName))}</summary><pre class="task-flow-section-json">${escapeHtml(content)}</pre></details>`;
                } catch (e) {
                    sectionHtml = `<div>${escapeHtml(String(sectionName))}: ${escapeHtml(String(sectionData))}</div>`;
                }
            } else {
                // Для примитивных значений
                sectionHtml = `<div>${escapeHtml(String(sectionName))}: ${escapeHtml(String(sectionData))}</div>`;
            }
            
            html += `<div class="task-flow-section">${sectionHtml}</div>`;
        }
        
        html += '</div>';
        return html;
    }

    function renderMessageHistory(contentEl, store) {
        const { store: sessionStore, error: storeError } = requireRenderStore('renderMessageHistory', store, { contentEl });
        if (!sessionStore) {
            return storeError;
        }

        const state = sessionStore.getState?.();
        if (!state || typeof state !== 'object') {
            return handleRenderError('renderMessageHistory', 'Session store state is invalid', {
                store: sessionStore,
                state
            });
        }

        const messagesSource = state.messages ?? sessionStore.messages;
        if (!Array.isArray(messagesSource)) {
            return handleRenderError('renderMessageHistory', 'Session history payload is malformed', {
                state,
                rawMessages: messagesSource
            });
        }

        const banner = renderDialogErrorBanner(state.lastError);
        const visible = messagesSource.filter((msg) => !isSystemErrorChatMessage(msg));

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

        const storeResult = requireRenderStore('renderExecute', store ?? data?.store, {
            data,
            execute
        });
        if (!storeResult.store) {
            contentEl.innerHTML = storeResult.error;
            return;
        }
        store = storeResult.store;

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
        const workbenchSectionsHtml = buildWorkbenchSectionsHtml(context);
        executionStepHtml = executionStepHtml + interruptTraceHtml + workbenchSectionsHtml;

        const result = data?.result;
        const protocolCompleted =
            execution?.status === 'completed' ||
            execute?.completed === true ||
            (result && typeof result === 'object' && result.completed === true);

        // Completion banner: use execution + top-level result only
        let completionBannerHtml = '';
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

            completionBannerHtml = `
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
        // Canonical dialog contract: execute.form.textarea + execute.message (message shown via history, input stays open)
        // execute.form.choices: choice buttons
        // execute.message (+ optional llmMessage, attachments): Client API sanitizes rag-search/read-file into these
        // Logic:
        // - If form.choices exists → always show choice form (user needs to select option)
        // - If form.textarea/input[] exists → always show input form (user needs to enter data)
        // - If only message → show message (response from LLM, no input needed)
        const attHtml = renderAttachmentsBlock(execute.attachments);
        const mainText = messageBodyText(execute.message);
        const llmText = messageBodyText(execute.llmMessage);
        const hasMain = mainText.trim().length > 0;
        const hasLlm = llmText.trim().length > 0;
        const hasMessage = hasMain || hasLlm;
        const hasForm = execute.form && typeof execute.form === 'object';

        // Check what type of form we have
        const formChoices = hasForm ? (execute.form.choices || execute.form.meta?.routerChoices) : null;
        const hasChoices = Array.isArray(formChoices) && formChoices.length > 0;
        const hasTextarea = hasForm && execute.form.textarea && typeof execute.form.textarea === 'object';
        const hasInputs = hasForm && (Array.isArray(execute.form.input) || Array.isArray(execute.form.inputs));
        const isInputForm = hasTextarea || hasInputs;

        // Form should show when:
        // - choices exist (user must select option)
        // - input form exists (user must enter data)
        if (hasChoices || isInputForm) {
            return renderForm(contentEl, execute.form, executionStepHtml, progressBarHtml, completionBannerHtml, resultHtml, taskFlowRef, store);
        }
        // Message: show when there's actual message content (response from LLM)
        else if (hasMain || hasLlm || attHtml) {
            return renderWebExecuteMessage(
                contentEl,
                execute,
                { mainText, llmText, attHtml },
                executionStepHtml,
                progressBarHtml,
                completionBannerHtml,
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
            return renderClientAction(contentEl, selectedKey, execute, executionStepHtml, progressBarHtml, completionBannerHtml, resultHtml, taskFlowRef);
        } else if (execute.debug) {
            return renderDebug(contentEl, data, executionStepHtml, progressBarHtml, completionBannerHtml, resultHtml, taskFlowRef);
        }
    }

    function messageBodyText(message) {
        if (message == null) return '';
        if (typeof message === 'string') return message;
        return message.content || message.text || '';
    }

    /**
     * Render attachments block with pending client action handling
     * @param {Object} attachments - execute attachments
     * @returns {string} HTML string
     */
    function renderAttachmentsBlock(attachments) {
        if (!attachments || typeof attachments !== 'object') return '';
        const parts = [];
        
        // Проверяем pendingClientAction для выполнения на клиенте
        const pendingAction = attachments.pendingClientAction;
        if (pendingAction) {
            parts.push(
                `<div class="task-flow-attachments-client-action" data-action="${escapeHtml(pendingAction)}">` +
                `<span class="task-flow-attachments-title">Client Action</span> ` +
                `<span class="task-flow-attachments-value">${escapeHtml(pendingAction)}</span>` +
                `</div>`
            );
        }

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
        completionBannerHtml,
        resultHtml,
        taskFlowRef,
        store
    ) {
        const storeResult = requireRenderStore('renderWebExecuteMessage', store, {
            execute,
            texts
        });
        if (!storeResult.store) {
            contentEl.innerHTML = storeResult.error;
            return;
        }
        const effectiveStore = storeResult.store;
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
                ${completionBannerHtml}
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
     * @param {string} completionBannerHtml - HTML финального результата
     * @param {Object} taskFlowRef - ссылка на TaskFlow
     */
    function renderForm(contentEl, form, executionStepHtml, progressBarHtml, completionBannerHtml, resultHtml, taskFlowRef, store) {
        const storeResult = requireRenderStore('renderForm', store, { form });
        if (!storeResult.store) {
            contentEl.innerHTML = storeResult.error;
            return;
        }
        const effectiveStore = storeResult.store;

        // Check if promise is pending - if so, hide form and show loader instead
        const storeState = effectiveStore.getState?.();
        if (!storeState || typeof storeState !== 'object') {
            const errMsg = '[TaskFlowRender] Invalid store state when rendering form';
            console.error(errMsg, storeState);
            const historyHtml = renderMessageHistory(contentEl, effectiveStore);
            contentEl.innerHTML = `${historyHtml}<div class="task-flow-history-error">${escapeHtml(errMsg)}</div>`;
            return;
        }

        if (global.getTaskFlowPanelViewState?.(storeState)?.isWaiting) {
            const historyHtml = renderMessageHistory(contentEl, effectiveStore);
            contentEl.innerHTML = historyHtml;
            // Skip inline loader - use window-events.js spinner instead
            return;
        }

        if (!form || typeof form !== 'object') {
            const errMsg = '[TaskFlowRender] Form payload is missing or invalid';
            console.error(errMsg, form);
            const historyHtml = renderMessageHistory(contentEl, effectiveStore);
            contentEl.innerHTML = `${historyHtml}<div class="task-flow-history-error">${escapeHtml(errMsg)}</div>`;
            return;
        }

        const rawChoices = form?.choices ?? form?.meta?.routerChoices;
        let choices = null;
        if (rawChoices != null) {
            if (!Array.isArray(rawChoices)) {
                const errMsg = '[TaskFlowRender] Form choices must be an array';
                console.error(errMsg, rawChoices);
                const historyHtml = renderMessageHistory(contentEl, effectiveStore);
                contentEl.innerHTML = `${historyHtml}<div class="task-flow-history-error">${escapeHtml(errMsg)}</div>`;
                return;
            }
            choices = rawChoices;
        }
        const hasChoices = Boolean(choices && choices.length > 0);
        // Canonical dialog schema: form.textarea; protocol also allows form.input[] or form.inputs[]
        let inputFields = [];
        if (form && typeof form === 'object') {
            // Support form.textarea (single textarea)
            if (form.textarea && typeof form.textarea === 'object' && form.textarea.name) {
                inputFields = [form.textarea];
            } 
            // Support form.input (array of inputs)
            else if (Array.isArray(form.input) && form.input.length > 0) {
                inputFields = form.input;
            }
            // Support form.inputs (array of inputs, alternative name)
            else if (Array.isArray(form.inputs) && form.inputs.length > 0) {
                inputFields = form.inputs;
            }
        }

        // Render input field based on type
        function renderInputField(f) {
            const name = f.name || 'input';
            const label = f.label ? `<label for="task-flow-input-${escapeHtml(name)}" class="task-flow-field-label">${escapeHtml(f.label)}</label>` : '';
            const placeholder = f.placeholder || '';
            const required = f.required ? 'required' : '';
            const disabled = f.disabled ? 'disabled' : '';
            const defaultValue = f.default !== undefined ? `value="${escapeHtml(String(f.default))}"` : '';
            const type = f.type || 'text';
            const id = `task-flow-input-${escapeHtml(name)}`;
            const cssClass = f.className ? ` ${f.className}` : '';
            
            // Handle dependencies - show/hide based on another field's value
            const dependency = f.dependsOn ? `data-depends-on="${escapeHtml(f.dependsOn.field)}" data-depends-value="${escapeHtml(f.dependsOn.value)}" data-depends-action="${escapeHtml(f.dependsOn.action || 'show')}"` : '';
            
            // Handle textarea type
            if (type === 'textarea' || name === 'message' || name === 'description' || name === 'content') {
                const rows = f.rows || 4;
                return `<div class="task-flow-input-group task-flow-input-group-${escapeHtml(type)}" ${dependency}>${label}<textarea id="${id}" name="${escapeHtml(name)}" placeholder="${escapeHtml(placeholder)}" ${required} ${disabled} class="task-flow-input-field task-flow-textarea${cssClass}" autocomplete="off" rows="${rows}">${defaultValue.replace(/value="(.+)"/, '$1')}</textarea></div>`;
            }
            
            // Handle select type
            if (type === 'select' && f.options) {
                const options = f.options.map(opt => {
                    const optValue = typeof opt === 'string' ? opt : (opt.value || opt.id || '');
                    const optLabel = typeof opt === 'string' ? opt : (opt.label || optValue);
                    const selected = f.default !== undefined && String(f.default) === String(optValue) ? 'selected' : '';
                    return `<option value="${escapeHtml(optValue)}" ${selected}>${escapeHtml(optLabel)}</option>`;
                }).join('');
                return `<div class="task-flow-input-group task-flow-input-group-select" ${dependency}>${label}<select id="${id}" name="${escapeHtml(name)}" ${required} ${disabled} class="task-flow-input-field task-flow-select${cssClass}">${options}</select></div>`;
            }
            
            // Handle checkbox type
            if (type === 'checkbox') {
                const checked = f.default === true || f.default === 'true' || f.default === 'checked' ? 'checked' : '';
                return `<div class="task-flow-input-group task-flow-input-group-checkbox" ${dependency}>
                    <label class="task-flow-checkbox-label" for="${id}">
                        <input type="checkbox" id="${id}" name="${escapeHtml(name)}" ${checked} ${disabled} class="task-flow-input-field task-flow-checkbox${cssClass}">
                        <span class="task-flow-checkbox-text">${escapeHtml(f.label || '')}</span>
                    </label>
                </div>`;
            }
            
            // Handle radio type
            if (type === 'radio' && f.radioOptions) {
                const radios = f.radioOptions.map(opt => {
                    const optValue = typeof opt === 'string' ? opt : (opt.value || opt.id || '');
                    const optLabel = typeof opt === 'string' ? opt : (opt.label || optValue);
                    const checked = f.default !== undefined && String(f.default) === String(optValue) ? 'checked' : '';
                    const radioId = `${id}-${escapeHtml(optValue)}`;
                    return `<label class="task-flow-radio-label" for="${radioId}">
                        <input type="radio" id="${radioId}" name="${escapeHtml(name)}" value="${escapeHtml(optValue)}" ${checked} ${disabled} class="task-flow-input-field task-flow-radio${cssClass}">
                        <span class="task-flow-radio-text">${escapeHtml(optLabel)}</span>
                    </label>`;
                }).join('');
                return `<div class="task-flow-input-group task-flow-input-group-radio" ${dependency}>${label}<div class="task-flow-radio-group">${radios}</div></div>`;
            }
            
            // Handle number type with min/max/step
            if (type === 'number') {
                const min = f.min !== undefined ? `min="${f.min}"` : '';
                const max = f.max !== undefined ? `max="${f.max}"` : '';
                const step = f.step !== undefined ? `step="${f.step}"` : '';
                return `<div class="task-flow-input-group task-flow-input-group-number" ${dependency}>${label}<input type="number" id="${id}" name="${escapeHtml(name)}" placeholder="${escapeHtml(placeholder)}" ${defaultValue} ${required} ${disabled} class="task-flow-input-field task-flow-number${cssClass}" ${min} ${max} ${step} autocomplete="off"></div>`;
            }
            
            // Handle email type
            if (type === 'email') {
                return `<div class="task-flow-input-group task-flow-input-group-email" ${dependency}>${label}<input type="email" id="${id}" name="${escapeHtml(name)}" placeholder="${escapeHtml(placeholder)}" ${defaultValue} ${required} ${disabled} class="task-flow-input-field task-flow-email${cssClass}" autocomplete="off"></div>`;
            }
            
            // Handle password type
            if (type === 'password') {
                return `<div class="task-flow-input-group task-flow-input-group-password" ${dependency}>${label}<input type="password" id="${id}" name="${escapeHtml(name)}" placeholder="${escapeHtml(placeholder)}" ${defaultValue} ${required} ${disabled} class="task-flow-input-field task-flow-password${cssClass}" autocomplete="off"></div>`;
            }
            
            // Handle date type
            if (type === 'date') {
                return `<div class="task-flow-input-group task-flow-input-group-date" ${dependency}>${label}<input type="date" id="${id}" name="${escapeHtml(name)}" ${defaultValue} ${required} ${disabled} class="task-flow-input-field task-flow-date${cssClass}" autocomplete="off"></div>`;
            }
            
            // Handle time type
            if (type === 'time') {
                return `<div class="task-flow-input-group task-flow-input-group-time" ${dependency}>${label}<input type="time" id="${id}" name="${escapeHtml(name)}" ${defaultValue} ${required} ${disabled} class="task-flow-input-field task-flow-time${cssClass}" autocomplete="off"></div>`;
            }
            
            // Handle url type
            if (type === 'url') {
                return `<div class="task-flow-input-group task-flow-input-group-url" ${dependency}>${label}<input type="url" id="${id}" name="${escapeHtml(name)}" placeholder="${escapeHtml(placeholder)}" ${defaultValue} ${required} ${disabled} class="task-flow-input-field task-flow-url${cssClass}" autocomplete="off"></div>`;
            }
            
            // Handle range type
            if (type === 'range') {
                const min = f.min !== undefined ? f.min : 0;
                const max = f.max !== undefined ? f.max : 100;
                const step = f.step !== undefined ? f.step : 1;
                const displayValue = f.default !== undefined ? f.default : min;
                return `<div class="task-flow-input-group task-flow-input-group-range" ${dependency}>${label}
                    <input type="range" id="${id}" name="${escapeHtml(name)}" ${defaultValue} ${disabled} class="task-flow-input-field task-flow-range${cssClass}" min="${min}" max="${max}" step="${step}">
                    <span class="task-flow-range-value">${displayValue}</span>
                </div>`;
            }
            
            // Default to text input
            return `<div class="task-flow-input-group task-flow-input-group-text" ${dependency}>${label}<input type="${escapeHtml(type)}" id="${id}" name="${escapeHtml(name)}" placeholder="${escapeHtml(placeholder)}" ${defaultValue} ${required} ${disabled} class="task-flow-input-field task-flow-text${cssClass}" autocomplete="off"></div>`;
        }

        let formContent = '';

        const formIcon = hasChoices ? '☰' : (inputFields.length > 0 ? '✏️' : '⚙️');
        const formTitle = form.title || (hasChoices ? 'Choose an option' : 'Enter details');
        const formDescription = form.description ? `<div class="task-flow-form-description">${escapeHtml(form.description)}</div>` : '';
        const formErrors = `<div class="task-flow-form-errors" style="display: none;"></div>`;

        if (hasChoices) {
            // Group choices by type (category)
            const choiceGroups = {};
            choices.forEach(c => {
                const type = c.type || 'default';
                if (!choiceGroups[type]) {
                    choiceGroups[type] = [];
                }
                choiceGroups[type].push(c);
            });
            
            // Render grouped choices with category labels
            const typeLabels = {
                'dialog': '💬 Діалог',
                'agent': '🔧 Агент',
                'decomposition': '📋 Декомпозиція',
                'yaml': '⚡ Скрипт',
                'md': '📝 Документ',
                'auto-ai': '🤖 Auto-AI',
                'default': '📌 Інше'
            };
            
            const groupKeys = Object.keys(choiceGroups);
            const isGrouped = groupKeys.length > 1;
            
            const buttons = choices.map((c, i) => {
                // Support metadata: description, icon, image, type
                const description = c.description ? `<div class="task-flow-choice-description">${escapeHtml(c.description)}</div>` : '';
                const icon = c.icon || c.image ? `<span class="task-flow-choice-media">${c.icon ? `<span class="task-flow-choice-icon">${c.icon}</span>` : c.image ? `<img class="task-flow-choice-image" src="${escapeHtml(c.image)}" alt="">` : ''}</span>` : '';
                
                // Show type badge for categorized choices
                const typeBadge = c.type && typeLabels[c.type] 
                    ? `<span class="task-flow-choice-type-badge">${typeLabels[c.type]}</span>` 
                    : '';
                
                return `<button type="button" class="task-flow-choice-btn" data-choice-id="${escapeHtml(c.id)}">
                    ${icon}
                    <span class="task-flow-choice-content">
                        <span class="task-flow-choice-index">${i + 1}</span>
                        <span class="task-flow-choice-label">${escapeHtml(c.label || c.id)}</span>
                        ${description}
                        ${typeBadge}
                    </span>
                    <span class="task-flow-choice-arrow">›</span>
                </button>`;
            }).join('');
            formContent += `<div class="task-flow-choices">${buttons}</div>`;
        }

        if (inputFields.length > 0) {
            const inputsHtml = inputFields.map(renderInputField).join('');
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
                    ${formDescription}
                    ${formErrors}
                    ${formContent}
                </div>
                ${completionBannerHtml}
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
        if (submitBtn && taskFlowRef?.sendMessageResult) {
            const doSubmit = () => {
                // Collect all form data
                const formData = {};
                let hasErrors = false;
                const errorMessages = [];
                
                // Get all input fields in the form
                const allInputs = contentEl.querySelectorAll('.task-flow-input-field');
                allInputs.forEach(field => {
                    const name = field.name;
                    let value;
                    
                    // Handle different input types
                    if (field.type === 'checkbox') {
                        value = field.checked;
                    } else if (field.type === 'radio') {
                        if (field.checked) {
                            value = field.value;
                        }
                    } else {
                        value = field.value;
                    }
                    
                    // Validate required fields
                    const fieldGroup = field.closest('.task-flow-input-group');
                    const isRequired = fieldGroup?.querySelector('[required]') || field.hasAttribute('required');
                    
                    if (isRequired && !value && field.type !== 'radio') {
                        hasErrors = true;
                        fieldGroup?.classList.add('task-flow-input-error');
                        errorMessages.push(`${field.name} is required`);
                    } else {
                        fieldGroup?.classList.remove('task-flow-input-error');
                    }
                    
                    // Validate email
                    if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                        hasErrors = true;
                        fieldGroup?.classList.add('task-flow-input-error');
                        errorMessages.push(`${field.name} must be a valid email`);
                    }
                    
                    // Validate number
                    if (field.type === 'number' && value) {
                        const num = parseFloat(value);
                        if (isNaN(num)) {
                            hasErrors = true;
                            fieldGroup?.classList.add('task-flow-input-error');
                            errorMessages.push(`${field.name} must be a number`);
                        }
                        if (field.hasAttribute('min') && num < parseFloat(field.getAttribute('min'))) {
                            hasErrors = true;
                            fieldGroup?.classList.add('task-flow-input-error');
                            errorMessages.push(`${field.name} must be at least ${field.getAttribute('min')}`);
                        }
                        if (field.hasAttribute('max') && num > parseFloat(field.getAttribute('max'))) {
                            hasErrors = true;
                            fieldGroup?.classList.add('task-flow-input-error');
                            errorMessages.push(`${field.name} must be at most ${field.getAttribute('max')}`);
                        }
                    }
                    
                    if (name && value !== undefined) {
                        formData[name] = value;
                    }
                });
                
                // Show validation errors
                if (hasErrors) {
                    const errorContainer = contentEl.querySelector('.task-flow-form-errors');
                    if (errorContainer) {
                        errorContainer.innerHTML = errorMessages.map(msg => `<div class="task-flow-error-message">${escapeHtml(msg)}</div>`).join('');
                        errorContainer.style.display = 'block';
                    }
                    return;
                }
                
                // Hide errors if validation passed
                const errorContainer = contentEl.querySelector('.task-flow-form-errors');
                if (errorContainer) {
                    errorContainer.style.display = 'none';
                }
                
                // For single input, use simple string; for multiple inputs, use object
                const keys = Object.keys(formData);
                let result;
                if (keys.length === 1) {
                    result = formData[keys[0]];
                    if (typeof result === 'string') {
                        result = result.trim();
                    }
                } else {
                    // Trim string values
                    keys.forEach(key => {
                        if (typeof formData[key] === 'string') {
                            formData[key] = formData[key].trim();
                        }
                    });
                    result = formData;
                }
                
                if (result) {
                    const card = contentEl.querySelector('.task-flow-execute-card');
                    if (card) card.style.display = 'none';
                    taskFlowRef.sendMessageResult(result, contentEl);
                }
            };

            submitBtn.addEventListener('click', doSubmit);
            
            // Add enter key handling for text inputs (not textarea with shift+enter)
            contentEl.querySelectorAll('.task-flow-input-field').forEach(field => {
                field.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey && field.type !== 'textarea') { 
                        e.preventDefault(); 
                        doSubmit(); 
                    }
                });
            });
            
            // Setup dependency handling for conditional fields
            setupFieldDependencies(contentEl);
            
            // autofocus first input
            if (inputEl) {
                setTimeout(() => inputEl.focus(), 50);
            }
        }
        
        // Handle range input display value
        contentEl.querySelectorAll('.task-flow-range').forEach(range => {
            range.addEventListener('input', (e) => {
                const valueSpan = e.target.closest('.task-flow-input-group').querySelector('.task-flow-range-value');
                if (valueSpan) {
                    valueSpan.textContent = e.target.value;
                }
            });
        });
    }
    
    /**
     * Setup field dependencies - show/hide based on other field values
     */
    function setupFieldDependencies(contentEl) {
        const dependentFields = contentEl.querySelectorAll('[data-depends-on]');
        
        dependentFields.forEach(field => {
            const dependsOnField = field.getAttribute('data-depends-on');
            const dependsOnValue = field.getAttribute('data-depends-value');
            const dependsOnAction = field.getAttribute('data-depends-action');
            const triggerField = contentEl.querySelector(`[name="${dependsOnField}"]`);
            
            if (triggerField) {
                const updateVisibility = () => {
                    let shouldShow = false;
                    
                    if (triggerField.type === 'checkbox') {
                        shouldShow = triggerField.checked === (dependsOnValue === 'true' || dependsOnValue === true);
                    } else if (triggerField.type === 'radio') {
                        shouldShow = triggerField.checked && triggerField.value === dependsOnValue;
                    } else {
                        shouldShow = triggerField.value === dependsOnValue;
                    }
                    
                    if (dependsOnAction === 'hide') {
                        shouldShow = !shouldShow;
                    }
                    
                    const group = field.closest('.task-flow-input-group');
                    if (group) {
                        group.style.display = shouldShow ? '' : 'none';
                        // Disable hidden fields to exclude from submission
                        if (!shouldShow) {
                            field.disabled = true;
                        } else {
                            field.disabled = field.hasAttribute('data-original-disabled') ? true : false;
                        }
                    }
                };
                
                // Store original disabled state
                if (field.hasAttribute('disabled')) {
                    field.setAttribute('data-original-disabled', 'true');
                }
                
                triggerField.addEventListener('change', updateVisibility);
                triggerField.addEventListener('input', updateVisibility);
                updateVisibility(); // Initial state
            }
        });
    }
    

    /**
     * Рендеринг сообщения
     * @param {HTMLElement} contentEl - элемент контента
     * @param {Object} message - сообщение
     * @param {string} executionStepHtml - HTML шага выполнения
     * @param {string} progressBarHtml - HTML прогресс бара
     * @param {string} completionBannerHtml - HTML финального результата
     * @param {Object} taskFlowRef - ссылка на TaskFlow
     */
    function renderMessage(contentEl, message, executionStepHtml, progressBarHtml, completionBannerHtml, taskFlowRef, store) {
        const messageContent = typeof message === 'string' ? message : (message.content || message.text || '');
        const messageType = typeof message === 'object' ? (message.type || 'info') : 'info';
        const typeIcons = { success: '✓', error: '⚠', warning: '⚠', info: 'ℹ' };
        const icon = typeIcons[messageType] || 'ℹ';
        const storeResult = requireRenderStore('renderMessage', store, { message });
        if (!storeResult.store) {
            contentEl.innerHTML = storeResult.error;
            return;
        }
        const effectiveStore = storeResult.store;
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
                ${completionBannerHtml}
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
     * @param {string} completionBannerHtml - HTML финального результата
     * @param {Object} taskFlowRef - ссылка на TaskFlow
     */
    function renderClientAction(contentEl, actionType, data, executionStepHtml, progressBarHtml, completionBannerHtml, resultHtml, taskFlowRef, store) {
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
        const storeResult = requireRenderStore('renderClientAction', store, {
            actionType,
            data
        });
        if (!storeResult.store) {
            contentEl.innerHTML = storeResult.error;
            return;
        }
        const effectiveStore = storeResult.store;
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
                ${completionBannerHtml}
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
     * @param {string} completionBannerHtml - HTML финального результата
     * @param {Object} taskFlowRef - ссылка на TaskFlow
     */
    function renderDebug(contentEl, data, executionStepHtml, progressBarHtml, completionBannerHtml, resultHtml, taskFlowRef, store) {
        const ctx = data?.context ? JSON.stringify(data.context, null, 2) : '';
        const exec = data?.execute ? JSON.stringify(data.execute, null, 2) : '';
        const storeResult = requireRenderStore('renderDebug', store, { data });
        if (!storeResult.store) {
            contentEl.innerHTML = storeResult.error;
            return;
        }
        const effectiveStore = storeResult.store;

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
                ${completionBannerHtml}
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
