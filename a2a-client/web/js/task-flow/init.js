/**
 * TaskFlow Init Module
 * Функции инициализации и авто-настройки
 */

(function (global) {
    'use strict';

    // Get modules
    const Render = global.TaskFlowRender;
    const resolveStore = global.resolveStore;

    /**
     * Убедиться что есть выбор проекта
     * @param {Object} TaskFlow - Main TaskFlow instance
     */
    async function ensureProjectSelect(TaskFlow) {
        const sel = document.getElementById('projectSelect');
        if (!sel || sel.options.length > 1) return;

        const populator = global.AppInitialization?._populateProjectSelect;
        if (typeof populator !== 'function') {
            console.warn('[TaskFlow] AppInitialization._populateProjectSelect missing, skipping project list refresh');
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
        const pm = global.PanelManager;
        if (!pm) return;

        // Check if panel already exists
        let panel = pm.get('task-flow-panel');
        if (!panel) {
            // Don't auto-create, wait for user action
            return;
        }

        TaskFlow.panelId = 'task-flow-panel';
        TaskFlow.panel = panel;

         // Render the execute state
         const contentEl = panel.getContentEl();
         if (contentEl && TaskFlow._lastResponse) {
             Render.renderExecute(contentEl, TaskFlow._lastResponse.execute, TaskFlow._lastResponse, null, TaskFlow);
         }

        let store;
        try {
            store = resolveStore(TaskFlow._sessionId);
        } catch (e) {
            console.warn('[TaskFlow] Panel auto-open skipped (no SessionStore):', e?.message || e);
            return;
        }
        if (store && typeof store.on === 'function') {
            store.on('execute', (execute) => {
                if (TaskFlow.panelId) {
                    const pm = global.PanelManager;
                    const panel = pm?.get(TaskFlow.panelId);
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
    }

    // Export
    global.TaskFlowInit = {
        ensureProjectSelect,
        restoreProjectSelection,
        setupPanelAutoOpen,
        init
    };

})(typeof window !== 'undefined' ? window : global);
