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
        try {
            const list = await request('GET', '/projects');
            const projects = Array.isArray(list) ? list : (list?.projects ?? list?.data);
            if (!Array.isArray(projects)) {
                throw new Error('[TaskFlow] GET /projects: expected array or projects/data array');
            }
            projects.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.name || p.id;
                sel.appendChild(opt);
            });
        } catch (e) {
            console.error('[TaskFlow] Could not load projects:', e);
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

        // Listen for changes - no persistence needed (server-side)
        sel.addEventListener('change', () => {
            // Project change handled via app state, not localStorage
        });
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
            Render.setPanelContent(contentEl, 'execute', TaskFlow._lastResponse, TaskFlow);
        }

        // Integrate with SessionStore events (replaces SessionManager events)
        const store = resolveStore(TaskFlow._sessionId);
        if (store && typeof store.on === 'function') {
            store.on('execute', (execute) => {
                if (TaskFlow.panelId) {
                    const pm = global.PanelManager;
                    const panel = pm?.get(TaskFlow.panelId);
                    if (panel && TaskFlow._lastResponse) {
                        const content = panel.getContentEl();
                        if (content) {
                            // Merge any finalResult from execute
                            const response = {
                                ...TaskFlow._lastResponse,
                                execute
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
