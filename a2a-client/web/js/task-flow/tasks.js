/**
 * TaskFlow Tasks Module
 * Выполнение задач и управление сессиями
 */

(function (global) {
    'use strict';

    // Get modules
    const API = global.TaskFlowAPI;
    const Render = global.TaskFlowRender;
    const request = API?.request;
    const setPanelContent = Render?.setPanelContent;
    const updateStatus = Render?.updateStatus;
    const resolveStore = global.resolveStore;
    const showLoader = global.TaskFlowLoader?.showLoader;
    const hideLoader = global.TaskFlowLoader?.hideLoader;
    const setupLoaderListener = global.TaskFlowLoader?.setupLoaderListener;

    /**
     * Ожидать первый ответ от сервера
     * @param {number} timeoutMs - таймаут в мс
     * @param {Object|null} store - SessionStore instance
     */
    function waitForFirstResponse(timeoutMs = 120000, store = resolveStore()) {
        return new Promise((resolve, reject) => {
            if (!store) {
                reject(new Error('SessionStore not available'));
                return;
            }

            let resolved = false;

            // Handler for execute received (emit passes the execute object; callers expect { execute })
            const unsubscribe = store.on('execute', (execute) => {
                if (resolved) return;
                resolved = true;
                unsubscribe();
                errorUnsub();
                resolve({ execute });
            });

            // Also listen for error
            const errorUnsub = store.on('error', (error) => {
                if (resolved) return;
                resolved = true;
                unsubscribe();
                errorUnsub();
                reject(error);
            });

            // Timeout
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    unsubscribe();
                    errorUnsub();
                    reject(new Error('Timeout waiting for response'));
                }
            }, timeoutMs);
        });
    }

    /**
     * Применить ответ execute к представлению
     * @param {Object} resultData - данные результата
     * @param {HTMLElement} contentEl - элемент контента
     * @param {string} stateName - название состояния
     */
    function applyExecuteResponse(resultData, contentEl, stateName = 'response') {
        const TaskFlow = global.TaskFlow;
        const sessionId = TaskFlow._sessionId;
        const projectId = TaskFlow._projectId;
        const ctx = resultData?.context ?? resultData?.data?.context;
        const exec = resultData?.execute ?? resultData?.data?.execute;
        const responseData = { context: ctx, execute: exec, sessionId, projectId };
        TaskFlow._lastResponse = responseData;

        if (contentEl && exec) {
            Render.renderExecute(contentEl, exec, responseData, TaskFlow);
        }
    }

    /**
     * Запустить задачу
     * @param {Object} TaskFlow - Main TaskFlow instance
     * @param {string} task - текст задачи
     * @param {string} projectId - ID проекта
     */
    async function run(TaskFlow, task, projectId) {
        TaskFlow._sessionId = null;
        TaskFlow._projectId = projectId;

        // Note: No localStorage persistence - server handles session state

        // Update the select if it exists
        const sel = document.getElementById('projectSelect');
        if (sel && sel.value !== projectId) {
            sel.value = projectId;
        }

        // Use SessionStore instead of legacy SessionViewModel
        const store = resolveStore(TaskFlow._sessionId);
        console.log('[TaskFlow] Before reset, store messages:', store?.messages?.length, store?.getState?.()?.messages?.length);
        store?.reset();
        console.log('[TaskFlow] After reset, store messages:', store?.messages?.length, store?.getState?.()?.messages?.length);

        // Check if task panel already exists
        const pm = global.PanelManager;
        if (TaskFlow.panelId && pm?.get(TaskFlow.panelId)) {
            pm.bringToFront(TaskFlow.panelId);
            const panel = pm.get(TaskFlow.panelId);
            if (panel) {
                TaskFlow.panel = panel;
                const content = panel.getContentEl();
                if (content) {
                    setPanelContent(content, 'loading', { task, projectId }, TaskFlow);
                }
            }
        } else {
            // Create task panel using PanelManager
            const contentHTML = '<div class="task-flow-preloader"><div class="task-flow-spinner"></div><p>Creating session…</p></div>';
            TaskFlow.panel = pm?.open('task', {
                title: 'Task Flow',
                content: contentHTML,
                fixed: TaskFlow.fixed
            });

            if (TaskFlow.panel) {
                TaskFlow.fixed = false;
                const content = TaskFlow.panel.getContentEl();
                doRun(TaskFlow, task, projectId, content);
            } else {
                // Fallback: manual DOM creation if PanelManager not available
                const el = document.createElement('div');
                el.className = 'task-flow-panel-fallback';
                el.innerHTML = `
                    <div class="task-flow-header">
                        <h3>Task Flow</h3>
                        <button class="task-flow-close">×</button>
                    </div>
                    <div class="task-flow-content"></div>
                `;
                document.body.appendChild(el);
                const content = el.querySelector('.task-flow-content');
                setPanelContent(content, 'loading', null, TaskFlow);
                el.querySelector('.task-flow-close')?.addEventListener('click', () => el.remove());
                doRun(TaskFlow, task, projectId, content);
            }
        }
    }

    /**
     * Выполнить запуск задачи
     * @param {Object} TaskFlow - Main TaskFlow instance
     * @param {string} task - текст задачи
     * @param {string} projectId - ID проекта
     * @param {HTMLElement} contentEl - элемент контента
     */
    async function doRun(TaskFlow, task, projectId, contentEl) {
        if (!contentEl) return;

        try {
            // New protocol: send task directly in session creation
            const sessionRes = await request('POST', '/sessions', { projectId, task, title: task.slice(0, 50) });

            // Vite: { success, session }; SDK: { success, data }; legacy: flat
            const sessionData = sessionRes?.session || sessionRes?.data || sessionRes;
            const sessionId = sessionData?.id || sessionData?.sessionId;
            const serverResponse = sessionRes?.serverResponse;

            if (!sessionId) {
                throw new Error('No session ID returned');
            }

            TaskFlow._sessionId = sessionId;

            // Setup loader listener for this specific session store
            setupLoaderListener?.(TaskFlow, sessionId);

            // Initialize SessionStore for this session and start loader immediately
            const store = resolveStore(sessionId);
            console.log('[TaskFlow] _doRun: store:', !!store);
            if (store) {
                store.setSession(sessionId, projectId);
            }

            // Start loader immediately - minimum 5 second display time enforced locally
            showLoader?.(TaskFlow);

            const normalizedResponse = serverResponse?.data ?? serverResponse;
            let syncExecute = normalizedResponse?.execute;

            if (!syncExecute && global.apiIntegration?.getSession) {
                const snap = await global.apiIntegration.getSession(sessionId);
                syncExecute = snap?.execute;
            }

            if (syncExecute) {
                setPanelContent(contentEl, 'execute', { execute: syncExecute, context: normalizedResponse?.context, sessionId, projectId }, TaskFlow);
                updateStatus(contentEl, 'Received response');
                hideLoader?.(TaskFlow);
            } else {
                updateStatus(contentEl, 'Waiting for response...');
            }

            // Listen for execute events from SessionStore
            if (store && typeof store.on === 'function') {
                store.on('execute', (execute) => {
                    if (TaskFlow.panelId) {
                        const pm = global.PanelManager;
                        const panel = pm?.get(TaskFlow.panelId);
                        if (panel) {
                            const content = panel.getContentEl();
                            if (content) {
                                setPanelContent(content, 'execute', { execute, sessionId: TaskFlow._sessionId, projectId: TaskFlow._projectId }, TaskFlow);
                            }
                        }
                    }
                });
            }

            // Removed legacy SessionViewModel update

        } catch (error) {
            console.error('[TaskFlow] Error:', error);
            setPanelContent(contentEl, 'error', { error: error.message, task, projectId }, TaskFlow);
        }
    }

    // Export
    global.TaskFlowTasks = {
        waitForFirstResponse,
        applyExecuteResponse,
        run,
        doRun
    };
    global.waitForFirstResponse = waitForFirstResponse;
    global.applyExecuteResponse = applyExecuteResponse;

})(typeof window !== 'undefined' ? window : global);
