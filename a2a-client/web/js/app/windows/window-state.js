/**
 * Window State - Manages window state (open, close, minimize, restore)
 */
(function (global) {
    'use strict';

    const WindowState = {
        /**
         * Create a floating window (simple replacement for PanelManager)
         */
        _createFloatingWindow(options) {
            const { id, title, x, y, width, height } = options;
            
            // Create container
            const container = document.createElement('div');
            container.id = id;
            container.className = 'floating-window';
            container.style.cssText = `
                position: fixed;
                left: ${x}px;
                top: ${y}px;
                width: ${width}px;
                height: ${height}px;
                background: var(--bg-primary, #1e1e1e);
                border: 1px solid var(--border-color, #333);
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                z-index: 1000;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            `;

            // Create header
            const header = document.createElement('div');
            header.className = 'floating-window-header';
            header.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 12px;
                background: var(--bg-secondary, #252526);
                border-bottom: 1px solid var(--border-color, #333);
                cursor: move;
                user-select: none;
            `;
            header.innerHTML = `
                <span class="floating-window-title" style="font-weight: 500; color: var(--text-primary, #fff);">${title}</span>
                <button class="floating-window-close" style="background: none; border: none; color: var(--text-secondary, #888); cursor: pointer; font-size: 18px; padding: 0 4px;">&times;</button>
            `;

            // Create content area
            const content = document.createElement('div');
            content.className = 'floating-window-content';
            content.style.cssText = `
                flex: 1;
                overflow: auto;
                padding: 12px;
            `;

            container.appendChild(header);
            container.appendChild(content);
            document.body.appendChild(container);

            // Panel object with API similar to old PanelManager panels
            const panel = {
                id,
                container,
                position: { x, y },
                size: { width, height },
                state: 'visible',
                _savedState: null,
                getContentEl: () => content,
                close: () => {
                    if (panel._onClose) panel._onClose();
                    container.remove();
                },
                minimize: () => {
                    panel._savedState = { display: container.style.display };
                    container.style.display = 'none';
                    panel.state = 'minimized';
                },
                restore: () => {
                    container.style.display = panel._savedState?.display || 'flex';
                    panel.state = 'visible';
                },
                maximize: () => {
                    if (panel.state === 'maximized') {
                        container.style.left = `${panel.position.x}px`;
                        container.style.top = `${panel.position.y}px`;
                        container.style.width = `${panel.size.width}px`;
                        container.style.height = `${panel.size.height}px`;
                        panel.state = 'visible';
                    } else {
                        panel.position = { x: parseInt(container.style.left), y: parseInt(container.style.top) };
                        panel.size = { width: container.offsetWidth, height: container.offsetHeight };
                        container.style.left = '0';
                        container.style.top = '0';
                        container.style.width = '100vw';
                        container.style.height = '100vh';
                        panel.state = 'maximized';
                    }
                },
                _onClose: null
            };

            // Close button
            header.querySelector('.floating-window-close').addEventListener('click', () => panel.close());

            // Drag functionality
            let isDragging = false;
            let dragOffset = { x: 0, y: 0 };

            header.addEventListener('mousedown', (e) => {
                if (e.target.classList.contains('floating-window-close')) return;
                isDragging = true;
                dragOffset.x = e.clientX - container.offsetLeft;
                dragOffset.y = e.clientY - container.offsetTop;
                container.style.zIndex = '1001';
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                const newX = e.clientX - dragOffset.x;
                const newY = e.clientY - dragOffset.y;
                container.style.left = `${newX}px`;
                container.style.top = `${newY}px`;
                panel.position = { x: newX, y: newY };
            });

            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    container.style.zIndex = '1000';
                }
            });

            return panel;
        },

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
                        console.log('[WindowState] Session execute:', sessionData?.execute);
                        console.log('[WindowState] Session context:', sessionData?.context);
                    }
                } catch (err) {
                    console.warn('[WindowState] Failed to load session data:', err);
                }

                // Create floating window directly (no PanelManager dependency)
                const panel = this._createFloatingWindow({
                    id: `session-${sessionId}`,
                    title: sessionData?.title || `Session ${sessionId.slice(-8)}`,
                    x: position.x,
                    y: position.y,
                    width: size.width,
                    height: size.height
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

                    // Close button handler
                    panel._onClose = () => {
                        sessionWindows.delete(sessionId);
                        registry.saveSessionWindowsState();
                        const contentEl = panel.getContentEl();
                        if (contentEl?._cleanup) contentEl._cleanup();
                        positionModule.saveWindowState(sessionId, panel.position, panel.size);
                    };

                    // Save position on drag end (debounced)
                    let saveTimeout;
                    panel.container.addEventListener('mouseup', () => {
                        clearTimeout(saveTimeout);
                        saveTimeout = setTimeout(() => {
                            positionModule.saveWindowState(sessionId, panel.position, panel.size);
                        }, 200);
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
                            console.log('[WindowState] Set execute in store:', execute);
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

                    // Restore session state
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
                const projectId = await global.ProjectManager?.getSelectedProjectId?.();
                if (!projectId) return false;
                const session = await global.apiIntegration.getSession(sessionId, projectId);
                return !!session;
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
