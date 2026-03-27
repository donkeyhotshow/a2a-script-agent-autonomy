/**
 * TaskFlow Init Module
 * Функции инициализации и авто-настройки
 */

(function (global) {
    'use strict';

    // Get modules
    const Render = global.TaskFlowRender;
    const resolveStore = global.resolveStore;

    function hasPendingClientAction(execute) {
        if (!execute || typeof execute !== 'object') return false;
        const pending = execute.attachments && execute.attachments.pendingClientAction;
        if (typeof pending === 'string' && pending.trim()) return true;
        return !!(
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
        );
    }

    /**
     * Выполнить client-side action и отправить результат
     * @param {Object} TaskFlow - Main TaskFlow instance
     * @param {Object} execute - execute объект с attachments
     * @param {HTMLElement} contentEl - элемент контента для обновления
     * @returns {Promise<boolean>} true если action был выполнен
     */
    async function executeClientActionAndSubmit(TaskFlow, execute, contentEl) {
        const attachments = execute?.attachments;
        const actionType = attachments?.pendingClientAction;
        
        if (!actionType) return false;
        
        // Проверяем возможность выполнения
        if (!global.ActionExecutor?.canExecuteClientAction?.(actionType)) {
            console.warn('[TaskFlow] Cannot execute client action:', actionType);
            return false;
        }
        
        // Показываем loading
        if (contentEl) {
            const loadingEl = contentEl.querySelector('.task-flow-attachments-client-action');
            if (loadingEl) {
                loadingEl.innerHTML += ' <span class="task-flow-loading">⟳ Executing...</span>';
            }
        }
        
        // Собираем параметры в зависимости от типа action
        const params = {};
        switch (actionType) {
            case 'script':
                params.code = '() => ({ note: "Script execution requires server to pass code via different mechanism" })';
                break;
            case 'execute-command':
                params.command = attachments.shellCommand || '';
                break;
            case 'run-script':
                params.scriptId = attachments.runScriptId || '';
                break;
            case 'rag-search':
                params.query = attachments.ragQuery || '';
                break;
        }
        
        try {
            const result = await global.ActionExecutor.executeClientAction(actionType, params);
            console.log('[TaskFlow] Client action result:', result);
            
            // Обновляем UI с результатом
            if (contentEl) {
                const actionBlock = contentEl.querySelector('.task-flow-attachments-client-action');
                if (actionBlock) {
                    const resultHtml = `<pre class="task-flow-client-action-result">${escapeHtml(JSON.stringify(result, null, 2))}</pre>`;
                    actionBlock.innerHTML = resultHtml;
                }
            }
            
            // Автоматически отправляем результат обратно на сервер
            const sessionId = TaskFlow._sessionId;
            if (sessionId && global.ActionExecutor?.submit) {
                const submitResult = { message: `Client action executed: ${actionType}`, clientActionResult: result };
                await global.ActionExecutor.submit(sessionId, submitResult);
            }
            
            return true;
        } catch (err) {
            console.error('[TaskFlow] Client action error:', err);
            if (contentEl) {
                const actionBlock = contentEl.querySelector('.task-flow-attachments-client-action');
                if (actionBlock) {
                    actionBlock.innerHTML = `<div class="task-flow-error">Error: ${escapeHtml(err.message)}</div>`;
                }
            }
            return false;
        }
    }

    function getPanelsGateway() {
        return global.TaskFlowPanelGateway || null;
    }

    /**
     * Убедиться что есть выбор проекта
     * @param {Object} TaskFlow - Main TaskFlow instance
     */
    async function ensureProjectSelect(TaskFlow) {
        const sel = document.getElementById('projectSelect');
        if (!sel || sel.options.length > 1) return;

        const populator = global.AppInitialization?.populateProjectSelect;
        if (typeof populator !== 'function') {
            console.warn('[TaskFlow] AppInitialization.populateProjectSelect missing, skipping project list refresh');
            return;
        }

        try {
            const saved = await global.getCurrentProjectId?.();
            await populator.call(global.AppInitialization, sel, saved);
        } catch (e) {
            console.error('[TaskFlow] Could not load projects via AppInitialization:', e);
        }
    }

    /**
     * Восстановить выбор проекта
     * @param {Object} TaskFlow - Main TaskFlow instance
     */
    function restoreProjectSelection(TaskFlow) {
        const sel = document.getElementById('projectSelect');
        if (!sel) return;

        // Note: Project selection from app state only, no localStorage
        // Selection restored via app initialization, not browser storage
    }

    /**
     * Настроить автоматическое открытие панели
     * @param {Object} TaskFlow - Main TaskFlow instance
     */
    function setupPanelAutoOpen(TaskFlow) {
        // Check if auto-open is needed
        const panels = getPanelsGateway();
        if (!panels) return;

        // Check if panel already exists
        let panel = panels.getPanel?.('task-flow-panel');
        if (!panel) {
            // Don't auto-create, wait for user action
            return;
        }

        TaskFlow.panelId = 'task-flow-panel';
        TaskFlow.panel = panel;

        let store;
        try {
            store = resolveStore(TaskFlow._sessionId);
        } catch (e) {
            console.warn('[TaskFlow] Panel auto-open skipped (no SessionStore):', e?.message || e);
            return;
        }
        // Render only when panel is not blocked by async/wait gate.
        const contentEl = panel.getContentEl();
        if (contentEl && TaskFlow._lastResponse) {
            const st = store?.getState?.() || {};
            const waiting = global.getTaskFlowPanelViewState?.(st)?.isWaiting;
            const execute = TaskFlow._lastResponse.execute;
            const forceRenderPendingExecute =
                !!execute &&
                (global.executeHasActionableForm?.(execute) || hasPendingClientAction(execute));
            if (!waiting || forceRenderPendingExecute) {
                Render.renderExecute(contentEl, TaskFlow._lastResponse.execute, TaskFlow._lastResponse, null, TaskFlow);
                
                // Автоматически выполняем client-side actions
                const execute = TaskFlow._lastResponse.execute;
                if (execute?.attachments?.pendingClientAction) {
                    executeClientActionAndSubmit(TaskFlow, execute, contentEl).catch(err => {
                        console.error('[TaskFlow] Auto client action failed:', err);
                    });
                }
            } else {
                contentEl.innerHTML = `
                    <div class="session-content">
                        ${Render.renderMessageHistory(contentEl, store)}
                        <div class="task-flow-sending" style="margin-top:0.75rem">
                            <p class="task-flow-status">Waiting for server / LLM…</p>
                        </div>
                    </div>
                `;
            }
        }
        if (store && typeof store.on === 'function') {
            store.on('execute', (execute) => {
                if (TaskFlow.panelId) {
                    const panel = getPanelsGateway()?.getPanel?.(TaskFlow.panelId);
                    if (panel && TaskFlow._lastResponse) {
                        const content = panel.getContentEl();
                        if (content) {
                            const st = store.getState?.();
                            const response = {
                                ...TaskFlow._lastResponse,
                                execute,
                                ...(st?.context ? {context: st.context} : {})
                            };
                            TaskFlow._lastResponse = response;
                            Render.setPanelContent(content, 'execute', response, TaskFlow);
                            
                            // Автоматически выполняем client-side actions при обновлении
                            if (execute?.attachments?.pendingClientAction) {
                                executeClientActionAndSubmit(TaskFlow, execute, content).catch(err => {
                                    console.error('[TaskFlow] Auto client action on execute update failed:', err);
                                });
                            }
                        }
                    }
                }
            });
        }
    }

    /**
     * Инициализация TaskFlow
     * @param {Object} TaskFlow - Main TaskFlow instance
     */
    function init(TaskFlow) {
        const sel = document.getElementById('projectSelect');
        if (sel) {
            TaskFlow._ensureProjectSelect();
            TaskFlow._restoreProjectSelection();
        }
        TaskFlow._setupPanelAutoOpen();
        TaskFlow._setupLoaderListener();
        
        // Preload actions for router choices
        global.TaskFlowPanelGateway?.preloadActions?.();
    }

    // Export
    global.TaskFlowInit = {
        ensureProjectSelect,
        restoreProjectSelection,
        setupPanelAutoOpen,
        init,
        executeClientActionAndSubmit
    };

})(typeof window !== 'undefined' ? window : global);
