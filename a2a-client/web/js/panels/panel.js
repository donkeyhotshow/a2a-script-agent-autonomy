/**
 * Panel Class - Individual panel instance
 */
(function (global) {
    'use strict';

    class Panel {
        constructor(id, type, options = {}) {
            this.id = id;
            this.type = type;
            this.config = { ...global.PANEL_TYPES[type], ...options };
            this.state = global.PANEL_STATES.CREATED;

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
                if (global.PanelManager?.saveState) {
                    global.PanelManager.saveState();
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

            // Header (no header for taskbar)
            if (this.config.slot !== 'taskbar') {
                this.header = document.createElement('div');
                this.header.className = 'pm-header';
                this.header.innerHTML = `
                    <span class="pm-title">${this._escapeHtml(this.config.title)}</span>
                    <div class="pm-controls">
                        ${this.config.slot !== 'modal' ?
                            `<button type="button" class="pm-btn pm-btn-maximize" title="Maximize">□</button>
                            <button type="button" class="pm-btn pm-btn-minimize" title="Minimize">−</button>` : ''}
                        ${!this.config.critical ?
                            `<button type="button" class="pm-btn pm-btn-close" title="Close">×</button>` : ''}
                    </div>
                `;
            } else {
                // Taskbar has no header
                this.header = document.createElement('div');
                this.header.style.display = 'none';
            }

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
                this.backdrop.className = 'pm-backdrop pm-modal-backdrop';
                this.backdrop.addEventListener('click', () => this.close());
            }
        }

        _bindEvents() {
            // Header buttons
            const maximizeBtn = this.header?.querySelector('.pm-btn-maximize');
            const minimizeBtn = this.header?.querySelector('.pm-btn-minimize');
            const closeBtn = this.header?.querySelector('.pm-btn-close');

            if (maximizeBtn) {
                maximizeBtn.addEventListener('click', () => this.toggleMaximize());
            }
            if (minimizeBtn) {
                minimizeBtn.addEventListener('click', () => this.minimize());
            }
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.close());
            }

            // Header drag (for floating panels)
            if (this.header && this.config.slot === 'floating') {
                this.header.addEventListener('mousedown', (e) => {
                    if (e.target.closest('.pm-btn')) return; // Don't drag on buttons
                    this._startDrag(e);
                });
                this.header.style.cursor = 'move';
            }

            // Indicator click (restore from minimized)
            this.indicator.addEventListener('click', () => {
                if (this.state === global.PANEL_STATES.MINIMIZED) {
                    this.restore();
                }
            });

            // Double-click header to maximize
            if (this.header && this.config.slot === 'floating') {
                this.header.addEventListener('dblclick', () => this.toggleMaximize());
            }
        }

        _startDrag(e) {
            if (this.state === global.PANEL_STATES.MAXIMIZED) return;

            e.preventDefault();
            const startX = e.clientX;
            const startY = e.clientY;
            const startLeft = this.position.x;
            const startTop = this.position.y;

            this.container.classList.add('pm-dragging');

            const moveHandler = (e) => {
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                this.position.x = Math.max(0, startLeft + deltaX);
                this.position.y = Math.max(0, startTop + deltaY);
                this.container.style.left = `${this.position.x}px`;
                this.container.style.top = `${this.position.y}px`;
            };

            const upHandler = () => {
                this.container.classList.remove('pm-dragging');
                document.removeEventListener('mousemove', moveHandler);
                document.removeEventListener('mouseup', upHandler);
            };

            document.addEventListener('mousemove', moveHandler);
            document.addEventListener('mouseup', upHandler);
        }

        show() {
            if (this.state === global.PANEL_STATES.VISIBLE) return this;

            this.state = global.PANEL_STATES.VISIBLE;
            this.container.style.display = '';
            this.indicator.style.display = 'none';

            if (this.backdrop) {
                document.body.appendChild(this.backdrop);
            }

            global.PanelManager._mount.appendChild(this.container);
            global.PanelManager._mount.appendChild(this.indicator);

            this._onStateChange(this.state);
            return this;
        }

        minimize() {
            if (this.state === global.PANEL_STATES.MINIMIZED) return this;
            // Taskbar cannot be minimized
            if (this.config.slot === 'taskbar') return this;
            // If maximized, save that state before minimizing
            if (this.state === global.PANEL_STATES.MAXIMIZED) {
                this._restoreFromMaximized = true;
            }
            if (this.config.critical) {
                // Critical panels minimize to indicator instead of closing
                this.state = global.PANEL_STATES.MINIMIZED;
                this.container.style.display = 'none';
                this.container.classList.remove('pm-maximized');
                this.indicator.style.display = 'flex';
                this._updateMaximizeButton();
                this._onStateChange(this.state);
            } else {
                this.close();
            }
            return this;
        }

        maximize() {
            if (this.state === global.PANEL_STATES.MAXIMIZED) return this;
            if (this.config.slot !== 'floating') return this; // Only floating panels can maximize

            // Save previous state for restore
            if (this.state === global.PANEL_STATES.VISIBLE) {
                this._savedPosition = { ...this.position };
                this._savedSize = { ...this.size };
            }

            this.state = global.PANEL_STATES.MAXIMIZED;
            this.container.classList.add('pm-maximized');
            this._updateMaximizeButton();
            this._onStateChange(this.state);

            global.PanelManager.bringToFront(this.id);
            return this;
        }

        unmaximize() {
            if (this.state !== global.PANEL_STATES.MAXIMIZED) return this;

            this.state = global.PANEL_STATES.VISIBLE;
            this.container.classList.remove('pm-maximized');

            // Restore saved position and size
            if (this._savedPosition && this._savedSize) {
                this.position = { ...this._savedPosition };
                this.size = { ...this._savedSize };
                this.container.style.left = `${this.position.x}px`;
                this.container.style.top = `${this.position.y}px`;
                this.container.style.width = `${this.size.width}px`;
                this.container.style.height = `${this.size.height}px`;
            }

            this._updateMaximizeButton();
            this._onStateChange(this.state);
            return this;
        }

        toggleMaximize() {
            if (this.state === global.PANEL_STATES.MAXIMIZED) {
                return this.unmaximize();
            } else {
                return this.maximize();
            }
        }

        _updateMaximizeButton() {
            const btn = this.header?.querySelector('.pm-btn-maximize');
            if (!btn) return;
            if (this.state === global.PANEL_STATES.MAXIMIZED) {
                btn.innerHTML = '❐'; // Restore icon
                btn.title = 'Restore';
            } else {
                btn.innerHTML = '□'; // Maximize icon
                btn.title = 'Maximize';
            }
        }

        restore() {
            if (this.state === global.PANEL_STATES.VISIBLE && !this._restoreFromMaximized) return this;
            // Taskbar is always visible
            if (this.config.slot === 'taskbar') return this;

            // If coming from minimized maximized state
            if (this._restoreFromMaximized) {
                this._restoreFromMaximized = false;
                return this.maximize();
            }

            // If was maximized, restore to maximized
            if (this._wasMaximized) {
                this._wasMaximized = false;
                return this.maximize();
            }

            this.state = global.PANEL_STATES.VISIBLE;
            this.container.style.display = '';
            this.container.classList.remove('pm-maximized');
            this.indicator.style.display = 'none';
            this._updateMaximizeButton();
            this._onStateChange(this.state);

            global.PanelManager.bringToFront(this.id);
            return this;
        }

        close() {
            if (this.state === global.PANEL_STATES.CLOSED) return this;
            // Taskbar cannot be closed
            if (this.config.slot === 'taskbar') return this;
            if (this.config.critical && this.config.slot !== 'modal') {
                // Critical non-modal panels minimize instead of close
                return this.minimize();
            }

            this.state = global.PANEL_STATES.CLOSED;
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

    // Export
    global.Panel = Panel;

})(typeof window !== 'undefined' ? window : globalThis);