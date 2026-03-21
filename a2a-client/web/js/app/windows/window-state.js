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
            const safeTitle = global.escapeHtml(title ?? '');
            
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
                _cleanupDrag: () => {
                    document.removeEventListener('mousemove', _onDragMove);
                    document.removeEventListener('mouseup', _onDragEnd);
                },
                close: () => {
                    panel._cleanupDrag();
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

            // Drag functionality with cleanup support
            let isDragging = false;
            let dragOffset = { x: 0, y: 0 };

            const _onDragStart = (e) => {
                if (e.target.classList.contains('pui-panel-close')) return;
                isDragging = true;
                dragOffset.x = e.clientX - container.offsetLeft;
                dragOffset.y = e.clientY - container.offsetTop;
                container.style.zIndex = '1001';
            };

            const _onDragMove = (e) => {
                if (!isDragging) return;
                const newX = e.clientX - dragOffset.x;
                const newY = e.clientY - dragOffset.y;
                container.style.left = `${newX}px`;
                container.style.top = `${newY}px`;
                panel.position = { x: newX, y: newY };
            };

            const _onDragEnd = () => {
                if (isDragging) {
                    isDragging = false;
                    container.style.zIndex = '1000';
                }
            };

            header.addEventListener('mousedown', _onDragStart);
            document.addEventListener('mousemove', _onDragMove);
            document.addEventListener('mouseup', _onDragEnd);

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
         * Load session data from API
         * @private
         */
        async _loadSessionData(sessionId) {
            const projectId = await global.getCurrentProjectId() || global.SessionStore?.projectId || null;
            const api = global.apiIntegration;
            
            if (!api?.getSession) {
                return null;
            }

            try {
                const sessionData = await api.getSession(sessionId, {
                    projectId: projectId || undefined,
                    includeContext: true
                });
                return sessionData;
            } catch (err) {
                console.warn('[WindowState] Failed to load session data:', err);
                return null;
            }
        },

        /**
         * Hydrate store with session data
         * @private
         */
        _hydrateStore(store, sessionData, sessionId) {
            if (!store || !sessionData) {
                return;
            }

            const dataSid = sessionData.id || sessionData.sessionId;
            if (dataSid) {
                store.setSession(dataSid, sessionData.projectId);
            }

            // Messages - try multiple sources
            if (sessionData?.messages && Array.isArray(sessionData.messages) && sessionData.messages.length > 0) {
                store.setMessages(sessionData.messages);
            } else if (sessionData?.context?.messages && Array.isArray(sessionData.context.messages)) {
                store.setMessages(sessionData.context.messages);
            }

            // Context
            if (sessionData?.context) {
                store.setContext(sessionData.context);
            }

            // Execute - try multiple sources
            const execute = sessionData?.execute ?? sessionData?.context?.execute ?? sessionData?.currentExecute;
            if (execute) {
                store.setExecute(execute);
            }

            // Status
            if (sessionData?.status) {
                store.setStatus(sessionData.status);
            }

            // Async pending
            if (sessionData.asyncPending) {
                store.setPromisePending(true);
                if (typeof store.startLoader === 'function') {
                    store.startLoader(sessionId);
                }
                this._resumeSessionAsyncPolling(sessionId, store);
            }
        },

        /**
         * Attach event handlers to window panel
         * @private
         */
        _attachWindowHandlers(panel, sessionId, registry, positionModule) {
            const sessionWindows = registry.getSessionWindows();

            // Set active session on focus
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

                // Load session data
                const sessionData = await this._loadSessionData(sessionId);
                if (!sessionData) {
                    console.warn(`[WindowState] Session ${sessionId} not found - creating window with empty store`);
                }

                // Create floating window
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

                    // Attach event handlers
                    this._attachWindowHandlers(panel, sessionId, registry, positionModule);

                    // Create SessionStore instance
                    const store = this._createSessionStore(sessionId);
                    panel._sessionStore = store;

                    // Hydrate store with data
                    this._hydrateStore(store, sessionData, sessionId);

                    // Render content
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
         * Create session store instance
         * @private
         */
        _createSessionStore(sessionId) {
            const StoreClass = window.SessionStoreClass || global.SessionStoreClass;
            const storeOpts = global.SessionStoreWebDefaults;

            if (!StoreClass) {
                const store = global.SessionStore;
                console.log('[WindowState] Using global SessionStore');
                if (store) {
                    store.reset(sessionId);
                }
                return store;
            }

            if (!storeOpts) {
                throw new Error('[WindowState] SessionStoreWebDefaults missing (load session-store.js)');
            }

            const store = new StoreClass({
                storageBase: storeOpts.storageBase,
                storageMode: storeOpts.storageMode
            });

            if (!store) {
                console.error('[WindowState] Failed to create SessionStore instance');
                return null;
            }

            console.log('[WindowState] SessionStore instance created for', sessionId);
            store.reset(sessionId);
            return store;
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
                const projectId = await global.getCurrentProjectId();
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
            const Ex = global.ActionExecutor;
            if (!Ex?.checkSessionAsync || !Ex?.startPromisePolling || !Ex?.pullSessionSnapshot) {
                console.warn('[WindowState] ActionExecutor missing; cannot attach async polling');
                return;
            }
            (async () => {
                try {
                    const chk = await Ex.checkSessionAsync(sessionId);
                    const terminalOk =
                        chk &&
                        (chk.completed === true ||
                            chk.status === 'completed' ||
                            chk.status === 'done' ||
                            chk.status === 'idle' ||
                            chk.execute != null);
                    if (terminalOk) {
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
                    Ex.startPromisePolling(sessionId, null);
                } catch (e) {
                    console.error('[WindowState] Async bootstrap error:', e);
                    Ex.startPromisePolling(sessionId, null);
                }
            })();
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
