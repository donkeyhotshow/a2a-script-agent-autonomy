/**
 * Panel Manager - Unified panel system
 * Simplified unified panel system
 * Lifecycle: created → minimized → restored → closed
 * State centralized via SessionStore
 */
(function (global) {
    'use strict';

    const PanelManager = {
        _panels: new Map(),
        _mount: document.body,
        _zIndexBase: 1000,
        _activePanelId: null,

        init(options = {}) {
            this._mount = options.mount || document.body;
            console.log('[PanelManager] Initialized');
            return this;
        },

        // === Core API ===

        create(type, options = {}) {
            const id = options.id || `${type}-${Date.now()}`;

            if (this._panels.has(id)) {
                console.warn(`[PanelManager] Panel ${id} already exists`);
                return this._panels.get(id);
            }

            const panel = new global.Panel(id, type, options);
            this._panels.set(id, panel);

            return panel;
        },

        open(type, options = {}) {
            const id = options.id || `${type}-${Date.now()}`;

            // Check if panel already exists
            const existing = this._panels.get(id);
            if (existing) {
                return existing.restore();
            }

            // Create and show new panel
            const panel = this.create(type, { ...options, id });
            panel.show();
            this.bringToFront(id);

            return panel;
        },

        close(id) {
            const panel = this._panels.get(id);
            if (panel) {
                panel.close();
            }
            return this;
        },

        remove(id) {
            const panel = this._panels.get(id);
            if (panel) {
                panel.destroy();
                this._panels.delete(id);
            }
            return this;
        },

        // === Query ===

        get(id) {
            return this._panels.get(id) || null;
        },

        getByType(type) {
            return Array.from(this._panels.values()).filter(p => p.type === type);
        },

        getVisible() {
            return Array.from(this._panels.values()).filter(p => p.state === global.PANEL_STATES.VISIBLE);
        },

        getMinimized() {
            return Array.from(this._panels.values()).filter(p => p.state === global.PANEL_STATES.MINIMIZED);
        },

        // === Global Actions ===

        bringToFront(id) {
            const panel = this._panels.get(id);
            if (!panel) return this;

            this._zIndexBase++;
            panel.container.style.zIndex = this._zIndexBase;
            panel.indicator.style.zIndex = this._zIndexBase;
            this._activePanelId = id;

            return this;
        },

        minimizeAll() {
            this._panels.forEach(panel => {
                if (panel.state === global.PANEL_STATES.VISIBLE && !panel.config.critical) {
                    panel.minimize();
                }
            });
            return this;
        },

        closeAll(type = null) {
            this._panels.forEach((panel, id) => {
                if (type && panel.type !== type) return;
                if (!panel.config.critical) {
                    panel.close();
                }
            });
            return this;
        },

        // === Persistence: Save/Load State ===

        STORAGE_KEY: 'a2a-panel-state',

        saveState() {
            const state = {
                panels: Array.from(this._panels.values())
                    .filter(panel => panel.config.slot !== 'taskbar') // Don't save taskbar
                    .map(panel => ({
                        id: panel.id,
                        type: panel.type,
                        state: panel.state,
                        position: { ...panel.position },
                        size: { ...panel.size },
                        dockSide: panel.dockSide,
                        config: {
                            title: panel.config.title,
                            slot: panel.config.slot,
                            critical: panel.config.critical
                        }
                    })),
                timestamp: Date.now()
            };
            try {
                // Try async storage first, fallback to sync
                StorageAPI.ui.setItem(this.STORAGE_KEY, JSON.stringify(state)).catch(asyncError => {
                    console.warn('[PanelManager] Async storage failed, using sync fallback:', asyncError);
                    StorageAPI.ui.setItemSync(this.STORAGE_KEY, JSON.stringify(state));
                });
            } catch (e) {
                console.warn('[PanelManager] Failed to save state:', e);
            }
            return this;
        },

        async loadState() {
            try {
                // Try async storage first, fallback to sync
                let saved;
                try {
                    saved = await StorageAPI.ui.getItem(this.STORAGE_KEY);
                } catch (asyncError) {
                    console.warn('[PanelManager] Async storage failed, using sync fallback:', asyncError);
                    saved = StorageAPI.ui.getItemSync(this.STORAGE_KEY);
                }

                if (!saved) return this;
                const state = typeof saved === 'string' ? JSON.parse(saved) : saved;
                if (!state?.panels?.length) return this;

                // Restore panels
                state.panels.forEach(savedPanel => {
                    const existing = this._panels.get(savedPanel.id);
                    if (existing) {
                        // Update existing panel
                        existing.position = savedPanel.position || existing.position;
                        existing.size = savedPanel.size || existing.size;
                        existing.dockSide = savedPanel.dockSide || existing.dockSide;
                        if (savedPanel.config?.title) {
                            existing.setTitle(savedPanel.config.title);
                        }
                        // Restore position styles for floating panels
                        if (existing.config.slot === 'floating') {
                            existing.container.style.left = `${existing.position.x}px`;
                            existing.container.style.top = `${existing.position.y}px`;
                            existing.container.style.width = `${existing.size.width}px`;
                            existing.container.style.height = `${existing.size.height}px`;
                        }
                        // Restore state
                        if (savedPanel.state === global.PANEL_STATES.VISIBLE) {
                            existing.restore();
                        } else if (savedPanel.state === global.PANEL_STATES.MINIMIZED) {
                            existing.minimize();
                        }
                    } else {
                        // Create new panel from saved state
                        const panel = this.create(savedPanel.type, {
                            id: savedPanel.id,
                            title: savedPanel.config?.title,
                            critical: savedPanel.config?.critical,
                            x: savedPanel.position?.x,
                            y: savedPanel.position?.y,
                            width: savedPanel.size?.width,
                            height: savedPanel.size?.height
                        });
                        if (savedPanel.state === global.PANEL_STATES.VISIBLE) {
                            panel.show();
                        } else if (savedPanel.state === global.PANEL_STATES.MINIMIZED) {
                            panel.show().minimize();
                        }
                    }
                });
                console.log('[PanelManager] State restored:', state.panels.length, 'panels');
            } catch (e) {
                console.warn('[PanelManager] Failed to load state:', e);
            }
            return this;
        },

        async clearState() {
            try {
                // Try async storage first, fallback to sync
                await StorageAPI.ui.removeItem(this.STORAGE_KEY);
            } catch (asyncError) {
                console.warn('[PanelManager] Async storage failed, using sync fallback:', asyncError);
                StorageAPI.ui.removeItemSync(this.STORAGE_KEY);
            }
            return this;
        },

        // === State Integration with SessionStore ===

        async syncWithSessionStore() {
            const store = global.SessionStore;
            if (!store) {
                console.warn('[PanelManager] SessionStore not available');
                return this;
            }

            // Listen for execute changes to auto-open task panel
            store.on('execute', (execute) => {
                const taskPanel = this.getByType('task')[0];
                if (execute && taskPanel?.state === global.PANEL_STATES.MINIMIZED) {
                    // Auto-restore task panel when new execute arrives
                    taskPanel.restore();
                }
                // Auto-save state on execute changes
                this.saveState();
            });

            // Listen for messages to update chat panel indicator
            store.on('message', () => {
                const chatPanel = this.getByType('chat')[0];
                if (chatPanel?.state === global.PANEL_STATES.MINIMIZED) {
                    chatPanel.setStatus('unread');
                }
            });

            // Load saved state after init
            await this.loadState();

            return this;
        },

        // === Legacy Adapter Methods ===

        addPanel(opts) {
            // Adapter for legacy PlasticineUI.addPanel() calls
            const typeMap = {
                'task-flow-panel': 'task',
                'logs-panel': 'logs',
                'chat-panel': 'chat',
                'debug-panel': 'debug',
                'sessions-panel': 'sessions',
                'settings-panel': 'settings'
            };

            const type = typeMap[opts.id] || opts.slot || 'floating';
            const panel = this.open(type, {
                id: opts.id,
                title: opts.title,
                critical: opts.critical,
                onClose: opts.onClose
            });

            if (opts.contentHTML) {
                panel.setContent(opts.contentHTML);
            }

            return panel;
        },

        getContentEl(id) {
            const panel = this._panels.get(id);
            return panel?.getContentEl() || null;
        },

        removePanel(id) {
            return this.remove(id);
        }
    };

    // Export
    global.PanelManager = PanelManager;

})(typeof window !== 'undefined' ? window : globalThis);