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
            
            // Save store reference for use in sendMessage/sendChoice
            this._passedStore = store;

            if (Render && store) {
                // Note: store should already be set up with session data from createSessionWindow
                // Don't reset here as it would clear loaded messages

                const taskFlowRef = {
                    sendMessage: (sid, m) => WindowEvents.sendMessage(sid, m),
                    sendMessageResult: async (text, el) => {
                        if (!text || !text.trim()) return;
                        const msg = String(text).trim();
                        store.pushMessage?.({ content: msg }, 'user');
                        store?.setPromisePending?.(true);
                        if (store?.saveStep && store?.isPersistentStorage?.()) {
                            store.saveStep({ execute: { form: { input: { value: msg } } }, messages: [{ role: 'user', content: msg }], context: store?.context }).catch(() => {});
                        }
                        refreshContent();
                        await taskFlowRef.sendMessage(sessionId, msg);
                    },
                    sendChoice: async (choiceId, el) => {
                        store?.setPromisePending?.(true);
                        if (store?.saveStep && store?.isPersistentStorage?.()) {
                            store.saveStep({ execute: { form: { choice: choiceId } }, messages: [], context: store?.context }).catch(() => {});
                        }
                        refreshContent();
                        await this.sendChoice(sessionId, choiceId);
                    }
                };

                // Use renderExecute to render full panel (history + execute + input)
                // renderExecute renders the complete content: history + execute block + input area
                const refreshContent = () => {
                    // Get execute - use method if available for consistency
                    const execute = store.getExecute ? store.getExecute() : store.execute;
                    const context = store.context || {};

                    const isWaiting = store.isInputBlocked?.() || false;

                    if (execute && !isWaiting) {
                        // Let renderExecute handle the full layout (history + form/message)
                        Render.renderExecute(contentEl, execute, { execute, context, store }, taskFlowRef);
                    } else {
                        const statusText = isWaiting ? 'Waiting...' : 'Active';
                        contentEl.innerHTML = `
                            <div class="session-content">
                                ${Render.renderMessageHistory(contentEl, store)}
                                ${isWaiting ? `<p>Waiting for response (${statusText})...</p>` : ''}
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
        async sendMessage(sessionId, message, usePassedStore = true) {
            // Use the store that was passed to renderSessionContent, not global
            let store = usePassedStore ? this._passedStore : global.SessionStore;
            const projectId = store?.projectId;

            if (global.ActionHandler?.sendMessage) {
                await global.ActionHandler.sendMessage(sessionId, projectId, message);
            } else if (global.ActionHandler?.submit) {
                const context = store?.context || {};
                await global.ActionHandler.submit(sessionId, projectId, { message }, context);
            } else {
                throw new Error('ActionHandler is not available for sending message');
            }

            console.log('[WindowEvents] Sent message:', sessionId, message);
        },

        /**
         * Send choice result to session (for form.choices)
         */
        async sendChoice(sessionId, choiceId, usePassedStore = true) {
            // Use the store that was passed to renderSessionContent, not global
            let store = usePassedStore ? this._passedStore : global.SessionStore;
            const projectId = store?.projectId;
            const result = { choice: choiceId };

            if (global.ActionHandler?.sendChoice) {
                await global.ActionHandler.sendChoice(sessionId, projectId, choiceId);
            } else if (global.ActionHandler?.submit && projectId) {
                await global.ActionHandler.submit(sessionId, projectId, result, store?.context || {});
            } else {
                throw new Error('ActionHandler is not available for sending choice');
            }

            console.log('[WindowEvents] Sent choice:', sessionId, choiceId);
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
