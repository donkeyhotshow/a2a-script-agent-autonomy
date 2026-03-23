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
                     // Helper functions to extract state values with fallbacks
                     const getExecute = (state) => state.execute ?? state._state?.execute;
                     const getContext = (state) => state.context ?? state._state?.context ?? {};
                     const getPromisePending = (state) => state.promisePending ?? state.core?.promise?.isPending ?? state.promise?.isPending ?? false;
                     
                     // Get all store data in single call for efficiency
                     const st = store.getState?.() || {};
                     const execute = getExecute(st);
                     const context = getContext(st);
                     const promisePending = getPromisePending(st);
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
                 const unsubscribers = [
                     store.on?.('messages', debouncedRefresh),
                     store.on?.('message', debouncedRefresh),
                     store.on?.('execute', debouncedRefresh),
                     store.on?.('promisePending', debouncedRefresh),
                     store.on?.('error', debouncedRefresh)
                 ].filter(Boolean);

                 // Cleanup on panel close
                 contentEl._cleanup = () => {
                     if (refreshTimeout) clearTimeout(refreshTimeout);
                     unsubscribers.forEach(unsub => unsub());
                 };
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

    };

    // Export
    global.WindowEvents = WindowEvents;

})(typeof window !== 'undefined' ? window : globalThis);
