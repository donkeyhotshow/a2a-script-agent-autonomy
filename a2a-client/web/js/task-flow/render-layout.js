/**
 * TaskFlow Layout Renderer
 */

(function (global) {
    'use strict';

    if (!global.TaskFlowRender) global.TaskFlowRender = {};
    const TFR = global.TaskFlowRender;
    const { escapeHtml, requireRenderStore, messageBodyText } = TFR;

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

    function buildWorkbenchSectionsHtml(context) {
        const sections = context?.workbench?.sections;
        if (!sections) return '';
        
        let html = '<div class="task-flow-workbench-sections">';
        for (const [sectionName, sectionData] of Object.entries(sections)) {
            if (sectionData === null || sectionData === undefined) continue;
            
            let sectionHtml = '';
            if (Array.isArray(sectionData)) {
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
                try {
                    const content = JSON.stringify(sectionData, null, 2);
                    sectionHtml = `<details><summary>${escapeHtml(String(sectionName))}</summary><pre class="task-flow-section-json">${escapeHtml(content)}</pre></details>`;
                } catch (e) {
                    sectionHtml = `<div>${escapeHtml(String(sectionName))}: ${escapeHtml(String(sectionData))}</div>`;
                }
            } else {
                sectionHtml = `<div>${escapeHtml(String(sectionName))}: ${escapeHtml(String(sectionData))}</div>`;
            }
            
            html += `<div class="task-flow-section">${sectionHtml}</div>`;
        }
        
        html += '</div>';
        return html;
    }

    function renderExecute(contentEl, execute, data, store, taskFlowRef) {
        if (!contentEl || !execute) return;

        const storeResult = requireRenderStore('renderExecute', store ?? data?.store, { data, execute });
        if (!storeResult.store) {
            contentEl.innerHTML = storeResult.error;
            return;
        }
        store = storeResult.store;

        const context = data?.context;
        const execution = context?.execution;

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

        let resultHtml = '';
        if (result && typeof result === 'object') {
            resultHtml = TFR.renderResultBlock(result);
        }

        const attHtml = TFR.renderAttachmentsBlock(execute.attachments);
        const mainText = messageBodyText(execute.message);
        const llmText = messageBodyText(execute.llmMessage);
        const hasMain = mainText.trim().length > 0;
        const hasLlm = llmText.trim().length > 0;
        const hasForm = execute.form && typeof execute.form === 'object';
        const formChoices = hasForm ? (execute.form.choices || execute.form.meta?.routerChoices) : null;
        const hasChoices = Array.isArray(formChoices) && formChoices.length > 0;
        const hasTextarea = hasForm && execute.form.textarea && typeof execute.form.textarea === 'object';
        const hasInputs = hasForm && (Array.isArray(execute.form.input) || Array.isArray(execute.form.inputs));
        const isInputForm = hasTextarea || hasInputs;

        if (hasChoices || isInputForm) {
            return TFR.renderForm(contentEl, execute.form, executionStepHtml, progressBarHtml, completionBannerHtml, resultHtml, taskFlowRef, store);
        } else if (hasMain || hasLlm || attHtml) {
            return renderWebExecuteMessage(
                contentEl, execute, { mainText, llmText, attHtml },
                executionStepHtml, progressBarHtml, completionBannerHtml, resultHtml, taskFlowRef, store
            );
        } else if (
            execute.script || execute['rag-search'] || execute['read-file'] ||
            execute['write-file'] || execute['execute-command'] || execute['list-directory'] ||
            execute['grep-search'] || execute['file-exists'] || execute['edit-patch'] || execute['run-script']
        ) {
            const actionPriority = ['script', 'rag-search', 'read-file', 'write-file', 'execute-command', 'list-directory', 'grep-search', 'file-exists', 'edit-patch', 'run-script'];
            let selectedKey = null;
            for (const key of actionPriority) {
                if (execute[key]) {
                    selectedKey = key;
                    break;
                }
            }
            if (!selectedKey) {
                const keys = Object.keys(execute);
                selectedKey = keys.length > 0 ? keys[0] : null;
            }
            return renderClientAction(contentEl, selectedKey, execute, executionStepHtml, progressBarHtml, completionBannerHtml, resultHtml, taskFlowRef, store);
        } else if (execute.debug) {
            return renderDebug(contentEl, data, executionStepHtml, progressBarHtml, completionBannerHtml, resultHtml, taskFlowRef, store);
        }
    }

    function renderWebExecuteMessage(
        contentEl, execute, texts,
        executionStepHtml, progressBarHtml, completionBannerHtml, resultHtml, taskFlowRef, store
    ) {
        const storeResult = requireRenderStore('renderWebExecuteMessage', store, { execute, texts });
        if (!storeResult.store) {
            contentEl.innerHTML = storeResult.error;
            return;
        }
        const effectiveStore = storeResult.store;
        const historyHtml = TFR.renderMessageHistory(contentEl, effectiveStore);
        const mainBlock = texts.mainText.trim().length > 0 ? `<div class="task-flow-message-display">${escapeHtml(texts.mainText)}</div>` : '';
        const llmBlock = texts.llmText.trim().length > 0 ? `<div class="task-flow-llm-message"><div class="task-flow-form-title">Model</div><div class="task-flow-message-display">${escapeHtml(texts.llmText)}</div></div>` : '';
        
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
        const historyHtml = TFR.renderMessageHistory(contentEl, effectiveStore);

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
        const storeResult = requireRenderStore('renderClientAction', store, { actionType, data });
        if (!storeResult.store) {
            contentEl.innerHTML = storeResult.error;
            return;
        }
        const effectiveStore = storeResult.store;
        const historyHtml = TFR.renderMessageHistory(contentEl, effectiveStore);
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

    function renderDebug(contentEl, data, executionStepHtml, progressBarHtml, completionBannerHtml, resultHtml, taskFlowRef, store) {
        const ctx = data?.context ? JSON.stringify(data.context, null, 2) : '';
        const exec = data?.execute ? JSON.stringify(data.execute, null, 2) : '';
        const storeResult = requireRenderStore('renderDebug', store, { data });
        if (!storeResult.store) {
            contentEl.innerHTML = storeResult.error;
            return;
        }
        const effectiveStore = storeResult.store;
        const historyHtml = TFR.renderMessageHistory(contentEl, effectiveStore);

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

    TFR.renderExecute = renderExecute;
    TFR.renderWebExecuteMessage = renderWebExecuteMessage;
    TFR.renderMessage = renderMessage;
    TFR.renderClientAction = renderClientAction;
    TFR.renderDebug = renderDebug;
    TFR.setPanelContent = setPanelContent;

})(typeof window !== 'undefined' ? window : global);
