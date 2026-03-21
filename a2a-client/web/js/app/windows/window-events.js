/**
 * Window Events - Handles window events (rendering, messaging, choices)
 */
(function (global) {
    'use strict';

    const MIN_LOADER_MS = global.__a2aDaemons.timingMs('MIN_LOADER_MS');

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
                        
                        // FIXED: Show loader for specific session
                        _showGlobalLoader(sessionId);
                        
                        const msg = String(text).trim();
                        store.pushMessage?.({ content: msg }, 'user');
                        store?.setPromisePending?.(true);
                        refreshContent();
                        try {
                            await WindowEvents.sendMessage(sessionId, msg, store);
                        } finally {
                            // FIXED: Hide loader for specific session
                            _hideGlobalLoader(sessionId);
                        }
                    },
                    sendChoice: async (choiceId, el) => {
                        // FIXED: Show loader for specific session
                        _showGlobalLoader(sessionId);
                        
                        store?.setPromisePending?.(true);
                        refreshContent();
                        try {
                            await WindowEvents.sendChoice(sessionId, choiceId, store);
                        } finally {
                            // FIXED: Hide loader for specific session
                            _hideGlobalLoader(sessionId);
                        }
                    }
                };

                // Global loader helper functions - FIXED: Track active loaders per session
                let _loaderMinEndTime = null;
                const _activeLoaders = new Map(); // sessionId -> { minEndTime, element }
                function _showGlobalLoader(sessionId = 'global') {
                    // No inline loader - just track min end time
                    _loaderMinEndTime = Date.now() + MIN_LOADER_MS;
                    // Track this loader for this session
                    _activeLoaders.set(sessionId, { minEndTime: _loaderMinEndTime });
                }
                function _hideGlobalLoader(sessionId = 'global') {
                    // No inline loader to hide
                    // Just clear from active loaders
                    _activeLoaders.delete(sessionId);
                }

                // Use renderExecute to render full panel (history + execute + input)
                // renderExecute renders the complete content: history + execute block + input area
                const refreshContent = () => {
                    // Get execute - use method if available for consistency
                    const execute = store.getExecute ? store.getExecute() : (store.execute || store._state?.execute);
                    let context = store.context || store._state?.context;
                    if (!context) {
                        context = {};
                    }

                    const st = store.getState?.() || {};
                    const promisePending = st.promisePending || (store.core?.promise?.isPending) || (store.promise?.isPending);
                    const hasActionableForm = global.executeHasActionableForm?.(execute);
                    const inputBlocked =
                        typeof store.isInputBlocked === 'function' && store.isInputBlocked();
                    const isWaiting =
                        !!promisePending ||
                        (!hasActionableForm && inputBlocked);

                    // Task-flow UI (form/message/actions) only when server/store set execute; never synthetic { form: pendingForm }
                    if (execute && !isWaiting) {
                        Render.renderExecute(contentEl, execute, { execute, context, store }, taskFlowRef);
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

                // Listen for message updates (messages=plural from setMessages, message=singular from pushMessage)
                const unsubMessages = store.on?.('messages', () => refreshContent());
                const unsubMessage = store.on?.('message', () => refreshContent());
                const unsubExecute = store.on?.('execute', () => refreshContent());
                const unsubPromisePending = store.on?.('promisePending', () => refreshContent());
                const unsubError = store.on?.('error', () => refreshContent());

                // Cleanup on panel close
                contentEl._cleanup = () => {
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

        /**
         * Handle window blur event
         */
        handleWindowBlur(sessionId) {
            // Optional: handle window blur (when user clicks outside window)
        },

        /**
         * Handle window resize event
         */
        handleWindowResize(sessionId, newSize) {
            const registry = global.WindowRegistry;
            const positionModule = global.WindowPosition;
            
            if (!registry || !positionModule) return;
            
            const sessionWindows = registry.getSessionWindows();
            const panel = sessionWindows?.get(sessionId);
            
            if (panel) {
                positionModule.saveWindowState(sessionId, panel.position, panel.size);
            }
        },

        /**
         * Handle window drag event
         */
        handleWindowDrag(sessionId, newPosition) {
            const registry = global.WindowRegistry;
            const positionModule = global.WindowPosition;
            
            if (!registry || !positionModule) return;
            
            const sessionWindows = registry.getSessionWindows();
            const panel = sessionWindows?.get(sessionId);
            
            if (panel) {
                positionModule.saveWindowState(sessionId, newPosition, panel.size);
            }
        }
    };

    // Export
    global.WindowEvents = WindowEvents;

})(typeof window !== 'undefined' ? window : globalThis);
