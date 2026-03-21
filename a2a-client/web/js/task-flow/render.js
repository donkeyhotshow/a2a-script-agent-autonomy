/**
 * TaskFlow Render Module
 * Функции рендеринга UI компонентов
 */

(function (global) {
    'use strict';

    var escapeHtml = global.escapeHtml;

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
    function updateStatus(contentEl, text) {
        const status = contentEl?.querySelector('.task-flow-status');
        if (status) status.textContent = text;
    }

    /**
     * Рендеринг истории сообщений
     * @param {HTMLElement} contentEl - элемент контента
     * @param {Object} [store] - optional store (per-window); falls back to global.SessionStore
     */
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
     * @param {Object} taskFlowRef - ссылка на TaskFlow
     */
    function renderExecute(contentEl, execute, data, taskFlowRef, store) {
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

        // Build finalResult display
        let finalResultHtml = '';
        if (execution?.status === 'completed' || execute.finalResult) {
            const finalResult = execute.finalResult || {};
            const summary = finalResult.summary || {};
            const actionName = finalResult.action || execution?.action || 'unknown';

            let summaryHtml = '';
            if (typeof summary === 'object' && summary !== null) {
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

        // Route to specific renderer
        // execute.form.input + execute.message: message shown via history (set by SessionStore), input stays open
        // execute.form.choices: choice buttons
        // execute.form.input only: text input
        // execute.message only: show message + generic input to continue
        store = store || data?.store;
        if (execute.form) {
            return renderForm(contentEl, execute.form, executionStepHtml, progressBarHtml, finalResultHtml, taskFlowRef, store);
        } else if (execute.message) {
            return renderMessage(contentEl, execute.message, executionStepHtml, progressBarHtml, finalResultHtml, taskFlowRef, store);
        } else if (execute.script || execute['rag-search'] || execute['read-file'] || execute['write-file'] || execute['execute-command']) {
            return renderClientAction(contentEl, Object.keys(execute)[0], execute, executionStepHtml, progressBarHtml, finalResultHtml, taskFlowRef);
        } else if (execute.debug) {
            return renderDebug(contentEl, data, executionStepHtml, progressBarHtml, finalResultHtml, taskFlowRef);
        }
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
    function renderForm(contentEl, form, executionStepHtml, progressBarHtml, finalResultHtml, taskFlowRef, store) {
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

        const hasChoices = form?.choices?.length > 0;
        const inputField = form?.input && typeof form.input === 'object' && !Array.isArray(form.input) ? form.input : null;
        const inputFields = form?.input && Array.isArray(form.input) ? form.input : (inputField ? [inputField] : []);

        let formContent = '';

        if (hasChoices) {
            const title = form.title ? `<p class="task-flow-form-title">${escapeHtml(form.title)}</p>` : '';
            const buttons = form.choices.map((c) =>
                `<button type="button" class="task-flow-choice-btn" data-choice-id="${escapeHtml(c.id)}">${escapeHtml(c.label || c.id)}</button>`
            ).join('');
            formContent += `${title}<div class="task-flow-choices">${buttons}</div>`;
        }

        if (inputFields.length > 0) {
            const inputsHtml = inputFields.map((f) => {
                const name = f.name || 'input';
                const label = f.label ? `<label for="task-flow-input-${escapeHtml(name)}">${escapeHtml(f.label)}</label>` : '';
                const placeholder = f.placeholder || '';
                const required = f.required ? 'required' : '';
                return `<div class="task-flow-input-group">${label}<input type="text" id="task-flow-input-${escapeHtml(name)}" name="${escapeHtml(name)}" placeholder="${escapeHtml(placeholder)}" ${required} class="task-flow-input-field"></div>`;
            }).join('');
            formContent += `<div class="task-flow-input-form">${inputsHtml}<button type="button" class="task-flow-submit-btn">Submit</button></div>`;
        }

        const historyHtml = renderMessageHistory(contentEl, effectiveStore);

        contentEl.innerHTML = `
            ${historyHtml}
            <div class="task-flow-form-container">
                ${executionStepHtml}
                ${progressBarHtml}
                ${formContent}
                ${finalResultHtml}
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
                        // HIDE FORM + show loader
                        const formContainer = contentEl.querySelector('.task-flow-form-container');
                        if (formContainer) {
                            formContainer.style.display = 'none';
                        }
                        // Skip inline loader - use window-events.js spinner instead
                        taskFlowRef.sendMessageResult(val, contentEl);
                    }
                };

            submitBtn.addEventListener('click', doSubmit);
            inputEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); doSubmit(); }
            });
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
        const effectiveStore = store || global.SessionStore;
        const historyHtml = renderMessageHistory(contentEl, effectiveStore);

        contentEl.innerHTML = `
            ${historyHtml}
            <div class="task-flow-message-container">
                ${executionStepHtml}
                ${progressBarHtml}
                <div class="task-flow-message-display">
                    ${escapeHtml(messageContent)}
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
    function renderClientAction(contentEl, actionType, data, executionStepHtml, progressBarHtml, finalResultHtml, taskFlowRef, store) {
        // Client-side actions (script, rag-search, file ops, commands)
        const typeLabels = {
            'script': 'Script Execution',
            'rag-search': 'RAG Search',
            'read-file': 'Read File',
            'write-file': 'Write File',
            'execute-command': 'Execute Command'
        };

        const actionData = data[actionType];
        const effectiveStore = store || global.SessionStore;
        const historyHtml = renderMessageHistory(contentEl, effectiveStore);

        contentEl.innerHTML = `
            ${historyHtml}
            <div class="task-flow-client-action">
                ${executionStepHtml}
                ${progressBarHtml}
                <div class="action-type">${escapeHtml(typeLabels[actionType] || actionType)}</div>
                <pre class="action-data">${escapeHtml(JSON.stringify(actionData, null, 2))}</pre>
                <div class="action-status">Executing...</div>
                ${finalResultHtml}
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
    function renderDebug(contentEl, data, executionStepHtml, progressBarHtml, finalResultHtml, taskFlowRef, store) {
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
            </div>
        `;
    }

    /**
     * Привязать обработчики ввода
     * @param {HTMLElement} contentEl - элемент контента
     * @param {Object} taskFlowRef - ссылка на TaskFlow
     */
    /**
     * Установить контент панели
     * @param {HTMLElement} contentEl - элемент контента
     * @param {string} state - состояние
     * @param {Object} data - данные
     * @param {Object} taskFlowRef - ссылка на TaskFlow
     */
    function setPanelContent(contentEl, state, data, taskFlowRef) {
        if (!contentEl) return;

        switch (state) {
            case 'loading':
                // Loading state - no preloader shown
                contentEl.innerHTML = '';
                break;

            case 'error':
                contentEl.innerHTML = `
                    <div class="task-flow-error">
                        <p class="task-flow-status">Error: ${escapeHtml(data?.error || 'Unknown error')}</p>
                        <button class="task-flow-retry-btn">Retry</button>
                    </div>
                `;
                contentEl.querySelector('.task-flow-retry-btn')?.addEventListener('click', () => {
                    if (taskFlowRef?.run) {
                        taskFlowRef.run(data?.task, data?.projectId);
                    }
                });
                break;

            case 'fixated':
                contentEl.innerHTML = `
                    <div class="task-flow-fixated">
                        <p class="task-flow-status">Session: ${escapeHtml(data?.sessionId)}</p>
                    </div>
                `;
                break;

            case 'execute':
            case 'response':
                if (data?.execute) {
                    renderExecute(contentEl, data.execute, data, taskFlowRef);
                }
                break;

            default:
                contentEl.innerHTML = `
                    <div class="task-flow-empty">
                        <p class="task-flow-status">Ready</p>
                    </div>
                `;
        }
    }

    // Export
    global.TaskFlowRender = {
        escapeHtml,
        updateStatus,
        renderMessageHistory,
        renderExecute,
        renderForm,
        renderMessage,
        renderClientAction,
        renderDebug,
        setPanelContent
    };

})(typeof window !== 'undefined' ? window : global);
