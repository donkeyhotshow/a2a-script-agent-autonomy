/**
 * Window Events - Handles window events (rendering, messaging, choices)
 */
(function (global) {
    'use strict';

    const WindowEvents = {
        /**
         * Render session content in panel
         */
        renderSessionContent(contentEl, sessionId, store = null) {
            // Use TaskFlow rendering system if available
            const Render = global.TaskFlowRender;
            // Use provided store (per-window) or fall back to global
            store = store || global.SessionStore;

            if (Render && store) {
                // Note: store should already be set up with session data from createSessionWindow
                // Don't reset here as it would clear loaded messages

                const taskFlowRef = {
                    sendMessage: (sid, m) => WindowEvents.sendMessage(sid, m, store),
                    sendMessageResult: async (text, el) => {
                        if (!text || !text.trim()) return;
                        
                        const msg = String(text).trim();
                        store.pushMessage?.({ content: msg }, 'user');
                        store?.setPromisePending?.(true);
                        refreshContent();
                        await WindowEvents.sendMessage(sessionId, msg, store);
                    },
                    sendChoice: async (choiceId, el) => {
                        store?.setPromisePending?.(true);
                        refreshContent();
                        await WindowEvents.sendChoice(sessionId, choiceId, store);
                    }
                };

                // Use renderExecute to render full panel (history + execute + input)
                // renderExecute renders the complete content: history + execute block + input area
                const refreshContent = () => {
                    // Get all store data in single call for efficiency
                    const st = store.getState?.() || {};
                    const execute = st.execute ?? st._state?.execute;
                    const context = st.context ?? st._state?.context ?? {};
                    const promisePending = st.promisePending ?? st.core?.promise?.isPending ?? st.promise?.isPending ?? false;
                    const hasActionableForm = global.executeHasActionableForm?.(execute);
                    const inputBlocked = typeof st.isInputBlocked === 'function' && st.isInputBlocked();
                    const isWaiting = !!promisePending || (!hasActionableForm && inputBlocked);

                    // Task-flow UI (form/message/actions) only when server/store set execute; never synthetic { form: pendingForm }
                    if (execute && !isWaiting) {
                        Render.renderExecute(contentEl, execute, { execute, context, store }, store, taskFlowRef);
                    } else {
                        const waitBlock = isWaiting
                            ? `<div class="task-flow-sending" style="margin-top:0.75rem">
                                    <p class="task-flow-status">Waiting for server / LLM…</p>
                               </div>`
                            : '';
                        contentEl.innerHTML = `
                            <div class="session-content">
                                ${Render.renderMessageHistory(contentEl, store)}
                                ${waitBlock}
                            </div>
                        `;
                    }

                    // Scroll to bottom
                    const historyEl = contentEl.querySelector('.task-flow-history');
                    if (historyEl) historyEl.scrollTop = historyEl.scrollHeight;
                };

                // Initial render
                refreshContent();

                // Debounced refresh to avoid multiple re-renders
                let refreshTimeout = null;
                const debouncedRefresh = () => {
                    if (refreshTimeout) clearTimeout(refreshTimeout);
                    refreshTimeout = setTimeout(refreshContent, 10);
                };

                // Listen for all store changes with single debounced refresh
                // Consolidated from 5 separate events into one handler
                const unsubMessages = store.on?.('messages', debouncedRefresh);
                const unsubMessage = store.on?.('message', debouncedRefresh);
                const unsubExecute = store.on?.('execute', debouncedRefresh);
                const unsubPromisePending = store.on?.('promisePending', debouncedRefresh);
                const unsubError = store.on?.('error', debouncedRefresh);

                // Cleanup on panel close
                contentEl._cleanup = () => {
                    if (refreshTimeout) clearTimeout(refreshTimeout);
                    unsubMessages?.();
                    unsubMessage?.();
                    unsubExecute?.();
                    unsubPromisePending?.();
                    unsubError?.();
                };
            } else {
                // Fallback to simple UI
                contentEl.innerHTML = `
                    <div class="session-content">
                        <div class="session-messages" id="messages-${global.escapeHtmlAttr(sessionId)}">
                            <div class="message system">Session initialized</div>
                        </div>
                        <div class="session-input">
                            <textarea placeholder="Type your message..." rows="3"></textarea>
                            <button class="send-btn">Send</button>
                        </div>
                    </div>
                `;

                const textarea = contentEl.querySelector('textarea');
                const sendBtn = contentEl.querySelector('.send-btn');

                const sendMessage = () => {
                    const message = textarea.value.trim();
                    if (message) {
                        WindowEvents.sendMessage(sessionId, message, store);
                        textarea.value = '';
                    }
                };

                sendBtn.addEventListener('click', sendMessage);
                textarea.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                    }
                });
            }
        },

        /**
         * Send message to session
         */
        async sendMessage(sessionId, message, storeOverride) {
            const Ex = global.ActionExecutor;
            if (!Ex?.sendMessage) {
                throw new Error('ActionExecutor is not available for sending message');
            }
            await Ex.sendMessage(sessionId, message, storeOverride);
        },

        /**
         * Send choice result to session (for form.choices)
         */
        async sendChoice(sessionId, choiceId, storeOverride) {
            const Ex = global.ActionExecutor;
            if (!Ex?.sendChoice) {
                throw new Error('ActionExecutor is not available for sending choice');
            }
            await Ex.sendChoice(sessionId, choiceId, storeOverride);
        },

        /**
         * Handle window focus event
         */
        handleWindowFocus(sessionId) {
            if (global.SessionManager) {
                global.SessionManager.setActiveSession(sessionId);
            }
        },

    };

    // Export
    global.WindowEvents = WindowEvents;

})(typeof window !== 'undefined' ? window : globalThis);
