/**
 * Window Events - Handles window events (rendering, messaging, choices)
 */
(function (global) {
    'use strict';

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
                        if (typeof store.startLoader === 'function') store.startLoader(sessionId);
                        store?.setPromisePending?.(true);
                        refreshContent();
                        await WindowEvents.sendMessage(sessionId, msg, store);
                    },
                    sendChoice: async (choiceId, el) => {
                        if (typeof store.startLoader === 'function') store.startLoader(sessionId);
                        store?.setPromisePending?.(true);
                        refreshContent();
                        await WindowEvents.sendChoice(sessionId, choiceId, store);
                    }
                };

                // Use renderExecute to render full panel (history + execute + input)
                // renderExecute renders the complete content: history + execute block + input area
                 const refreshContent = () => {
                     const st = store.getState?.() || {};
                     const { execute, context, isWaiting } = global.getTaskFlowPanelViewState(st);
                    const promisePending = !!st.promisePending;
                    const awaitingVerify = !!st.awaitingSessionVerify;

                    // Task-flow UI (form/message/actions) only when server/store set execute; never synthetic { form: pendingForm }
                    // While promisePending/awaiting verify, do not re-show a stale actionable form (router double-submit / broken loader flow).
                    const shouldRenderPendingExecute =
                        !!execute &&
                        (!isWaiting ||
                            hasPendingClientAction(execute) ||
                            (global.executeHasActionableForm?.(execute) &&
                                !promisePending &&
                                !awaitingVerify));

                    if (shouldRenderPendingExecute) {
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
                     store.on?.('awaitingSessionVerify', debouncedRefresh),
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
