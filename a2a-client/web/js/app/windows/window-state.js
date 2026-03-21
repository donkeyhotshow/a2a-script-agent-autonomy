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
            container.className = 'pui-panel expanded';
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
            header.className = 'pui-panel-header';
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
                <span class="pui-panel-title" style="font-weight: 500; color: var(--text-primary, #fff);">${title}</span>
                <button class="pui-panel-close" style="background: none; border: none; color: var(--text-secondary, #888); cursor: pointer; font-size: 18px; padding: 0 4px;">&times;</button>
            `;

            // Create content area
            const content = document.createElement('div');
            content.className = 'pui-panel-content';
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
            header.querySelector('.pui-panel-close').addEventListener('click', () => panel.close());

            // Drag functionality
            let isDragging = false;
            let dragOffset = { x: 0, y: 0 };

            header.addEventListener('mousedown', (e) => {
                if (e.target.classList.contains('pui-panel-close')) return;
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
                let hasPendingPromise = false;
                let pendingPromiseId = null;
                try {
                    if (global.apiIntegration?.getSession) {
                        const projectId = await global.ProjectManager?.getSelectedProjectId?.() || global.SessionStore?.projectId || null;
                        sessionData = await global.apiIntegration.getSession(sessionId, projectId);
                        console.log('[WindowState] Session loaded:', sessionId, 'promiseId:', sessionData?.promiseId, 'status:', sessionData?.status);
                    }
                    // Check for pending promise directly via API (fallback if server doesn't return it)
                    if (!sessionData?.promiseId && global.apiIntegration?.checkPromiseStatus) {
                        // Try to get pending promise info
                        try {
                            const response = await fetch(`/api/a2a/sessions/${sessionId}/latest`);
                            if (response.ok) {
                                const latestData = await response.json();
                                console.log('[WindowState] Latest step data:', latestData);
                                if (latestData?.promiseId && latestData?.promiseStatus === 'pending') {
                                    hasPendingPromise = true;
                                    pendingPromiseId = latestData.promiseId;
                                    sessionData = sessionData || {};
                                    sessionData.promiseId = pendingPromiseId;
                                    console.log('[WindowState] Found pending promise from latest:', pendingPromiseId);
                                }
                            }
                        } catch (e) {
                            console.warn('[WindowState] Failed to check latest step:', e);
                        }
                    }
                } catch (err) {
                    console.warn('[WindowState] Failed to load session data:', err);
                }

                if (!sessionData) {
                    console.warn(`[WindowState] Session ${sessionId} not found - creating window with empty store`);
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

                    // Create per-window SessionStore instance w/ fallback
                    var StoreClass = window.SessionStoreClass || global.SessionStoreClass;
                    var store = null;
                    if (StoreClass) {
                        store = new StoreClass({sessionId}); // Pass sessionId
                    } else {
                        store = global.SessionStore;
                        console.log('[WindowState] Using global SessionStore');
                    }
                    if (!store) {
                        console.error('[WindowState] Failed to create SessionStore instance');
                    } else {
                        console.log('[WindowState] SessionStore instance created for', sessionId);
                        store.reset(sessionId); // Reset with sessionId
                    }
                    // Store reference on the panel for cleanup
                    panel._sessionStore = store;

                    // Save messages from session data BEFORE any TaskFlow initialization
                    // (TaskFlow.reset() clears messages, so we need to restore them after)
                    let savedMessages = null;

                    if (store && sessionData) {
                        // Set session info
                    if (sessionData?.id) {
                        store.setSession(sessionData.id, sessionData.projectId);
                    }
                    // Load messages if available from session data
                    if (sessionData?.messages && Array.isArray(sessionData.messages) && sessionData.messages.length > 0) {
                        store.setMessages(sessionData.messages);
                        // Save messages for restore after TaskFlow reset
                        savedMessages = sessionData.messages;
                    } else if (sessionData?.context?.messages && Array.isArray(sessionData.context.messages)) {
                        store.setMessages(sessionData.context.messages);
                        savedMessages = sessionData.context.messages;
                    }
                        // Load context/execute if available
                        if (sessionData?.context) {
                            store.setContext(sessionData.context);
                        }
                        const execute = sessionData?.execute ?? sessionData?.context?.execute ?? sessionData?.currentExecute;
                        console.log('[WindowState] Setting execute:', execute);
                        if (execute) {
                            store.setExecute(execute);
                        }
                        // Set status
                        if (sessionData?.status) {
                            store.setStatus(sessionData.status);
                        }

                        // Check for pending promise - restore loader if needed
                        if (sessionData.promiseId) {
                            console.log('[WindowState] Found pending promise:', sessionData.promiseId);
                            store.setPromisePending(true);
                            if (typeof store.startLoader === 'function') {
                                store.startLoader(sessionId);
                            }
                            // Start polling for promise result
                            this._pollPromise(sessionData.promiseId, sessionId, store);
                        }
                    }

                    // If messages weren't in session data at all, load them separately via adapter
                    // But only if we haven't already set messages above
                    const storeState = store?.getState?.() || {};
                    const storeHasMessages = store && (storeState.messages?.length > 0);
                    if (!storeHasMessages && sessionData?.messages === undefined) {
                        try {
                            const adapter = global.SessionManagerAdapter || global.SessionManager;
                            if (adapter?.getConversation) {
                                await adapter.getConversation(sessionId);
                            console.log('[WindowState] Loaded conversation via adapter:', sessionId);
                            }
                        } catch (err) {
                            console.warn('[WindowState] Failed to load conversation:', err);
                        }
                    }

                    // Restore session state
                    // Skip restoreAndReconnect as we already loaded session data above
                    // This prevents duplicate messages
                    // if (store?.restoreAndReconnect) {
                    //     await store.restoreAndReconnect(sessionId);
                    // }

                    // Render session content using window-events module
                    const contentEl = panel.getContentEl();
                    console.log('[WindowState] renderSessionContent called, contentEl:', !!contentEl, 'sessionId:', sessionId);
                    
                    if (global.WindowEvents) {
                        global.WindowEvents.renderSessionContent(contentEl, sessionId, store);
                    }

                    // Restore messages that were cleared by TaskFlow.reset()
                    if (savedMessages && savedMessages.length > 0) {
                        store.setMessages(savedMessages);
                        // Messages restored after TaskFlow init
                        // Force re-render to show restored messages
                        if (global.WindowEvents && contentEl) {
                            global.WindowEvents.renderSessionContent(contentEl, sessionId, store);
                        }
                    }

                    // Save state
                    await registry.saveSessionWindowsState();
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
         * Poll for promise result and restore UI when done
         */
        async _pollPromise(promiseId, sessionId, store) {
            if (!promiseId || !sessionId || !store) return;
            const pollMs =
                (typeof global !== 'undefined' && global.PROMISE_POLL_INTERVAL) ||
                (typeof global !== 'undefined' && global.__a2aDaemons?.PROMISE_POLL_INTERVAL) ||
                5000;

            const poll = async () => {
                try {
                    const response = await fetch(`/api/a2a/sessions/${sessionId}/promise/${promiseId}`);
                    const data = await response.json();
                    
                    const terminalOk =
                        data.status === 'completed' ||
                        data.status === 'done' ||
                        data.completed === true ||
                        data.execute != null;
                    if (terminalOk) {
                        // Promise resolved - update store and stop loader (execute may be top-level from plugin)
                        console.log('[WindowState] Promise completed:', promiseId);
                        const ex = data.execute || data.result?.execute;
                        if (ex) {
                            store.setExecute(ex);
                        } else {
                            store.setPromisePending(false);
                        }
                        if (data.result?.context) {
                            store.setContext(data.result.context);
                        }
                        
                        if (typeof store.stopLoader === 'function') {
                            store.stopLoader(sessionId);
                        }
                    } else if (data.status === 'failed' || data.status === 'error') {
                        // Promise failed
                        console.error('[WindowState] Promise failed:', promiseId);
                        store.setPromisePending(false);
                        if (typeof store.stopLoader === 'function') {
                            store.stopLoader(sessionId);
                        }
                    } else {
                        setTimeout(poll, pollMs);
                    }
                } catch (err) {
                    console.error('[WindowState] Promise poll error:', err);
                    setTimeout(poll, pollMs);
                }
            };
            
            // Start polling
            poll();
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
