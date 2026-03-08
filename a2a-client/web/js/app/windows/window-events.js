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
            console.log('[WindowEvents] renderSessionContent called:', { sessionId, hasContentEl: !!contentEl, hasInnerHTML: !!(contentEl?.innerHTML) });

            // Use TaskFlow rendering system if available
            const Render = global.TaskFlowRender;
            // Use provided store (per-window) or fall back to global
            store = store || global.SessionStore;

            console.log('[WindowEvents] renderSessionContent deps:', { hasRender: !!Render, hasStore: !!store, hasTaskFlowRef: !!global.TaskFlow });

            if (Render && store) {
                // Note: store should already be set up with session data from createSessionWindow
                // Don't reset here as it would clear loaded messages

                const taskFlowRef = {
                    sendMessageResult: async (text, el) => {
                        if (!text || !text.trim()) return;
                        store.pushMessage?.({ content: String(text).trim() }, 'user');
                        store?.setPromisePending?.(true);
                        refreshContent();
                        await this.sendMessage(sessionId, text);
                    },
                    sendChoice: async (choiceId, el) => {
                        store?.setPromisePending?.(true);
                        refreshContent();
                        await this.sendChoice(sessionId, choiceId);
                    }
                };

                // Use renderExecute to render full panel (history + execute + input)
                // renderExecute renders the complete content: history + execute block + input area
                const refreshContent = () => {
                    const execute = store.getExecute?.() || store.execute;
                    const context = store.context || {};
                    const isWaiting = store.isInputBlocked?.() || false;

                    if (execute && !isWaiting) {
                        // Let renderExecute handle the full layout (history + form/message + input)
                        Render.renderExecute(contentEl, execute, { execute, context, store }, taskFlowRef);
                    } else {
                        // Waiting or no execute: show history + waiting indicator
                        contentEl.innerHTML = `
                            <div class="session-content">
                                <div class="session-header">
                                    <div class="session-info">
                                        <span class="session-id">ID: ${sessionId.slice(-8)}</span>
                                        <span class="session-status">${isWaiting ? 'Waiting...' : 'Active'}</span>
                                    </div>
                                </div>
                                ${Render.renderMessageHistory(contentEl, store)}
                                ${Render.getInputAreaHtml(isWaiting)}
                            </div>
                        `;
                        if (!isWaiting) {
                            Render.bindInputHandlers(contentEl, taskFlowRef);
                        }
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

                // Cleanup on panel close
                contentEl._cleanup = () => {
                    unsubMessages?.();
                    unsubMessage?.();
                    unsubExecute?.();
                    unsubPromisePending?.();
                };
            } else {
                // Fallback to simple UI
                contentEl.innerHTML = `
                    <div class="session-content">
                        <div class="session-header">
                            <div class="session-info">
                                <span class="session-id">ID: ${sessionId}</span>
                                <span class="session-status">Active</span>
                            </div>
                        </div>
                        <div class="session-messages" id="messages-${sessionId}">
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
                        this.sendMessage(sessionId, message);
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
        async sendMessage(sessionId, message) {
            // Message already added in sendMessageResult before this is called
            const store = global.SessionStore;

            let response = null;

            // Send via API
            if (global.apiIntegration?.sendMessage) {
                response = await global.apiIntegration.sendMessage(sessionId, message);
            } else if (global.ActionHandler?.sendMessage) {
                response = await global.ActionHandler.sendMessage(sessionId, store?.projectId, message);
            } else if (global.ActionHandler?.submit) {
                const projectId = store?.projectId;
                const context = store?.context || {};
                response = await global.ActionHandler.submit(sessionId, projectId, { message: message }, context);
            }

            // Apply HTTP response to store as fallback (SSE may race or be unavailable)
            const payload = response?.data || response;
            if (payload?.execute || payload?.context) {
                store?.applyServerResponse?.({
                    execute: payload.execute,
                    context: payload.context,
                    messages: payload.messages
                });
            } else if (!payload?.promiseId) {
                // No execute and no pending promise — clear waiting state
                store?.setPromisePending?.(false);
            }
            // If promiseId present: keep promisePending=true, SSE will resolve it

            console.log('[WindowEvents] Sent message:', sessionId, message);
        },

        /**
         * Send choice result to session (for form.choices)
         */
        async sendChoice(sessionId, choiceId) {
            const store = global.SessionStore;
            const projectId = store?.projectId;
            const result = { choice: choiceId };

            // Send via Client API POST /sessions/:id/result
            const promises = [];
            if (global.apiIntegration?.sendResult) {
                promises.push(global.apiIntegration.sendResult(sessionId, result, projectId));
            } else if (global.webApiClient?.sendChoice) {
                promises.push(global.webApiClient.sendChoice(sessionId, result));
            } else if (global.ActionHandler?.submit && projectId) {
                promises.push(global.ActionHandler.submit(sessionId, projectId, result, store?.context || {}));
            }

            try {
                const results = await Promise.all(promises);
                const payload = results[0]?.data || results[0];
                if (payload?.execute || payload?.context) {
                    store?.applyServerResponse?.({
                        execute: payload.execute,
                        context: payload.context,
                        messages: payload.messages
                    });
                } else if (!payload?.promiseId) {
                    store?.setPromisePending?.(false);
                }
                console.log('[WindowEvents] Sent choice:', sessionId, choiceId);
            } catch (err) {
                console.error('[WindowEvents] sendChoice failed:', err);
                throw err;
            }
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
