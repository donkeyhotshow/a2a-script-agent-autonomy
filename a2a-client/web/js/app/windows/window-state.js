/**
 * Window State - Manages window state (open, close, minimize, restore)
 */
(function (global) {
    'use strict';

    const WindowState = {
        /**
         * Toggle session window
         */
        async toggleSessionWindow(sessionId, btnEl) {
            const registry = global.WindowRegistry;
            const sessionWindows = registry?.getSessionWindows();
            
            if (!sessionWindows) {
                console.warn('[WindowState] WindowRegistry not available');
                return;
            }

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
            const registry = global.WindowRegistry;
            const positionModule = global.WindowPosition;
            
            if (!registry || !positionModule) {
                console.warn('[WindowState] Required modules not available');
                return;
            }

            try {
                // Load saved window state
                const savedState = await positionModule.loadWindowState(sessionId);
                const position = savedState?.position || positionModule.getDefaultWindowPosition(sessionId);
                const size = savedState?.size || { width: 800, height: 600 };

                // Fetch session data from server first (pass projectId so server finds the session)
                let sessionData = null;
                try {
                    if (global.apiIntegration?.getSession) {
                        const projectId = await global.ProjectManager?.getSelectedProjectId?.() || global.SessionStore?.projectId;
                        sessionData = await global.apiIntegration.getSession(sessionId, projectId);
                        console.log('[WindowState] Loaded session data:', sessionId);
                    }
                } catch (err) {
                    console.warn('[WindowState] Failed to load session data:', err);
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
                    const sessionWindows = registry.getSessionWindows();
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
                            registry.saveSessionWindowsState();
                            // Cleanup store listeners
                            const contentEl = panel.getContentEl();
                            if (contentEl?._cleanup) contentEl._cleanup();
                        }
                        // Save position/size on any state change
                        positionModule.saveWindowState(sessionId, panel.position, panel.size);
                    };

                    // Listen for drag end to save position
                    let dragTimeout;
                    panel.container.addEventListener('mouseup', () => {
                        if (panel.container.classList.contains('pm-dragging')) {
                            clearTimeout(dragTimeout);
                            dragTimeout = setTimeout(() => {
                                positionModule.saveWindowState(sessionId, panel.position, panel.size);
                            }, 100);
                        }
                    });

                    // Create per-window SessionStore instance to avoid conflicts
                    const store = new global.SessionStore.constructor();
                    // Store reference on the panel for cleanup
                    panel._sessionStore = store;

                    if (store && sessionData) {
                        // Set session info
                        if (sessionData.id) {
                            store.setSession(sessionData.id, sessionData.projectId);
                        }
                        // Load messages if available from session data
                        if (sessionData.messages?.length) {
                            store.setMessages(sessionData.messages);
                        }
                        // Load context/execute if available
                        if (sessionData.context) {
                            store.setContext(sessionData.context);
                        }
                        const execute = sessionData.execute ?? sessionData.context?.execute ?? sessionData.currentExecute;
                        if (execute) {
                            store.setExecute(execute);
                        }
                        // Set status
                        if (sessionData.status) {
                            store.setStatus(sessionData.status);
                        }
                    }

                    // If messages weren't in session data, load them separately
                    if (store && !sessionData?.messages?.length) {
                        try {
                            const adapter = global.SessionManagerAdapter || global.SessionManager;
                            if (adapter?.getConversation) {
                                await adapter.getConversation(sessionId);
                                console.log('[WindowState] Loaded conversation:', sessionId);
                            }
                        } catch (err) {
                            console.warn('[WindowState] Failed to load conversation:', err);
                        }
                    }

                    // Reconnect to SSE for this session
                    if (store?.restoreAndReconnect) {
                        await store.restoreAndReconnect(sessionId);
                    }

                    // Render session content using window-events module
                    const contentEl = panel.getContentEl();
                    console.log('[WindowState] About to render content:', { hasPanel: !!panel, hasContentEl: !!contentEl, contentElTag: contentEl?.tagName });
                    
                    if (global.WindowEvents) {
                        global.WindowEvents.renderSessionContent(contentEl, sessionId, store);
                    }

                    // Save state
                    await registry.saveSessionWindowsState();

                    console.log('[WindowState] Created session window:', sessionId);
                }
            } catch (error) {
                console.error('[WindowState] Failed to create session window:', error);
            }
        },

        /**
         * Close session window
         */
        closeSessionWindow(sessionId) {
            const registry = global.WindowRegistry;
            const sessionWindows = registry?.getSessionWindows();
            
            if (!sessionWindows) return;
            
            const panel = sessionWindows.get(sessionId);
            if (panel) {
                panel.close();
                sessionWindows.delete(sessionId);
                registry.saveSessionWindowsState();
            }
        },

        /**
         * Close all session windows (e.g. when switching project)
         */
        closeAllSessionWindows() {
            const registry = global.WindowRegistry;
            const sessionWindows = registry?.getSessionWindows();
            
            if (!sessionWindows) return;
            
            const ids = Array.from(sessionWindows.keys());
            ids.forEach(sessionId => this.closeSessionWindow(sessionId));
            if (global.SessionManager) global.SessionManager.setActiveSession(null);
        },

        /**
         * Restore session windows from saved state
         */
        async restoreSessionWindows() {
            const registry = global.WindowRegistry;
            if (!registry) return;
            
            const savedWindows = await registry.loadSessionWindowsState();

            for (const sessionId of savedWindows) {
                try {
                    // Check if session still exists
                    const sessionExists = await this.checkSessionExists(sessionId);
                    if (sessionExists) {
                        await this.createSessionWindow(sessionId);
                    }
                } catch (error) {
                    console.warn('[WindowState] Failed to restore window:', sessionId, error);
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
         * Minimize window
         */
        minimizeWindow(sessionId) {
            const registry = global.WindowRegistry;
            const sessionWindows = registry?.getSessionWindows();
            
            if (!sessionWindows) return;
            
            const panel = sessionWindows.get(sessionId);
            if (panel && panel.minimize) {
                panel.minimize();
            }
        },

        /**
         * Restore window
         */
        restoreWindow(sessionId) {
            const registry = global.WindowRegistry;
            const sessionWindows = registry?.getSessionWindows();
            
            if (!sessionWindows) return;
            
            const panel = sessionWindows.get(sessionId);
            if (panel) {
                panel.restore();
                global.PanelManager?.bringToFront(panel.id);
            }
        },

        /**
         * Bring window to front
         */
        bringToFront(sessionId) {
            const registry = global.WindowRegistry;
            const sessionWindows = registry?.getSessionWindows();
            
            if (!sessionWindows) return;
            
            const panel = sessionWindows.get(sessionId);
            if (panel) {
                global.PanelManager?.bringToFront(panel.id);
            }
        }
    };

    // Export
    global.WindowState = WindowState;

})(typeof window !== 'undefined' ? window : globalThis);
