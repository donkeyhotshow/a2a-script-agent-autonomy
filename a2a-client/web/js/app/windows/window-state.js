/**
 * Window State - Manages window state (open, close, minimize, restore)
 */
(function (global) {
    'use strict';
    const RESTORE_WINDOW_CONCURRENCY = 5;
    let _zTop = 1000;
    let _cubeIndex = 0;

    if (!global.WindowEvents) {
        throw new Error('[WindowState] Load js/app/windows/window-events.js before window-state.js');
    }

    if (!global.WindowPosition) {
        throw new Error('[WindowState] Load js/app/windows/window-position.js before window-state.js');
    }

    const WindowState = {
        /**
         * Create a floating window (simple replacement for PanelManager)
         */
        _createFloatingWindow(options) {
            const { id, title, x, y, width, height } = options;
            const safeTitle = global.escapeHtml(title ?? '');

            // Container
            const container = document.createElement('div');
            container.id = id;
            container.className = 'pui-panel expanded';
            container.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:${width}px;height:${height}px;z-index:${++_zTop};`;

            // Header
            const header = document.createElement('div');
            header.className = 'pui-panel-header';
            header.innerHTML = `
                <span class="pui-panel-title">${safeTitle}</span>
                <div class="pui-panel-controls">
                    <button class="pui-panel-btn pui-panel-minimize" title="Minimise">&#8211;</button>
                    <button class="pui-panel-btn pui-panel-maximize" title="Maximise">&#9633;</button>
                    <button class="pui-panel-btn pui-panel-close" title="Close">&times;</button>
                </div>
            `;

            const content = document.createElement('div');
            content.className = 'pui-panel-content';

            container.appendChild(header);
            container.appendChild(content);
            document.body.appendChild(container);

            // Minimised cube (квадратик)
            const cube = document.createElement('div');
            cube.className = 'pui-window-cube';
            cube.innerHTML = `<span class="pui-window-cube-title">${safeTitle}</span><span class="pui-window-cube-dot"></span>`;
            cube.title = 'Drag to move · Double right-click to restore';
            cube.style.cssText = `display:none;left:${12 + (_cubeIndex % 8) * 56}px;bottom:${60 + Math.floor(_cubeIndex / 8) * 48}px;`;
            _cubeIndex++;
            document.body.appendChild(cube);

            const panel = {
                id,
                container,
                position: { x, y },
                size: { width, height },
                state: 'visible',   // 'visible' | 'minimized' | 'maximized'
                _preMaximize: null,
                getContentEl: () => content,
                _cleanupDrag: () => {
                    document.removeEventListener('mousemove', _onDragMove);
                    document.removeEventListener('mouseup', _onDragEnd);
                },
                close: () => {
                    panel._cleanupDrag();
                    if (panel._onClose) panel._onClose();
                    container.remove();
                    cube.remove();
                },
                minimize: () => {
                    container.style.display = 'none';
                    cube.style.display = 'flex';
                    panel.state = 'minimized';
                    _updateCubeDot();
                },
                restore: () => {
                    container.style.display = 'flex';
                    cube.style.display = 'none';
                    panel.state = 'visible';
                    _bringToFront();
                },
                maximize: () => {
                    if (panel.state === 'maximized') {
                        const s = panel._preMaximize;
                        container.style.left   = `${s.x}px`;
                        container.style.top    = `${s.y}px`;
                        container.style.width  = `${s.width}px`;
                        container.style.height = `${s.height}px`;
                        header.querySelector('.pui-panel-maximize').innerHTML = '&#9633;';
                        panel.state = 'visible';
                    } else {
                        panel._preMaximize = {
                            x: panel.position.x, y: panel.position.y,
                            width: panel.size.width, height: panel.size.height
                        };
                        container.style.left   = '0';
                        container.style.top    = '0';
                        container.style.width  = '100vw';
                        container.style.height = '100vh';
                        header.querySelector('.pui-panel-maximize').innerHTML = '&#10064;';
                        panel.state = 'maximized';
                    }
                    _bringToFront();
                },
                _onClose: null
            };

            const _updateCubeDot = () => {
                const store = panel._sessionStore;
                const st = store?.getState?.() || {};
                const pending = st.promisePending ?? false;
                const status  = st.status ?? 'idle';
                const dot = cube.querySelector('.pui-window-cube-dot');
                if (!dot) return;
                dot.className = 'pui-window-cube-dot' + (pending ? ' running' : status === 'error' ? ' error' : ' idle');
            };

            // Cube: drag
            let _cubeDragging = false;
            let _cubeDragOffset = { x: 0, y: 0 };
            let _cubeLastRightClick = 0;

            cube.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return;
                _cubeDragging = false;
                _cubeDragOffset.x = e.clientX - cube.offsetLeft;
                _cubeDragOffset.y = e.clientY - cube.offsetTop;
                const _onCubeMove = (ev) => {
                    _cubeDragging = true;
                    cube.style.left   = `${ev.clientX - _cubeDragOffset.x}px`;
                    cube.style.bottom = 'auto';
                    cube.style.top    = `${ev.clientY - _cubeDragOffset.y}px`;
                };
                const _onCubeUp = () => {
                    document.removeEventListener('mousemove', _onCubeMove);
                    document.removeEventListener('mouseup', _onCubeUp);
                };
                document.addEventListener('mousemove', _onCubeMove);
                document.addEventListener('mouseup', _onCubeUp);
            });

            // Double right-click → restore
            cube.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const now = Date.now();
                if (now - _cubeLastRightClick < 400) {
                    panel.restore();
                }
                _cubeLastRightClick = now;
            });

            // Header buttons
            header.querySelector('.pui-panel-close').addEventListener('click', (e) => { e.stopPropagation(); panel.close(); });
            header.querySelector('.pui-panel-minimize').addEventListener('click', (e) => { e.stopPropagation(); panel.minimize(); });
            header.querySelector('.pui-panel-maximize').addEventListener('click', (e) => { e.stopPropagation(); panel.maximize(); });

            // Drag
            let isDragging = false;
            let dragOffset = { x: 0, y: 0 };

            const _bringToFront = () => { container.style.zIndex = ++_zTop; };

            const _onDragStart = (e) => {
                if (e.target.closest('.pui-panel-controls')) return;
                if (panel.state === 'maximized') return;
                isDragging = true;
                dragOffset.x = e.clientX - container.offsetLeft;
                dragOffset.y = e.clientY - container.offsetTop;
                document.addEventListener('mousemove', _onDragMove);
                document.addEventListener('mouseup', _onDragEnd);
            };

            const _onDragMove = (e) => {
                if (!isDragging) return;
                const newX = e.clientX - dragOffset.x;
                const newY = e.clientY - dragOffset.y;
                container.style.left = `${newX}px`;
                container.style.top  = `${newY}px`;
                panel.position = { x: newX, y: newY };
            };

            const _onDragEnd = () => {
                isDragging = false;
                document.removeEventListener('mousemove', _onDragMove);
                document.removeEventListener('mouseup', _onDragEnd);
            };

            container.addEventListener('mousedown', _bringToFront);
            header.addEventListener('mousedown', _onDragStart);

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
         * Hydrate store with session data (now uses normalized response from apiIntegration)
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

             // Messages - already normalized in apiIntegration.getSession (guaranteed to be array)
             store.initMessages(sessionData.messages || []);

            // Context - already normalized in apiIntegration.getSession (guaranteed to be object)
            store.setContext(sessionData.context || {});

            // Execute - already normalized in apiIntegration.getSession (can be null)
            store.setExecute(sessionData.execute);

            // Status - already normalized in apiIntegration.getSession
            if (sessionData.status !== undefined) {
                store.setStatus(sessionData.status);
            }

            // Async pending - already normalized in apiIntegration.getSession
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
         * Create session store instance (SessionStoreClass is now required)
         * @private
         */
        _createSessionStore(sessionId) {
            const StoreClass = window.SessionStoreClass || global.SessionStoreClass;
            const storeOpts = global.SessionStoreWebDefaults;

            if (!StoreClass) {
                throw new Error('[WindowState] SessionStoreClass is required (load session-store.js)');
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
            if (!Array.isArray(savedWindows) || savedWindows.length === 0) {
                return;
            }

            const queue = savedWindows.slice();
            while (queue.length > 0) {
                const batch = queue.splice(0, RESTORE_WINDOW_CONCURRENCY);
                await Promise.allSettled(
                    batch.map((sessionId) => this._restoreSavedWindow(sessionId))
                );
            }
        },

        async _restoreSavedWindow(sessionId) {
            try {
                const sessionExists = await this.checkSessionExists(sessionId);
                if (sessionExists) {
                    await this.createSessionWindow(sessionId);
                }
            } catch (error) {
                console.warn('[WindowState] Failed to restore window:', sessionId, error);
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


    };

    // Export
    global.WindowState = WindowState;

})(typeof window !== 'undefined' ? window : globalThis);
