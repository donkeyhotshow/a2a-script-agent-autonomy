/**
 * TaskFlow Messages Module
 * Отправка выборов и сообщений
 */

(function (global) {
    'use strict';

    // Get modules
    const API = global.TaskFlowAPI;
    const Render = global.TaskFlowRender;
    const setPanelContent = Render?.setPanelContent;
    const updateStatus = Render?.updateStatus;
    const getChoiceLabel = API?.getChoiceLabel;
    const resolveStore = global.resolveStore;
    const escapeHtml = global.escapeHtml;
    const waitForFirstResponse = global.waitForFirstResponse;
    const showLoader = global.TaskFlowLoader?.showLoader;
    const hideLoader = global.TaskFlowLoader?.hideLoader;
    const setupLoaderListener = global.TaskFlowLoader?.setupLoaderListener;

    /**
     * Отправить выбор
     * @param {Object} TaskFlow - Main TaskFlow instance
     * @param {string} choiceId - ID выбора
     * @param {HTMLElement} contentEl - элемент контента
     */
    async function sendChoice(TaskFlow, choiceId, contentEl) {
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

        // Show sending state with choice label
        const choiceLabel = getChoiceLabel(choiceId);
        contentEl.innerHTML = `
            <div class="task-flow-sending">
                <p>Sending choice: <strong>${escapeHtml(choiceLabel)}</strong></p>
                <div class="task-flow-spinner"></div>
            </div>
        `;

        try {
            // Start waiting for response BEFORE submitting (prevents race condition)
            const outcomePromise = waitForFirstResponse(60000, store);

            const handler = global.ActionHandler;
            if (!handler?.submit) {
                throw new Error('ActionHandler is not available for sending choice');
            }

            const submitResult = await handler.submit(sessionId, { choice: choiceId });

            // Wait for response (promiseId polling in SDK)
            const outcome = await outcomePromise;
            
            // Check if this is async (has promiseId) - don't hide loader yet!
            const isAsync = submitResult?.promiseId || outcome?.promiseId;
            
            if (outcome.execute) {
                setPanelContent(contentEl, 'execute', { execute: outcome.execute, sessionId, projectId }, TaskFlow);
                updateStatus(contentEl, 'Received response');
            }

            if (isAsync) {
                // For async flow: wait for promise to resolve before hiding loader
                console.log('[TaskFlow] Async flow detected, waiting for promise to resolve...');
                
                // Subscribe to promise resolved event
                if (store && typeof store.on === 'function') {
                    const unsubscribe = store.on('promiseResolved', (data) => {
                        console.log('[TaskFlow] Promise resolved, hiding loader:', data);
                        unsubscribe();
                        hideLoader?.(TaskFlow);
                        // Render the final execute result
                        const exec = data.execute ?? data.result?.execute;
                        if (exec) {
                            setPanelContent(contentEl, 'execute', { execute: exec, sessionId, projectId }, TaskFlow);
                            updateStatus(contentEl, 'Processing complete');
                        }
                    });
                }
                // Loader will be hidden when promise resolves (minimum 5s already enforced)
            } else {
                // Sync flow: hide loader immediately
                hideLoader?.(TaskFlow);
            }

        } catch (error) {
            console.error('[TaskFlow] Error sending choice:', error);
            hideLoader?.(TaskFlow);
            contentEl.innerHTML = `
                <div class="task-flow-error">
                    <p>Error: ${escapeHtml(error.message)}</p>
                    <button class="task-flow-retry-btn">Retry</button>
                </div>
            `;
        }
    }

    /**
     * Отправить результат сообщения
     * @param {Object} TaskFlow - Main TaskFlow instance
     * @param {string} messageText - текст сообщения
     * @param {HTMLElement} contentEl - элемент контента
     */
    async function sendMessageResult(TaskFlow, messageText, contentEl) {
        const sessionId = TaskFlow._sessionId;
        const projectId = TaskFlow._projectId;
        if (!sessionId || !projectId) {
            console.warn('[TaskFlow] No active session');
            return;
        }

        const displayText = (messageText || '').trim() || 'continue';

        // Add message to history and show waiting state
        const store = resolveStore(sessionId);
        if (store?.pushMessage) {
            store.pushMessage({ content: displayText }, 'user');
        }

        // Setup loader listener for this session
        setupLoaderListener?.(TaskFlow, sessionId);

        // Start loader immediately - LLM processing takes time
        showLoader?.(TaskFlow);

        // Show sending state with message text
        contentEl.innerHTML = `
            <div class="task-flow-sending">
                <p>Sending message: <strong>${escapeHtml(displayText)}</strong></p>
                <div class="task-flow-spinner"></div>
            </div>
        `;

        try {
            // Start waiting for response BEFORE submitting (prevents race condition)
            const outcomePromise = waitForFirstResponse(60000, store);

            const handler = global.ActionHandler;
            if (!handler?.submit) {
                throw new Error('ActionHandler is not available for sending message');
            }

            const submitResult = await handler.submit(sessionId, { message: messageText });

            // Wait for response (promiseId polling in SDK)
            const outcome = await outcomePromise;
            
            // Check if this is async (has promiseId) - don't hide loader yet!
            const isAsync = submitResult?.promiseId || outcome?.promiseId;
            
            if (outcome.execute) {
                setPanelContent(contentEl, 'execute', { execute: outcome.execute, sessionId, projectId }, TaskFlow);
                updateStatus(contentEl, 'Received response');
            }

            if (isAsync) {
                // For async flow: wait for promise to resolve before hiding loader
                console.log('[TaskFlow] Async flow detected, waiting for promise to resolve...');
                
                // Subscribe to promise resolved event
                if (store && typeof store.on === 'function') {
                    const unsubscribe = store.on('promiseResolved', (data) => {
                        console.log('[TaskFlow] Promise resolved, hiding loader:', data);
                        unsubscribe();
                        hideLoader?.(TaskFlow);
                        // Render the final execute result
                        const exec = data.execute ?? data.result?.execute;
                        if (exec) {
                            setPanelContent(contentEl, 'execute', { execute: exec, sessionId, projectId }, TaskFlow);
                            updateStatus(contentEl, 'Processing complete');
                        }
                    });
                }
                // Loader will be hidden when promise resolves (minimum 5s already enforced)
            } else {
                // Sync flow: hide loader immediately
                hideLoader?.(TaskFlow);
            }

        } catch (error) {
            console.error('[TaskFlow] Error sending message:', error);
            hideLoader?.(TaskFlow);
            contentEl.innerHTML = `
                <div class="task-flow-error">
                    <p>Error: ${escapeHtml(error.message)}</p>
                </div>
            `;
        }
    }

    // Export
    global.TaskFlowMessages = {
        sendChoice,
        sendMessageResult
    };

})(typeof window !== 'undefined' ? window : global);
