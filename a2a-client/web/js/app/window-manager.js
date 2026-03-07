/**
 * Window Manager - Handles session windows, positioning and state
 */
(function (global) {
    'use strict';

    const SESSION_WINDOWS_KEY = 'a2a_session_windows';

    // Track opened session windows
    const sessionWindows = new Map(); // sessionId -> panel

    const WindowManager = {
        /**
         * Get session windows map
         */
        getSessionWindows() {
            return sessionWindows;
        },

        /**
         * Save session windows state
         */
        async saveSessionWindowsState() {
            try {
                const state = {
                    windows: Array.from(sessionWindows.keys()),
                    active: global.SessionManager?.getActiveSessionId(),
                    timestamp: Date.now()
                };
                await StorageAPI.ui.setItem(SESSION_WINDOWS_KEY, JSON.stringify(state));
            } catch (e) {
                console.warn('[WindowManager] Failed to save session windows state:', e);
            }
        },

        /**
         * Load session windows state
         */
        async loadSessionWindowsState() {
            try {
                const saved = await StorageAPI.ui.getItem(SESSION_WINDOWS_KEY);
                if (!saved) return [];
                const state = typeof saved === 'string' ? JSON.parse(saved) : saved;
                if (global.SessionManager) {
                    global.SessionManager.setActiveSession(state.active || null);
                }
                return state.windows || [];
            } catch (e) {
                console.warn('[WindowManager] Failed to load session windows state:', e);
                return [];
            }
        },

        /**
         * Clear session windows state
         */
        async clearSessionWindowsState() {
            try {
                await StorageAPI.ui.removeItem(SESSION_WINDOWS_KEY);
            } catch (e) {
                console.warn('[WindowManager] Failed to clear session windows state:', e);
            }
        },

        /**
         * Toggle session window
         */
        async toggleSessionWindow(sessionId, btnEl) {
            const existingPanel = sessionWindows.get(sessionId);

            if (existingPanel) {
                // Window exists - toggle visibility
                if (existingPanel.state === 'visible') {
                    existingPanel.minimize();
                } else {
                    existingPanel.restore();
                    global.PanelManager?.bringToFront(existingPanel.id);
                }
            } else {
                // Create new window
                await this.createSessionWindow(sessionId, btnEl);
            }

            // Update active session
            if (global.SessionManager) {
                global.SessionManager.setActiveSession(sessionId);
            }
        },

        /**
         * Create new session window
         */
        async createSessionWindow(sessionId, btnEl) {
            try {
                // Load saved window state
                const savedState = await this.loadWindowState(sessionId);
                const position = savedState?.position || this.getDefaultWindowPosition(sessionId);
                const size = savedState?.size || { width: 800, height: 600 };

                // Fetch session data from server first (pass projectId so server finds the session)
                let sessionData = null;
                try {
                    if (global.apiIntegration?.getSession) {
                        const projectId = await global.ProjectManager?.getSelectedProjectId?.() || global.SessionStore?.projectId;
                        sessionData = await global.apiIntegration.getSession(sessionId, projectId);
                        console.log('[WindowManager] Loaded session data:', sessionId);
                    }
                } catch (err) {
                    console.warn('[WindowManager] Failed to load session data:', err);
                }

                // Create panel as floating (not docked)
                const panel = global.PanelManager?.open('chat', {
                    id: `session-${sessionId}`,
                    title: `Session ${sessionId.slice(-8)}`,
                    x: position.x,
                    y: position.y,
                    width: size.width,
                    height: size.height,
                    slot: 'floating'
                });

                if (panel) {
                    sessionWindows.set(sessionId, panel);

                    // Setup panel event handlers
                    panel.container.addEventListener('mousedown', () => {
                        if (global.SessionManager) {
                            global.SessionManager.setActiveSession(sessionId);
                        }
                    });

                    // Listen for panel state changes to save position/size
                    panel._onStateChange = (state) => {
                        if (state === 'closed') {
                            sessionWindows.delete(sessionId);
                            this.saveSessionWindowsState();
                            // Cleanup store listeners
                            const contentEl = panel.getContentEl();
                            if (contentEl?._cleanup) contentEl._cleanup();
                        }
                        // Save position/size on any state change
                        this.saveWindowState(sessionId, panel.position, panel.size);
                    };

                    // Listen for drag end to save position
                    let dragTimeout;
                    panel.container.addEventListener('mouseup', () => {
                        if (panel.container.classList.contains('pm-dragging')) {
                            clearTimeout(dragTimeout);
                            dragTimeout = setTimeout(() => {
                                this.saveWindowState(sessionId, panel.position, panel.size);
                            }, 100);
                        }
                    });

                    // Restore session data to store and reconnect
                    const store = global.SessionStore;
                    if (store && sessionData) {
                        // Set project ID from session data
                        if (sessionData.projectId) {
                            store.setProject(sessionData.projectId);
                        }
                        // Load messages if available from session data
                        if (sessionData.messages?.length) {
                            store.setMessages(sessionData.messages);
                        }
                        // Load context/execute if available
                        if (sessionData.context) {
                            store.setContext(sessionData.context);
                        }
                        if (sessionData.execute) {
                            store.setExecute(sessionData.execute);
                        }
                    }

                    // If messages weren't in session data, load them separately
                    if (store && !sessionData?.messages?.length) {
                        try {
                            const adapter = global.SessionManagerAdapter || global.SessionManager;
                            if (adapter?.getConversation) {
                                await adapter.getConversation(sessionId);
                                console.log('[WindowManager] Loaded conversation:', sessionId);
                            }
                        } catch (err) {
                            console.warn('[WindowManager] Failed to load conversation:', err);
                        }
                    }

                    // Reconnect to SSE for this session
                    if (store?.restoreAndReconnect) {
                        await store.restoreAndReconnect(sessionId);
                    }

                    // Render session content
                    this.renderSessionContent(panel.getContentEl(), sessionId);

                    // Save state
                    await this.saveSessionWindowsState();

                    console.log('[WindowManager] Created session window:', sessionId);
                }
            } catch (error) {
                console.error('[WindowManager] Failed to create session window:', error);
            }
        },

        /**
         * Close session window
         */
        closeSessionWindow(sessionId) {
            const panel = sessionWindows.get(sessionId);
            if (panel) {
                panel.close();
                sessionWindows.delete(sessionId);
                this.saveSessionWindowsState();
            }
        },

        /**
         * Close all session windows (e.g. when switching project)
         */
        closeAllSessionWindows() {
            const ids = Array.from(sessionWindows.keys());
            ids.forEach(sessionId => this.closeSessionWindow(sessionId));
            if (global.SessionManager) global.SessionManager.setActiveSession(null);
        },

        /**
         * Save window state
         */
        async saveWindowState(sessionId, position, size) {
            try {
                const key = `window_state_${sessionId}`;
                const state = { position, size, timestamp: Date.now() };
                await StorageAPI.ui.setItem(key, JSON.stringify(state));
            } catch (e) {
                console.warn('[WindowManager] Failed to save window state:', e);
            }
        },

        /**
         * Load window state
         */
        async loadWindowState(sessionId) {
            try {
                const key = `window_state_${sessionId}`;
                const saved = await StorageAPI.ui.getItem(key);
                
                if (saved) {
                    return JSON.parse(saved);
                }
                
                // Return default window state if not found
                const defaultPosition = this.getDefaultWindowPosition(sessionId);
                return {
                    position: defaultPosition,
                    size: { width: 800, height: 600 },
                    timestamp: Date.now()
                };
            } catch (e) {
                console.warn('[WindowManager] Failed to load window state:', e);
                const defaultPosition = this.getDefaultWindowPosition(sessionId);
                return {
                    position: defaultPosition,
                    size: { width: 800, height: 600 },
                    timestamp: Date.now()
                };
            }
        },

        /**
         * Get default window position
         */
        getDefaultWindowPosition(sessionId) {
            // Calculate position based on existing windows to avoid overlap
            const existingPositions = Array.from(sessionWindows.values())
                .map(panel => panel.position);

            let x = 50 + (existingPositions.length * 30);
            let y = 50 + (existingPositions.length * 30);

            // Ensure within viewport bounds
            const maxX = window.innerWidth - 400;
            const maxY = window.innerHeight - 300;

            return {
                x: Math.min(x, maxX),
                y: Math.min(y, maxY)
            };
        },

        /**
         * Render session content in panel
         */
        renderSessionContent(contentEl, sessionId) {
            // Use TaskFlow rendering system if available
            const Render = global.TaskFlowRender;
            const store = global.SessionStore;

            if (Render && store) {
                // Note: store should already be set up with session data from createSessionWindow
                // Don't reset here as it would clear loaded messages

                    // Initial render with message history and execute panel
                    const refreshContent = () => {
                        const messages = store.messages || [];
                        const execute = store.getExecute?.() || store.execute;
                        const context = store.context || {};
                        const isWaiting = store.isInputBlocked?.() || false;

                        const historyHtml = Render.renderMessageHistory(contentEl);

                        // Render execute panel if there's execute data with form/message
                        let executeHtml = '';
                        if (execute && (execute.form || execute.message || execute.finalResult)) {
                            const tempDiv = document.createElement('div');
                            Render.renderExecute(tempDiv, { execute, context, messages }, null);
                            executeHtml = tempDiv.innerHTML;
                        }

                        contentEl.innerHTML = `
                            <div class="session-content">
                                <div class="session-header">
                                    <div class="session-info">
                                        <span class="session-id">ID: ${sessionId.slice(-8)}</span>
                                        <span class="session-status">${isWaiting ? 'Waiting...' : (context.status || 'Active')}</span>
                                    </div>
                                </div>
                                ${historyHtml}
                                ${executeHtml}
                                ${Render.getInputAreaHtml(isWaiting)}
                            </div>
                        `;

                    // Bind input handlers
                    Render.bindInputHandlers(contentEl, {
                        sendMessageResult: (text) => {
                            // Add to local messages immediately
                            store.pushMessage?.(text, 'user');
                            // Send to server
                            this.sendMessage(sessionId, text);
                            // Refresh to show new message
                            setTimeout(refreshContent, 50);
                        },
                        sendChoiceResult: (choiceId) => {
                            // Send choice to server
                            this.sendChoice(sessionId, choiceId);
                        }
                    });

                    // Bind choice button handlers
                    contentEl.querySelectorAll('.task-flow-choice-btn').forEach(btn => {
                        btn.addEventListener('click', () => {
                            const choiceId = btn.dataset.choiceId;
                            if (choiceId) {
                                this.sendChoice(sessionId, choiceId);
                            }
                        });
                    });

                    // Scroll to bottom
                    const historyEl = contentEl.querySelector('.task-flow-history');
                    if (historyEl) historyEl.scrollTop = historyEl.scrollHeight;
                };

                // Initial render
                refreshContent();

                // Listen for message updates
                const unsubMessage = store.on?.('message', () => refreshContent());
                const unsubExecute = store.on?.('execute', () => refreshContent());
                const unsubPromisePending = store.on?.('promisePending', () => refreshContent());

                // Cleanup on panel close
                contentEl._cleanup = () => {
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
        sendMessage(sessionId, message) {
            // Add to SessionStore if available (for immediate UI update)
            const store = global.SessionStore;
            if (store?.pushMessage) {
                store.pushMessage(message, 'user');
            }

            // Send via API
            if (global.apiIntegration?.sendMessage) {
                global.apiIntegration.sendMessage(sessionId, message);
            } else if (global.ActionHandler?.sendMessage) {
                // Use ActionHandler for proper action-key format
                global.ActionHandler.sendMessage(sessionId, store?.projectId, message);
            } else if (global.ActionHandler?.submit) {
                // Fallback to raw submit
                const projectId = store?.projectId;
                const context = store?.context || {};
                global.ActionHandler.submit(sessionId, projectId, { message: message }, context);
            }

            console.log('[WindowManager] Sent message:', sessionId, message);
        },

        /**
         * Send choice result to session (for form.choices)
         */
        sendChoice(sessionId, choiceId) {
            const store = global.SessionStore;
            const projectId = store?.projectId;
            const result = { form: { choice: choiceId } };

            // Send via Client API POST /sessions/:id/result
            if (global.apiIntegration?.sendResult) {
                global.apiIntegration.sendResult(sessionId, result, projectId).catch(err =>
                    console.error('[WindowManager] sendResult failed:', err)
                );
            } else if (global.webApiClient?.sendChoice) {
                global.webApiClient.sendChoice(sessionId, result).catch(err =>
                    console.error('[WindowManager] sendResult failed:', err)
                );
            } else if (global.ActionHandler?.submit && projectId) {
                global.ActionHandler.submit(sessionId, projectId, result, store?.context || {}).catch(err =>
                    console.error('[WindowManager] submit failed:', err)
                );
            }

            if (store?.clearPendingForm) store.clearPendingForm();
            console.log('[WindowManager] Sent choice:', sessionId, choiceId);
        },

        /**
         * Restore session windows from saved state
         */
        async restoreSessionWindows() {
            const savedWindows = await this.loadSessionWindowsState();

            for (const sessionId of savedWindows) {
                try {
                    // Check if session still exists
                    const sessionExists = await this.checkSessionExists(sessionId);
                    if (sessionExists) {
                        await this.createSessionWindow(sessionId);
                    }
                } catch (error) {
                    console.warn('[WindowManager] Failed to restore window:', sessionId, error);
                }
            }
        },

        /**
         * Check if session exists via Client API
         */
        async checkSessionExists(sessionId) {
            if (!sessionId || !global.apiIntegration) return false;
            try {
                await global.apiIntegration.getSession(sessionId);
                return true;
            } catch (e) {
                return false;
            }
        },

        /**
         * Initialize window manager
         */
        async init() {
            console.log('[WindowManager] Initialized');
        }
    };

    // Export
    global.WindowManager = WindowManager;

})(typeof window !== 'undefined' ? window : globalThis);