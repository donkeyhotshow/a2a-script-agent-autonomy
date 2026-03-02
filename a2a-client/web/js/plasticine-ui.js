/**
 * Plasticine UI – dynamic adaptive panels. Same behaviour for N panels: drag, resize, minimize, close, cube when minimized, critical styling.
 * Layout by slot: floating | left | right | bottom | header.
 */

(function (global) {
    const SLOTS = {
        floating: 'pui-slot-floating',
        left: 'pui-slot-left',
        right: 'pui-slot-right',
        bottom: 'pui-slot-bottom',
        header: 'pui-slot-header'
    };
    const DOCK_STATES = ['minimized', 'docked-left', 'docked-right', 'docked-bottom'];

    class PlasticinePanel {
        constructor(container, options = {}) {
            this.container = container;
            this.id = options.id || container.dataset.panelId || 'panel-' + Math.random().toString(36).slice(2, 9);
            this.slot = options.slot || 'floating';
            this.critical = !!options.critical;
            this.onClose = options.onClose || (() => {
            });
            this.onStateChange = options.onStateChange || (() => {
            });
            this.cubeEl = null;
            this.zonesContainer = options.zonesContainer || null;
            this.state = 'expanded';
            this._slotClass = SLOTS[this.slot] || SLOTS.floating;
            this._drag = {on: false, startX: 0, startY: 0, startLeft: 0, startTop: 0};
            this._resize = {on: false, startX: 0, startY: 0, startW: 0, startH: 0};
            this._cubeEventsBound = false;
            this._bind();
        }

        _bind() {
            this.container.dataset.panelId = this.id;
            this.container.classList.add('pui-panel', 'expanded', this._slotClass);
            if (this.critical) this.container.classList.add('pui-critical');
            const header = this.container.querySelector('.pui-panel-header');
            const resizeHandle = this.container.querySelector('.pui-panel-resize');
            const minimizeBtn = this.container.querySelector('[data-action="minimize"]');
            const closeBtn = this.container.querySelector('[data-action="close"]');

            header?.addEventListener('mousedown', (e) => {
                if (e.target.closest('.pui-panel-control-btn')) return;
                this._drag.on = true;
                this._drag.startX = e.clientX;
                this._drag.startY = e.clientY;
                const r = this.container.getBoundingClientRect();
                this._drag.startLeft = r.left;
                this._drag.startTop = r.top;
                this.container.classList.add('dragging');
                this._showZones();
                e.preventDefault();
            });

            resizeHandle?.addEventListener('mousedown', (e) => {
                this._resize.on = true;
                this._resize.startX = e.clientX;
                this._resize.startY = e.clientY;
                this._resize.startW = this.container.offsetWidth;
                this._resize.startH = this.container.offsetHeight;
                this.container.classList.add('resizing');
                e.preventDefault();
                e.stopPropagation();
            });

            const move = (e) => {
                if (this._drag.on) {
                    const dx = e.clientX - this._drag.startX, dy = e.clientY - this._drag.startY;
                    this.container.style.left = (this._drag.startLeft + dx) + 'px';
                    this.container.style.top = (this._drag.startTop + dy) + 'px';
                    this.container.style.right = this.container.style.bottom = 'auto';
                    this._highlightZone(e);
                }
                if (this._resize.on) {
                    const dx = e.clientX - this._resize.startX, dy = e.clientY - this._resize.startY;
                    this.container.style.width = Math.max(180, this._resize.startW + dx) + 'px';
                    this.container.style.height = Math.max(120, this._resize.startH + dy) + 'px';
                }
            };
            const up = (e) => {
                if (this._drag.on) {
                    const zone = this._getZoneAt(e.clientX, e.clientY);
                    if (zone) this.setState(zone);
                    else this._clampPosition();
                    this.container.classList.remove('dragging');
                    this._hideZones();
                    this._drag.on = false;
                }
                if (this._resize.on) {
                    this.container.classList.remove('resizing');
                    this._resize.on = false;
                }
            };
            document.addEventListener('mousemove', move);
            document.addEventListener('mouseup', up);
            this._cleanup = () => {
                document.removeEventListener('mousemove', move);
                document.removeEventListener('mouseup', up);
            };

            minimizeBtn?.addEventListener('click', () => this.minimizeToFooter());
            closeBtn?.addEventListener('click', (e) => this.closeToCube(e));
        }

        _showZones() {
            if (this.zonesContainer) this.zonesContainer.classList.add('active');
        }

        _hideZones() {
            if (this.zonesContainer) {
                this.zonesContainer.classList.remove('active');
                this.zonesContainer.querySelectorAll('.pui-zone').forEach(z => z.classList.remove('drag-over'));
            }
        }

        _highlightZone(e) {
            this.zonesContainer?.querySelectorAll('.pui-zone').forEach(z => {
                const r = z.getBoundingClientRect();
                z.classList.toggle('drag-over', e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom);
            });
        }

        _getZoneAt(x, y) {
            let zone = null;
            this.zonesContainer?.querySelectorAll('.pui-zone').forEach(z => {
                const r = z.getBoundingClientRect();
                if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) zone = z.dataset.zone;
            });
            return zone;
        }

        _clampPosition() {
            const left = parseInt(this.container.style.left, 10) || 20;
            const top = parseInt(this.container.style.top, 10) || 20;
            const maxL = window.innerWidth - this.container.offsetWidth;
            const maxT = window.innerHeight - this.container.offsetHeight;
            this.container.style.left = Math.max(0, Math.min(left, maxL)) + 'px';
            this.container.style.top = Math.max(0, Math.min(top, maxT)) + 'px';
        }

        setState(newState) {
            this.container.classList.remove('expanded', ...DOCK_STATES);
            this.container.classList.add(newState);
            this.state = newState;

            const styles = this.container.style;
            if (newState === 'expanded') {
                styles.width = '';
                styles.height = '';
                styles.left = '';
                styles.top = '';
                styles.right = '';
                styles.bottom = '';
                this.container.classList.add(this._slotClass);
                this.container.style.display = '';
            } else if (newState === 'minimized') {
                this.container.style.display = 'none';
                if (this.cubeEl) {
                    this.cubeEl.classList.add('visible');
                    this.cubeEl.style.display = 'flex';
                }
            } else if (newState === 'docked-left') {
                styles.width = '60px';
                styles.height = 'calc(100vh - 100px)';
                styles.left = '10px';
                styles.top = '50px';
                styles.right = 'auto';
                styles.bottom = 'auto';
            } else if (newState === 'docked-right') {
                styles.width = '60px';
                styles.height = 'calc(100vh - 100px)';
                styles.left = 'auto';
                styles.top = '50px';
                styles.right = '10px';
                styles.bottom = 'auto';
            } else if (newState === 'docked-bottom') {
                styles.width = 'calc(100% - 300px)';
                styles.height = '60px';
                styles.left = '150px';
                styles.top = 'auto';
                styles.right = 'auto';
                styles.bottom = '10px';
            } else if (newState === 'closed-via-cube') {
                this.container.style.display = 'none';
                if (this.cubeEl) {
                    this.cubeEl.classList.add('visible');
                    this._bindCubeEvents();
                }
            }
            this.onStateChange(this.state);
        }

        expand() {
            this.container.style.display = '';
            this.setState('expanded');
            if (this.cubeEl) {
                this.cubeEl.classList.remove('visible');
                // Reset cube position to default (bottom right)
                const idx = Array.from(this.cubeEl.parentElement?.querySelectorAll('.pui-cube') || []).indexOf(this.cubeEl);
                this.cubeEl.style.right = (20 + idx * 54) + 'px';
                this.cubeEl.style.bottom = '20px';
                this.cubeEl.style.left = 'auto';
                this.cubeEl.style.top = 'auto';
            }
        }

        minimize() {
            this.setState('minimized');
        }

        /** Minimize to footer - narrow strip with only title */
        minimizeToFooter() {
            this.setState('docked-bottom');
            if (this.cubeEl) this.cubeEl.classList.remove('visible');
        }

        /** Close to cube - hide panel, show cube at cursor position. No-op when critical. */
        closeToCube(e) {
            if (this.critical) return;
            e = e || window.event;
            // Hide the panel
            this.container.style.display = 'none';
            // Show cube at cursor position
            if (this.cubeEl) {
                const x = e.clientX || e.pageX || window.innerWidth / 2;
                const y = e.clientY || e.pageY || window.innerHeight / 2;
                this.cubeEl.style.left = (x - 25) + 'px'; // Center cube (50px/2)
                this.cubeEl.style.top = (y - 25) + 'px';
                this.cubeEl.style.right = 'auto';
                this.cubeEl.style.bottom = 'auto';
                this.cubeEl.classList.add('visible');
                this._bindCubeEvents();
            }
            this.state = 'closed-via-cube';
            this.onStateChange(this.state);
        }

        /** Bind drag and right-click events to cube */
        _bindCubeEvents() {
            if (!this.cubeEl || this._cubeEventsBound) return;

            const cube = this.cubeEl;
            let isDragging = false;
            let dragOffsetX = 0;
            let dragOffsetY = 0;

            // Colors for right-click cycling
            const colors = ['#6366f1', '#22c55e', '#f97316', '#f85149', '#8b949e'];
            let colorIndex = 0;

            // Left mouse button drag
            cube.addEventListener('mousedown', (e) => {
                if (e.button === 0) { // Left button
                    isDragging = true;
                    dragOffsetX = e.clientX - cube.offsetLeft;
                    dragOffsetY = e.clientY - cube.offsetTop;
                    cube.classList.add('dragging');
                    e.preventDefault();
                    e.stopPropagation();
                }
            });

            // Mouse move for drag (also handle outside cube)
            const handleMouseMove = (e) => {
                if (isDragging) {
                    cube.style.left = (e.clientX - dragOffsetX) + 'px';
                    cube.style.top = (e.clientY - dragOffsetY) + 'px';
                    cube.style.right = 'auto';
                    cube.style.bottom = 'auto';
                }
            };
            document.addEventListener('mousemove', handleMouseMove);

            // Mouse up to stop drag
            const handleMouseUp = (e) => {
                if (e.button === 0 && isDragging) {
                    isDragging = false;
                    cube.classList.remove('dragging');
                }
            };
            document.addEventListener('mouseup', handleMouseUp);

            // Also need global mousemove for dragging outside cube

            // Right click - change color
            cube.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                colorIndex = (colorIndex + 1) % colors.length;
                cube.style.borderColor = colors[colorIndex];
                const statusEl = cube.querySelector('.pui-cube-status');
                if (statusEl) {
                    statusEl.style.background = colors[colorIndex];
                }
            });

            // Left click - restore panel
            cube.addEventListener('click', (e) => {
                if (!isDragging) {
                    this.expand();
                }
            });

            this._cubeEventsBound = true;
        }

        toggle() {
            this.state === 'minimized' ? this.expand() : this.minimize();
        }

        setCritical(c) {
            this.critical = !!c;
            this.container.classList.toggle('pui-critical', this.critical);
            if (this.cubeEl) this.cubeEl.classList.toggle('pui-critical', this.critical);
        }

        setCubeStatus(status) {
            if (this.cubeEl) {
                const s = this.cubeEl.querySelector('.pui-cube-status');
                if (s) s.className = 'pui-cube-status ' + (status || 'idle');
            }
        }

        destroy() {
            this._cleanup?.();
            this.container.remove();
            this.cubeEl?.remove();
        }
    }

    function createPanelDOM(opts) {
        const id = opts.id || 'panel-' + Math.random().toString(36).slice(2, 9);
        const title = opts.title != null ? opts.title : 'Panel';
        const slot = opts.slot || 'floating';
        const slotClass = SLOTS[slot] || SLOTS.floating;
        const div = document.createElement('div');
        div.className = `pui-panel expanded ${slotClass}`;
        div.dataset.panelId = id;
        if (opts.critical) div.classList.add('pui-critical');
        div.innerHTML = `
      <div class="pui-panel-header">
        <span class="pui-panel-title">${escapeHtml(String(title))}</span>
        <div class="pui-panel-controls">
          <button type="button" class="pui-panel-control-btn" data-action="minimize" title="Minimize">−</button>
          <button type="button" class="pui-panel-control-btn" title="Maximize">□</button>
          <button type="button" class="pui-panel-control-btn" data-action="close" title="Close">×</button>
        </div>
      </div>
      <div class="pui-panel-content">${opts.contentHTML != null ? opts.contentHTML : ''}</div>
      <div class="pui-panel-resize"></div>`;
        return div;
    }

    function createCubeDOM(panelId, critical) {
        const div = document.createElement('div');
        div.className = 'pui-cube' + (critical ? ' pui-critical' : '');
        div.dataset.panelId = panelId;
        div.innerHTML = '<span class="pui-cube-status idle"></span><button type="button" class="pui-cube-btn"></button>';
        return div;
    }

    function createZonesDOM() {
        const div = document.createElement('div');
        div.className = 'pui-zones';
        div.id = 'puiZones';
        div.innerHTML = `
      <div class="pui-zone left" data-zone="docked-left" title="Dock left">◀</div>
      <div class="pui-zone right" data-zone="docked-right" title="Dock right">▶</div>
      <div class="pui-zone bottom" data-zone="docked-bottom" title="Dock bottom">▼</div>`;
        return div;
    }

    function escapeHtml(s) {
        const el = document.createElement('div');
        el.textContent = s;
        return el.innerHTML;
    }

    class PlasticineUI {
        constructor(options = {}) {
            this.mount = options.mount || document.body;
            this.zonesContainer = null;
            this.panels = new Map();
            this.cubes = new Map();
            this._maxZIndex = 1000;
            this._activePanelId = null;
            this._ensureZones();
        }

        /**
         * Get next z-index for panels/cubes
         * @returns {number}
         */
        _getNextZIndex() {
            return ++this._maxZIndex;
        }

        /**
         * Bring panel/cube to front
         * @param {string} id - panel ID
         */
        bringToFront(id) {
            const panel = this.panels.get(id);
            if (panel) {
                const zIndex = this._getNextZIndex();
                panel.container.style.zIndex = zIndex;
                this._activePanelId = id;
            }
            const cube = this.cubes.get(id);
            if (cube) {
                const zIndex = this._getNextZIndex();
                cube.style.zIndex = zIndex;
            }
        }

        /**
         * Get occupied positions for cubes (for non-overlap positioning)
         * @returns {Array} array of {x, y, width, height} rectangles
         */
        _getOccupiedCubePositions() {
            const positions = [];
            this.cubes.forEach((cube) => {
                if (cube.classList.contains('visible') || cube.style.display !== 'none') {
                    const r = cube.getBoundingClientRect();
                    positions.push({
                        x: r.left,
                        y: r.top,
                        width: r.width,
                        height: r.height
                    });
                }
            });
            return positions;
        }

        /**
         * Find non-overlapping position for a new cube
         * @returns {Object} {x, y} position
         */
        _findNonOverlappingCubePosition() {
            const cubeSize = 54; // 50px + 4px margin
            const margin = 10;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const occupied = this._getOccupiedCubePositions();

            // Try positions from bottom-right corner, moving left and up
            for (let y = viewportHeight - cubeSize - margin; y >= margin; y -= cubeSize) {
                for (let x = viewportWidth - cubeSize - margin; x >= margin; x -= cubeSize) {
                    const overlaps = occupied.some(pos => {
                        return !(x + cubeSize + margin < pos.x ||
                            x > pos.x + pos.width + margin ||
                            y + cubeSize + margin < pos.y ||
                            y > pos.y + pos.height + margin);
                    });
                    if (!overlaps) {
                        return {x, y};
                    }
                }
            }

            // Fallback: cascade from top-left
            return {
                x: margin + (this.cubes.size * 10) % (viewportWidth - cubeSize),
                y: margin + (this.cubes.size * 10) % (viewportHeight - cubeSize)
            };
        }

        _ensureZones() {
            let zones = this.mount.querySelector('#puiZones') || this.mount.querySelector('.pui-zones');
            if (!zones) {
                zones = createZonesDOM();
                this.mount.appendChild(zones);
            }
            this.zonesContainer = zones;
        }

        addPanel(opts) {
            const id = opts.id || 'panel-' + Math.random().toString(36).slice(2, 9);
            const el = opts.element || createPanelDOM({...opts, id});
            if (!opts.element) this.mount.appendChild(el);
            const cubeEl = createCubeDOM(id, !!opts.critical);

            // Use non-overlapping position for cube
            const pos = this._findNonOverlappingCubePosition();
            cubeEl.style.right = 'auto';
            cubeEl.style.bottom = 'auto';
            cubeEl.style.left = pos.x + 'px';
            cubeEl.style.top = pos.y + 'px';

            // Set initial z-index
            const zIndex = this._getNextZIndex();
            el.style.zIndex = zIndex;
            cubeEl.style.zIndex = zIndex;

            this.mount.appendChild(cubeEl);
            const panel = new PlasticinePanel(el, {
                id,
                slot: opts.slot,
                critical: opts.critical,
                zonesContainer: this.zonesContainer,
                onClose: () => {
                    this.removePanel(id);
                    opts.onClose?.();
                },
                onStateChange: opts.onStateChange
            });
            panel.cubeEl = cubeEl;

            // Click on cube expands panel (also handled in _bindCubeEvents for closed-via-cube)
            cubeEl.addEventListener('click', () => {
                if (panel.state === 'closed-via-cube') {
                    panel.expand();
                } else if (panel.state === 'minimized') {
                    panel.expand();
                }
                this.bringToFront(id);
            });

            // Bring to front on panel header mousedown
            const header = el.querySelector('.pui-panel-header');
            header?.addEventListener('mousedown', () => {
                this.bringToFront(id);
            });

            this.panels.set(id, panel);
            this.cubes.set(id, cubeEl);
            return panel;
        }

        removePanel(id) {
            const panel = this.panels.get(id);
            if (panel) {
                panel.destroy();
                this.panels.delete(id);
                this.cubes.delete(id);
            }
        }

        getPanel(id) {
            return this.panels.get(id) || null;
        }

        getContentEl(id) {
            const p = this.panels.get(id);
            return p?.container?.querySelector('.pui-panel-content') || null;
        }
    }

    global.PlasticinePanel = PlasticinePanel;
    global.PlasticineUI = PlasticineUI;
    global.PlasticineSLOTS = SLOTS;
})(typeof window !== 'undefined' ? window : globalThis);
