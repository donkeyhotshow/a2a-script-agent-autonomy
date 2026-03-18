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
                        
                        // Show loader immediately - minimum 5 seconds
                        _showGlobalLoader();
                        
                        const msg = String(text).trim();
                        store.pushMessage?.({ content: msg }, 'user');
                        store?.setPromisePending?.(true);
                        refreshContent();
                        try {
                            await taskFlowRef.sendMessage(sessionId, msg);
                        } finally {
                            // Hide loader - will respect minimum 5 second wait
                            _hideGlobalLoader();
                        }
                    },
                    sendChoice: async (choiceId, el) => {
                        // Show loader immediately - minimum 5 seconds
                        _showGlobalLoader();
                        
                        store?.setPromisePending?.(true);
                        refreshContent();
                        try {
                            await this.sendChoice(sessionId, choiceId);
                        } finally {
                            // Hide loader - will respect minimum 5 second wait
                            _hideGlobalLoader();
                        }
                    }
                };

                // Global loader helper functions
                let _loaderMinEndTime = null;
                function _showGlobalLoader() {
                    let loaderEl = document.getElementById('global-task-loader');
                    if (!loaderEl) {
                        // Create loader element if it doesn't exist
                        loaderEl = document.createElement('div');
                        loaderEl.id = 'global-task-loader';
                        loaderEl.className = 'task-flow-inline-loader';
                        loaderEl.innerHTML = `
                            <div class="task-flow-spinner"></div>
                            <p>Processing...</p>
                        `;
                        document.body.appendChild(loaderEl);
                        console.log('[WindowEvents] Created loader element');
                    }
                    
                    loaderEl.classList.add('active');
                    _loaderMinEndTime = Date.now() + 5000;
                    loaderEl.dataset.minEndTime = _loaderMinEndTime;
                    console.log('[WindowEvents] Loader shown');
                }
                function _hideGlobalLoader() {
                    const loaderEl = document.getElementById('global-task-loader');
                    if (!loaderEl) return;
                    
                    const minEndTime = parseInt(loaderEl.dataset.minEndTime) || 0;
                    const now = Date.now();
                    
                    if (now >= minEndTime) {
                        loaderEl.classList.remove('active');
                        console.log('[WindowEvents] Loader hidden (min time passed)');
                    } else {
                        const remaining = minEndTime - now;
                        console.log('[WindowEvents] Waiting', remaining, 'ms for min time');
                        setTimeout(() => {
                            loaderEl.classList.remove('active');
                            console.log('[WindowEvents] Loader hidden (after wait)');
                        }, remaining);
                    }
                }

                // Use renderExecute to render full panel (history + execute + input)
                // renderExecute renders the complete content: history + execute block + input area
                const refreshContent = () => {
                    // Get execute - use method if available for consistency
                    const execute = store.getExecute ? store.getExecute() : (store.execute || store._state?.execute);
                    const context = store.context || store._state?.context || {};

                    const isWaiting = store.isInputBlocked?.() || false;
                    
                    // Check for form in execute or in pendingForm
                    const hasForm = execute?.form || store.pendingForm || store._state?.pendingForm;
                    
                    // Debug log
                    console.log('[WindowEvents] refreshContent:', 
                        'execute:', execute, 
                        'hasForm:', hasForm, 
                        'isWaiting:', isWaiting,
                        'pendingForm:', store.pendingForm,
                        'store._state.pendingForm:', store._state?.pendingForm);

                    // Render if we have execute or form, and not waiting
                    if ((execute || hasForm) && !isWaiting) {
                        // Use execute with form if available from pendingForm
                        const executeToRender = execute || { form: store.pendingForm || store._state?.pendingForm };
                        // Let renderExecute handle the full layout (history + form/message)
                        Render.renderExecute(contentEl, executeToRender, { execute: executeToRender, context, store }, taskFlowRef);
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

            if (global.ActionHandler?.sendMessage) {
                await global.ActionHandler.sendMessage(sessionId, message);
            } else if (global.ActionHandler?.submit) {
                await global.ActionHandler.submit(sessionId, { message });
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
            const result = { choice: choiceId };

            if (global.ActionHandler?.sendChoice) {
                await global.ActionHandler.sendChoice(sessionId, choiceId);
            } else if (global.ActionHandler?.submit) {
                await global.ActionHandler.submit(sessionId, result);
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
