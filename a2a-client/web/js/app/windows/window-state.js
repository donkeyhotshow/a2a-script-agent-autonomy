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
            const safeTitle = String(title ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
            
            // Create container
            const container = document.createElement('div');
            container.id = id;
            container.className = 'pui-panel expanded';
            container.style.cssText = `position: fixed; left: ${x}px; top: ${y}px; width: ${width}px; height: ${height}px;`;

            // Create header
            const header = document.createElement('div');
            header.className = 'pui-panel-header';
            header.innerHTML = `
                <span class="pui-panel-title">${safeTitle}</span>
                <button class="pui-panel-close">&times;</button>
            `;

            // Create content area
            const content = document.createElement('div');
            content.className = 'pui-panel-content';

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

                let sessionData = null;
                const projectId =
                    (await global.ProjectManager?.getSelectedProjectId?.()) || global.SessionStore?.projectId || null;
                const api = global.apiIntegration;
                // Single request with includeContext: true
                if (api?.getSession) {
                    try {
                        sessionData = await api.getSession(sessionId, {
                            projectId: projectId || undefined,
                            includeContext: true
                        });
                    } catch (err) {
                        console.warn('[WindowState] Failed to load session data:', err);
                    }
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
                    var storeOpts = global.SessionStoreWebDefaults;
                    if (StoreClass) {
                        if (!storeOpts) {
                            throw new Error('[WindowState] SessionStoreWebDefaults missing (load session-store.js)');
                        }
                        store = new StoreClass({
                            storageBase: storeOpts.storageBase,
                            storageMode: storeOpts.storageMode
                        });
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

                    if (store && sessionData) {
                        const dataSid = sessionData.id || sessionData.sessionId;
                        if (dataSid) {
                            store.setSession(dataSid, sessionData.projectId);
                        }
                        if (sessionData?.messages && Array.isArray(sessionData.messages) && sessionData.messages.length > 0) {
                            store.setMessages(sessionData.messages);
                        } else if (sessionData?.context?.messages && Array.isArray(sessionData.context.messages)) {
                            store.setMessages(sessionData.context.messages);
                        }
                        if (sessionData?.context) {
                            store.setContext(sessionData.context);
                        }
                        const execute = sessionData?.execute ?? sessionData?.context?.execute ?? sessionData?.currentExecute;
                        if (execute) {
                            store.setExecute(execute);
                        }
                        if (sessionData?.status) {
                            store.setStatus(sessionData.status);
                        }

                        if (sessionData.asyncPending) {
                            console.log('[WindowState] asyncPending is TRUE, setting promise pending and starting polling');
                            store.setPromisePending(true);
                            if (typeof store.startLoader === 'function') {
                                store.startLoader(sessionId);
                            }
                            this._resumeSessionAsyncPolling(sessionId, store);
                        } else {
                            console.log('[WindowState] asyncPending is FALSE, session is complete');
                        }
                    }

                    // Session data already loaded above with includeContext: true

                    const contentEl = panel.getContentEl();
                    if (global.WindowEvents && contentEl) {
                        global.WindowEvents.renderSessionContent(contentEl, sessionId, store);
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
                const projectId = await global.ProjectManager?.getSelectedProjectId?.() || null;
                const session = await global.apiIntegration.getSession(
                    sessionId,
                    projectId ? { projectId } : {}
                );
                return !!(session && (session.id || session.sessionId));
            } catch (e) {
                return false;
            }
        },

        /**
         * After reload: one-shot check then session-scoped polling (GET .../sessions/:id/async).
         */
        _resumeSessionAsyncPolling(sessionId, store) {
            if (!sessionId || !store) return;
            console.log('[WindowState] _resumeSessionAsyncPolling called for', sessionId);
            const Ex = global.ActionExecutor;
            if (!Ex?.checkSessionAsync || !Ex?.startPromisePolling || !Ex?.pullSessionSnapshot) {
                console.warn('[WindowState] ActionExecutor missing; cannot attach async polling');
                return;
            }
            console.log('[WindowState] Starting async polling for', sessionId);
            (async () => {
                try {
                    const chk = await Ex.checkSessionAsync(sessionId);
                    console.log('[WindowState] checkSessionAsync result:', JSON.stringify(chk));
                    const terminalOk =
                        chk &&
                        (chk.completed === true ||
                            chk.status === 'completed' ||
                            chk.status === 'done' ||
                            chk.status === 'idle' ||
                            chk.execute != null);
                    if (terminalOk) {
                        console.log('[WindowState] Terminal state detected, pulling snapshot');
                        await Ex.pullSessionSnapshot(sessionId, store);
                        store.setPromisePending(false);
                        if (typeof store.stopLoader === 'function') {
                            store.stopLoader(sessionId);
                        }
                        return;
                    }
                    if (chk && (chk.status === 'failed' || chk.status === 'error')) {
                        store.setPromisePending(false);
                        if (typeof store.stopLoader === 'function') {
                            store.stopLoader(sessionId);
                        }
                        return;
                    }
                    console.log('[WindowState] Not in terminal state, starting polling for', sessionId);
                    Ex.startPromisePolling(sessionId, null);
                } catch (e) {
                    console.error('[WindowState] Async bootstrap error:', e);
                    Ex.startPromisePolling(sessionId, null);
                }
            })();
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
