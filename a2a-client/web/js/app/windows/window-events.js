/**
 * Window Events - Handles window events (rendering, messaging, choices)
 */
(function (global) {
    'use strict';

    function escapeHtmlAttr(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;');
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
            
            // Save store reference for use in sendMessage/sendChoice
            this._passedStore = store;

            if (Render && store) {
                // Note: store should already be set up with session data from createSessionWindow
                // Don't reset here as it would clear loaded messages

                const taskFlowRef = {
                    sendMessage: (sid, m) => WindowEvents.sendMessage(sid, m),
                    sendMessageResult: async (text, el) => {
                        if (!text || !text.trim()) return;
                        
                        // FIXED: Show loader for specific session
                        _showGlobalLoader(sessionId);
                        
                        const msg = String(text).trim();
                        store.pushMessage?.({ content: msg }, 'user');
                        store?.setPromisePending?.(true);
                        refreshContent();
                        try {
                            await taskFlowRef.sendMessage(sessionId, msg);
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
                            await this.sendChoice(sessionId, choiceId);
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
                    // FIXED: Use session-specific loader ID instead of global
                    console.log('[WindowEvents] _showGlobalLoader called for session:', sessionId, 'Active loaders:', _activeLoaders.size);
                    
                    const loaderId = 'session-loader-' + sessionId;
                    let loaderEl = document.getElementById(loaderId);
                    if (!loaderEl) {
                        // Create session-specific loader element
                        loaderEl = document.createElement('div');
                        loaderEl.id = loaderId;
                        loaderEl.className = 'task-flow-inline-loader';
                        loaderEl.innerHTML = `
                            <div class="task-flow-spinner"></div>
                            <p>Processing...</p>
                        `;
                        // Try to append to the session's panel
                        const sessionPanel = document.getElementById('session-' + sessionId);
                        if (sessionPanel) {
                            sessionPanel.appendChild(loaderEl);
                        } else {
                            document.body.appendChild(loaderEl);
                        }
                        console.log('[WindowEvents] Created session-specific loader element:', loaderId);
                    }
                    
                    loaderEl.classList.add('active');
                    _loaderMinEndTime = Date.now() + 5000;
                    loaderEl.dataset.minEndTime = _loaderMinEndTime;
                    // Track this loader for this session
                    _activeLoaders.set(sessionId, { minEndTime: _loaderMinEndTime, element: loaderEl });
                    console.log('[WindowEvents] Loader shown for session:', sessionId, 'loaderId:', loaderId);
                }
                function _hideGlobalLoader(sessionId = 'global') {
                    // FIXED: Use session-specific loader ID
                    console.log('[WindowEvents] _hideGlobalLoader called for session:', sessionId, 'Active loaders:', _activeLoaders.size);
                    
                    // Try session-specific loader first
                    const loaderId = 'session-loader-' + sessionId;
                    let loaderEl = document.getElementById(loaderId);
                    
                    // Fallback to global for backward compatibility
                    if (!loaderEl) {
                        loaderEl = document.getElementById('global-task-loader');
                    }
                    
                    if (!loaderEl) {
                        console.log('[WindowEvents] No loader element found for session:', sessionId);
                        return;
                    }
                    
                    const minEndTime = parseInt(loaderEl.dataset.minEndTime) || 0;
                    const now = Date.now();
                    
                    if (now >= minEndTime) {
                        loaderEl.classList.remove('active');
                        _activeLoaders.delete(sessionId);
                        console.log('[WindowEvents] Loader hidden (min time passed) for session:', sessionId);
                    } else {
                        const remaining = minEndTime - now;
                        console.log('[WindowEvents] Waiting', remaining, 'ms for min time for session:', sessionId);
                        setTimeout(() => {
                            loaderEl.classList.remove('active');
                            _activeLoaders.delete(sessionId);
                            console.log('[WindowEvents] Loader hidden (after wait) for session:', sessionId);
                        }, remaining);
                    }
                }

                // Use renderExecute to render full panel (history + execute + input)
                // renderExecute renders the complete content: history + execute block + input area
                const refreshContent = () => {
                    // Get execute - use method if available for consistency
                    const execute = store.getExecute ? store.getExecute() : (store.execute || store._state?.execute);
                    let context = store.context || store._state?.context;
                    if (!context) {
                        console.warn('[WindowEvents] No context found');
                        context = {};
                    }

                    const st = store.getState?.() || {};
                    // Use sessionId from multiple possible sources
                    const storeSessionId = store.sessionId || st.sessionId || store.core?.state?.sessionId || sessionId;
                    // More reliable check for promise pending
                    const promisePending = st.promisePending || (store.core?.promise?.isPending) || (store.promise?.isPending);
                    const loaderActive = st.loaderActive || (store.core?.getLoader?.(storeSessionId)?.isActive);
                    const isWaiting =
                        (typeof store.isInputBlocked === 'function' && store.isInputBlocked()) ||
                        !!promisePending ||
                        !!loaderActive;

                    // Debug log
                    console.log('[WindowEvents] refreshContent:', 
                        'execute:', !!execute, 
                        'isWaiting:', isWaiting,
                        'promisePending:', promisePending,
                        'loaderActive:', loaderActive,
                        'store.sessionId:', store.sessionId);

                    // Task-flow UI (form/message/actions) only when server/store set execute; never synthetic { form: pendingForm }
                    if (execute && !isWaiting) {
                        Render.renderExecute(contentEl, execute, { execute, context, store }, taskFlowRef);
                    } else {
                        const waitBlock = isWaiting
                            ? `<div class="task-flow-sending task-flow-inline-loader active" style="margin-top:0.75rem">
                                    <div class="task-flow-spinner"></div>
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
                        <div class="session-messages" id="messages-${escapeHtmlAttr(sessionId)}">
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
