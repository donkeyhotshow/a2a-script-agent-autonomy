/**
 * TaskFlow Tasks Module
 * Выполнение задач и управление сессиями
 * Также содержит общие утилиты для messages.js
 */

(function (global) {
    'use strict';

    // Get modules
    const Render = global.TaskFlowRender;
    const setPanelContent = Render?.setPanelContent;
    const updateStatus = Render?.updateStatus;
    const resolveStore = global.resolveStore;
    const showLoader = global.TaskFlowLoader?.showLoader;
    const hideLoader = global.TaskFlowLoader?.hideLoader;
    const setupLoaderListener = global.TaskFlowLoader?.setupLoaderListener;
    const escapeHtml = global.escapeHtml;

    /**
     * Общая функция отправки и обработки результата
     * Используется sendChoice и sendMessageResult
     */
    async function submitAndHandle(TaskFlow, result, contentEl, displayText) {
        const sessionId = TaskFlow._sessionId;
        const projectId = TaskFlow._projectId;
        if (!sessionId || !projectId) {
            console.warn('[TaskFlow] No active session');
            return;
        }

        const store = resolveStore(sessionId);
        
        // Setup loader listener for this session
        setupLoaderListener?.(TaskFlow, sessionId);

        // Start loader immediately - minimum 5 second display time
        showLoader?.(TaskFlow);

        // Show sending state
        contentEl.innerHTML = `
            <div class="task-flow-sending">
                <p>Sending: <strong>${escapeHtml(displayText)}</strong></p>
                <!-- spinner removed -->
            </div>
        `;

        try {
            // Start waiting for response BEFORE submitting (prevents race condition)
            const outcomePromise = waitForFirstResponse(60000, store);

            const executor = global.ActionExecutor;
            if (!executor?.submit) {
                throw new Error('ActionExecutor is not available for sending');
            }

            const submitResult = await executor.submit(sessionId, result, store);

            // Wait for response
            const outcome = await outcomePromise;
            
            // Check if this is async (has promiseId) - don't hide loader yet!
            const isAsync =
                submitResult?.asyncPending ||
                outcome?.asyncPending ||
                submitResult?.promiseId ||
                outcome?.promiseId;
            
            if (outcome.execute) {
                setPanelContent(contentEl, 'execute', { execute: outcome.execute, sessionId, projectId }, TaskFlow);
                updateStatus(contentEl, 'Received response');
            }

            if (isAsync) {
                // For async flow: wait for promise to resolve before hiding loader
                if (store && typeof store.once === 'function') {
                    store.once('promiseResolved', (data) => {
                        hideLoader?.(TaskFlow);
                        const exec = data.execute ?? data.result?.execute;
                        if (exec) {
                            setPanelContent(contentEl, 'execute', { execute: exec, sessionId, projectId }, TaskFlow);
                            updateStatus(contentEl, 'Processing complete');
                        }
                    });
                } else if (store && typeof store.on === 'function') {
                    const unsubscribe = store.on('promiseResolved', (data) => {
                        unsubscribe();
                        hideLoader?.(TaskFlow);
                        const exec = data.execute ?? data.result?.execute;
                        if (exec) {
                            setPanelContent(contentEl, 'execute', { execute: exec, sessionId, projectId }, TaskFlow);
                            updateStatus(contentEl, 'Processing complete');
                        }
                    });
                }
            } else {
                // Sync flow: hide loader immediately
                hideLoader?.(TaskFlow);
            }

        } catch (error) {
            console.error('[TaskFlow] Error sending:', error);
            hideLoader?.(TaskFlow);
            const errorMsg = error?.message || error?.error?.message || 'Unknown error';
            contentEl.innerHTML = `
                <div class="task-flow-error">
                    <p>Error: ${escapeHtml(errorMsg)}</p>
                </div>
            `;
            if (store?.setError) {
                store.setError(errorMsg);
            }
        }
    }

    // Export for use by messages.js
    global.TaskFlowSubmitAndHandle = submitAndHandle;

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
            Render.renderExecute(contentEl, exec, responseData, null, TaskFlow);
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
        store?.reset();

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
            // Create task panel - no preloader
            const contentHTML = '';
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

            // Initialize SessionStore for this session
            const store = resolveStore(sessionId);
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
