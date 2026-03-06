/**
 * Panel Manager - Simplified unified panel system
 * Consolidates: panels + cubes + modals into single hierarchy
 * Lifecycle: created → minimized → restored → closed
 * State centralized via SessionStore
 */

(function (global) {
    'use strict';

    const PANEL_TYPES = {
        task: { slot: 'floating', title: 'Task', critical: true },
        chat: { slot: 'right', title: 'Chat', critical: false },
        logs: { slot: 'bottom', title: 'Logs', critical: false },
        taskbar: { slot: 'taskbar', title: 'Sessions', critical: true },
        settings: { slot: 'modal', title: 'Settings', critical: false },
        projects: { slot: 'modal', title: 'Projects', critical: false },
        debug: { slot: 'floating', title: 'Debug', critical: false }
    };

    const PANEL_STATES = {
        CREATED: 'created',
        VISIBLE: 'visible',
        MINIMIZED: 'minimized',
        DOCKED: 'docked',
        CLOSED: 'closed'
    };

    class Panel {
        constructor(id, type, options = {}) {
            this.id = id;
            this.type = type;
            this.config = { ...PANEL_TYPES[type], ...options };
            this.state = PANEL_STATES.CREATED;
            
            // DOM elements
            this.container = null;
            this.header = null;
            this.content = null;
            this.indicator = null; // Replaces "cube"
            
            // Position/state
            this.position = { x: options.x || 50, y: options.y || 50 };
            this.size = { width: options.width || 420, height: options.height || 320 };
            this.dockSide = null; // 'left' | 'right' | 'bottom' | null
            
            // Handlers
            this._onClose = options.onClose || (() => {});
            this._onStateChange = (state) => {
                // Auto-save panel state
                if (PanelManager?.saveState) {
                    PanelManager.saveState();
                }
                // Call user-provided handler
                if (options.onStateChange) {
                    options.onStateChange(state);
                }
            };
            this._dragHandler = null;
            
            this._buildDOM();
            this._bindEvents();
        }

        _buildDOM() {
            // Main container
            this.container = document.createElement('div');
            this.container.className = `pm-panel pm-type-${this.type}`;
            this.container.dataset.panelId = this.id;
            
            if (this.config.slot === 'modal') {
                this.container.classList.add('pm-modal');
            } else if (this.config.slot === 'taskbar') {
                this.container.classList.add('pm-taskbar');
            } else if (this.config.slot !== 'floating') {
                this.container.classList.add(`pm-slot-${this.config.slot}`);
            } else {
                this.container.classList.add('pm-floating');
                this.container.style.left = `${this.position.x}px`;
                this.container.style.top = `${this.position.y}px`;
                this.container.style.width = `${this.size.width}px`;
                this.container.style.height = `${this.size.height}px`;
            }
            
            if (this.config.critical) {
                this.container.classList.add('pm-critical');
            }

            // Header
            this.header = document.createElement('div');
            this.header.className = 'pm-header';
            this.header.innerHTML = `
                <span class="pm-title">${this._escapeHtml(this.config.title)}</span>
                <div class="pm-controls">
                    ${this.config.slot !== 'modal' ? 
                        `<button type="button" class="pm-btn pm-btn-minimize" title="Minimize">−</button>` : ''}
                    ${!this.config.critical ? 
                        `<button type="button" class="pm-btn pm-btn-close" title="Close">×</button>` : ''}
                </div>
            `;

            // Content area
            this.content = document.createElement('div');
            this.content.className = 'pm-content';

            this.container.appendChild(this.header);
            this.container.appendChild(this.content);

            // Indicator (simplified "cube" - just a status indicator)
            this.indicator = document.createElement('div');
            this.indicator.className = 'pm-indicator';
            this.indicator.dataset.panelId = this.id;
            this.indicator.innerHTML = `
                <span class="pm-indicator-title">${this._escapeHtml(this.config.title.slice(0, 2))}</span>
                <span class="pm-indicator-status"></span>
            `;
            this.indicator.style.display = 'none';

            // Modal backdrop
            if (this.config.slot === 'modal') {
                this.backdrop = document.createElement('div');
                this.backdrop.className = 'pm-modal-backdrop';
            }
        }

        _bindEvents() {
            // Header drag for floating panels
            if (this.config.slot === 'floating') {
                let isDragging = false;
                let startX, startY, startLeft, startTop;

                this.header.addEventListener('mousedown', (e) => {
                    if (e.target.closest('.pm-btn')) return;
                    isDragging = true;
                    startX = e.clientX;
                    startY = e.clientY;
                    const rect = this.container.getBoundingClientRect();
                    startLeft = rect.left;
                    startTop = rect.top;
                    this.container.classList.add('pm-dragging');
                    e.preventDefault();
                });

                document.addEventListener('mousemove', (e) => {
                    if (!isDragging) return;
                    const dx = e.clientX - startX;
                    const dy = e.clientY - startY;
                    this.position.x = Math.max(0, startLeft + dx);
                    this.position.y = Math.max(0, startTop + dy);
                    this.container.style.left = `${this.position.x}px`;
                    this.container.style.top = `${this.position.y}px`;
                });

                document.addEventListener('mouseup', () => {
                    if (isDragging) {
                        isDragging = false;
                        this.container.classList.remove('pm-dragging');
                        // Save state after drag
                        if (PanelManager?.saveState) {
                            PanelManager.saveState();
                        }
                    }
                });
            }

            // Control buttons
            const minimizeBtn = this.header.querySelector('.pm-btn-minimize');
            const closeBtn = this.header.querySelector('.pm-btn-close');

            minimizeBtn?.addEventListener('click', () => this.minimize());
            closeBtn?.addEventListener('click', () => this.close());

            // Indicator click to restore
            this.indicator.addEventListener('click', () => this.restore());

            // Modal backdrop click to close
            if (this.backdrop) {
                this.backdrop.addEventListener('click', () => this.close());
            }

            // Bring to front on click
            this.container.addEventListener('mousedown', () => {
                PanelManager.bringToFront(this.id);
            });
        }

        // === State Transitions ===

        show() {
            if (this.state === PANEL_STATES.VISIBLE) return this;
            
            this.state = PANEL_STATES.VISIBLE;
            this.container.style.display = '';
            this.indicator.style.display = 'none';
            
            if (this.backdrop) {
                document.body.appendChild(this.backdrop);
            }
            
            PanelManager._mount.appendChild(this.container);
            PanelManager._mount.appendChild(this.indicator);
            
            this._onStateChange(this.state);
            return this;
        }

        minimize() {
            if (this.state === PANEL_STATES.MINIMIZED) return this;
            if (this.config.critical) {
                // Critical panels minimize to indicator instead of closing
                this.state = PANEL_STATES.MINIMIZED;
                this.container.style.display = 'none';
                this.indicator.style.display = 'flex';
                this._onStateChange(this.state);
            } else {
                this.close();
            }
            return this;
        }

        restore() {
            if (this.state === PANEL_STATES.VISIBLE) return this;
            
            this.state = PANEL_STATES.VISIBLE;
            this.container.style.display = '';
            this.indicator.style.display = 'none';
            this._onStateChange(this.state);
            
            PanelManager.bringToFront(this.id);
            return this;
        }

        close() {
            if (this.state === PANEL_STATES.CLOSED) return this;
            if (this.config.critical && this.config.slot !== 'modal') {
                // Critical non-modal panels minimize instead of close
                return this.minimize();
            }
            
            this.state = PANEL_STATES.CLOSED;
            this.container.style.display = 'none';
            this.indicator.style.display = 'none';
            
            if (this.backdrop?.parentNode) {
                this.backdrop.remove();
            }
            
            this._onClose();
            this._onStateChange(this.state);
            return this;
        }

        destroy() {
            this.close();
            this.container.remove();
            this.indicator.remove();
            if (this.backdrop) this.backdrop.remove();
        }

        // === Content API ===

        setContent(html) {
            this.content.innerHTML = html;
            return this;
        }

        getContentEl() {
            return this.content;
        }

        setTitle(title) {
            const titleEl = this.header.querySelector('.pm-title');
            if (titleEl) titleEl.textContent = title;
            return this;
        }

        setStatus(status) {
            const statusEl = this.indicator.querySelector('.pm-indicator-status');
            if (statusEl) {
                statusEl.className = `pm-indicator-status ${status}`;
            }
            return this;
        }

        // === Utility ===

        _escapeHtml(s) {
            const el = document.createElement('div');
            el.textContent = s;
            return el.innerHTML;
        }
    }

    // === Panel Manager Singleton ===

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

            const panel = new Panel(id, type, options);
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
            return Array.from(this._panels.values()).filter(p => p.state === PANEL_STATES.VISIBLE);
        },

        getMinimized() {
            return Array.from(this._panels.values()).filter(p => p.state === PANEL_STATES.MINIMIZED);
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
                if (panel.state === PANEL_STATES.VISIBLE && !panel.config.critical) {
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
                panels: Array.from(this._panels.values()).map(panel => ({
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
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
            } catch (e) {
                console.warn('[PanelManager] Failed to save state:', e);
            }
            return this;
        },

        loadState() {
            try {
                const saved = localStorage.getItem(this.STORAGE_KEY);
                if (!saved) return this;
                const state = JSON.parse(saved);
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
                        if (savedPanel.state === PANEL_STATES.VISIBLE) {
                            existing.restore();
                        } else if (savedPanel.state === PANEL_STATES.MINIMIZED) {
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
                        if (savedPanel.state === PANEL_STATES.VISIBLE) {
                            panel.show();
                        } else if (savedPanel.state === PANEL_STATES.MINIMIZED) {
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

        clearState() {
            localStorage.removeItem(this.STORAGE_KEY);
            return this;
        },

        // === State Integration with SessionStore ===

        syncWithSessionStore() {
            const store = global.SessionStore;
            if (!store) {
                console.warn('[PanelManager] SessionStore not available');
                return this;
            }

            // Listen for execute changes to auto-open task panel
            store.on('execute', (execute) => {
                const taskPanel = this.getByType('task')[0];
                if (execute && taskPanel?.state === PANEL_STATES.MINIMIZED) {
                    // Auto-restore task panel when new execute arrives
                    taskPanel.restore();
                }
                // Auto-save state on execute changes
                this.saveState();
            });

            // Listen for messages to update chat panel indicator
            store.on('message', () => {
                const chatPanel = this.getByType('chat')[0];
                if (chatPanel?.state === PANEL_STATES.MINIMIZED) {
                    chatPanel.setStatus('unread');
                }
            });

            // Load saved state after init
            this.loadState();

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
    global.Panel = Panel;

})(typeof window !== 'undefined' ? window : globalThis);
