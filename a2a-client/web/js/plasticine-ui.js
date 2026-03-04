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
    const DOCK_STATES = ['minimized', 'docked-left', 'docked-right', 'docked-bottom', 'status-tray', 'drawer-left', 'drawer-right'];

    class PlasticinePanel {
        constructor(container, options = {}) {
        this.container = container;
        this.id = options.id || container.dataset.panelId || 'panel-' + Math.random().toString(36).slice(2, 9);
        this.slot = options.slot || 'floating';
        this.critical = !!options.critical;
        this.nonClosable = !!options.nonClosable;
        this.onClose = options.onClose || (() => {
        });
        this.onStateChange = options.onStateChange || (() => {
        });
        this.cubeEl = null;
        this.zonesContainer = options.zonesContainer || null;
        this.ui = options.ui || null;
        this.state = 'expanded';
        this._slotClass = SLOTS[this.slot] || SLOTS.floating;
        this._drag = {on: false, startX: 0, startY: 0, startLeft: 0, startTop: 0};
        this._resize = {on: false, startX: 0, startY: 0, startW: 0, startH: 0};
        this._cubeEventsBound = false;
        this._closeBtn = null;
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
            this._closeBtn = closeBtn;
            this._applyCloseVisibility();

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
                    this.ui?._drawers?.handleDragMove(e);
                    this.ui?._drawers?.updateDragOver(e.clientX, e.clientY);
                }
                if (this._resize.on) {
                    const dx = e.clientX - this._resize.startX, dy = e.clientY - this._resize.startY;
                    this.container.style.width = Math.max(180, this._resize.startW + dx) + 'px';
                    this.container.style.height = Math.max(120, this._resize.startH + dy) + 'px';
                }
            };
            const up = (e) => {
                if (this._drag.on) {
                    const drawerSide = this.ui?._drawers?.getDropSideAt(e.clientX, e.clientY);
                    if (drawerSide) {
                        this.ui?._drawers?.dockPanel(this, drawerSide);
                    } else {
                        const zone = this._getZoneAt(e.clientX, e.clientY);
                        if (zone === 'docked-left') this.ui?._drawers?.dockPanel(this, 'left');
                        else if (zone === 'docked-right') this.ui?._drawers?.dockPanel(this, 'right');
                        else if (zone) this.setState(zone);
                        else this._clampPosition();
                    }
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
            closeBtn?.addEventListener('click', (e) => {
                if (this.nonClosable) {
                    e.preventDefault();
                    this.minimizeToStatusTray();
                    return;
                }
                this.closeToCube(e);
            });
        }

        _showZones() {
            if (this.zonesContainer) this.zonesContainer.classList.add('active');
            this.ui?._drawers?.setDragging(true);
        }

        _hideZones() {
            if (this.zonesContainer) {
                this.zonesContainer.classList.remove('active');
                this.zonesContainer.querySelectorAll('.pui-zone').forEach(z => z.classList.remove('drag-over'));
            }
            this.ui?._drawers?.setDragging(false);
            this.ui?.setStatusTrayDragOver?.(false);
        }

        _highlightZone(e) {
            let trayHover = false;
            this.zonesContainer?.querySelectorAll('.pui-zone').forEach(z => {
                const r = z.getBoundingClientRect();
                const isInside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
                z.classList.toggle('drag-over', isInside);
                if (isInside && z.dataset.zone === 'status-tray') trayHover = true;
            });
            const overTray = trayHover || this.ui?.isPointOverStatusTray?.(e.clientX, e.clientY);
            this.ui?.setStatusTrayDragOver?.(overTray);
        }

        _getZoneAt(x, y) {
            let zone = null;
            this.zonesContainer?.querySelectorAll('.pui-zone').forEach(z => {
                const r = z.getBoundingClientRect();
                if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) zone = z.dataset.zone;
            });
            if (!zone && this.ui?.isPointOverStatusTray?.(x, y)) zone = 'status-tray';
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
            const wasTray = this.state === 'status-tray';
            if (wasTray && newState !== 'status-tray') {
                this.ui?.detachCubeFromStatusTray?.(this.id);
            }
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
                if (this.cubeEl) {
                    this.cubeEl.classList.remove('visible');
                    this.cubeEl.style.display = '';
                }
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
            } else if (newState === 'status-tray') {
                this.container.style.display = 'none';
                if (this.cubeEl) {
                    this.cubeEl.classList.add('visible');
                    this._bindCubeEvents();
                    this.ui?.attachCubeToStatusTray?.(this.id, this.cubeEl);
                }
            } else if (newState === 'drawer-left' || newState === 'drawer-right') {
                this.container.style.display = 'none';
                if (this.cubeEl) {
                    this.cubeEl.classList.remove('visible');
                    this.cubeEl.style.display = 'none';
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

        /** Minimize into the status tray taskbar */
        minimizeToStatusTray() {
            this.setState('status-tray');
        }

        /** Close to cube - hide panel, show cube at cursor position. No-op when critical. */
        closeToCube(e) {
            if (this.critical) return;
            this.ui?.detachCubeFromStatusTray?.(this.id);
            e = e || window.event;
            if (this.cubeEl) {
                const x = e.clientX || e.pageX || window.innerWidth / 2;
                const y = e.clientY || e.pageY || window.innerHeight / 2;
                this.cubeEl.style.left = (x - 25) + 'px'; // Center cube (50px/2)
                this.cubeEl.style.top = (y - 25) + 'px';
                this.cubeEl.style.right = 'auto';
                this.cubeEl.style.bottom = 'auto';
            }
            this.setState('closed-via-cube');
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
                if (this.state === 'status-tray') {
                    this.expand();
                    this.ui?.bringToFront?.(this.id);
                    return;
                }
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

        setNonClosable(value) {
            this.nonClosable = !!value;
            this._applyCloseVisibility();
        }

        _applyCloseVisibility() {
            if (this._closeBtn) {
                this._closeBtn.style.display = this.nonClosable ? 'none' : '';
            }
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

    class PanelDrawers {
        constructor(options = {}) {
            this.mount = options.mount || document.body;
            this.ui = options.ui || null;
            this._drawers = new Map(); // side -> { el, listEl, manual, autoOpened }
            this._items = new Map(); // panelId -> { side, itemEl }
            this._dragging = false;
            this._autoCloseTimer = null;
            this._autoOpenThresholdPx = 28;

            this._ensureDOM();
        }

        _ensureDOM() {
            this._ensureDrawer('left');
            this._ensureDrawer('right');
        }

        _ensureDrawer(side) {
            const id = `puiDrawer-${side}`;
            let el = this.mount.querySelector(`#${id}`);
            if (!el) {
                el = document.createElement('div');
                el.id = id;
                el.className = `pui-drawer ${side}`;
                el.dataset.side = side;
                el.innerHTML = `
          <button type="button" class="pui-drawer-handle" aria-label="${side} drawer"></button>
          <div class="pui-drawer-inner">
            <div class="pui-drawer-title">${side === 'left' ? 'Left' : 'Right'} drawer</div>
            <div class="pui-drawer-drop-list" data-side="${side}" aria-label="Drop panels here"></div>
          </div>`;
                this.mount.appendChild(el);
            }

            const handle = el.querySelector('.pui-drawer-handle');
            const listEl = el.querySelector('.pui-drawer-drop-list');

            const updateHandleIcon = () => {
                const isOpen = el.classList.contains('open');
                if (side === 'left') handle.textContent = isOpen ? '❮' : '❯';
                else handle.textContent = isOpen ? '❯' : '❮';
            };
            updateHandleIcon();

            handle?.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const d = this._drawers.get(side);
                const willOpen = !el.classList.contains('open');
                if (willOpen) {
                    d.manual = true;
                    d.autoOpened = false;
                    this.open(side);
                } else {
                    d.manual = false;
                    d.autoOpened = false;
                    this.close(side, { force: true });
                }
                updateHandleIcon();
            });

            el.addEventListener('transitionend', () => updateHandleIcon());

            this._drawers.set(side, { el, listEl, manual: false, autoOpened: false });
        }

        setDragging(on) {
            this._dragging = !!on;
            if (this._dragging) {
                this._cancelAutoClose();
            } else {
                this._clearDragOver();
                this._scheduleAutoClose();
            }
        }

        _scheduleAutoClose() {
            this._cancelAutoClose();
            this._autoCloseTimer = setTimeout(() => {
                for (const [side, d] of this._drawers.entries()) {
                    if (d.autoOpened && !d.manual) this.close(side);
                    d.autoOpened = false;
                }
            }, 450);
        }

        _cancelAutoClose() {
            if (this._autoCloseTimer) {
                clearTimeout(this._autoCloseTimer);
                this._autoCloseTimer = null;
            }
        }

        open(side) {
            const d = this._drawers.get(side);
            if (!d) return;
            d.el.classList.add('open');
        }

        close(side, opts = {}) {
            const d = this._drawers.get(side);
            if (!d) return;
            if (!opts.force && d.manual) return;
            d.el.classList.remove('open');
        }

        handleDragMove(e) {
            if (!this._dragging) return;
            const x = e.clientX;
            const w = window.innerWidth || document.documentElement.clientWidth || 0;
            if (x <= this._autoOpenThresholdPx) this._autoOpen('left');
            if (x >= (w - this._autoOpenThresholdPx)) this._autoOpen('right');
        }

        _autoOpen(side) {
            const d = this._drawers.get(side);
            if (!d) return;
            if (!d.el.classList.contains('open')) {
                d.el.classList.add('open');
                if (!d.manual) d.autoOpened = true;
            }
            this._cancelAutoClose();
        }

        updateDragOver(x, y) {
            if (!this._dragging) return;
            const side = this.getDropSideAt(x, y);
            for (const [s, d] of this._drawers.entries()) {
                d.listEl?.classList.toggle('drag-over', side === s);
            }
        }

        _clearDragOver() {
            for (const [, d] of this._drawers.entries()) {
                d.listEl?.classList.remove('drag-over');
            }
        }

        getDropSideAt(x, y) {
            for (const [side, d] of this._drawers.entries()) {
                if (!d.el.classList.contains('open')) continue;
                const r = d.listEl?.getBoundingClientRect?.();
                if (!r) continue;
                if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return side;
            }
            return null;
        }

        dockPanel(panel, side) {
            if (!panel || !panel.id) return;
            const d = this._drawers.get(side);
            if (!d) return;

            // Remove any existing item for this panel (moving between drawers)
            this.removePanel(panel.id);

            const title = panel.container?.querySelector?.('.pui-panel-title')?.textContent || panel.id;
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'pui-drawer-item';
            item.dataset.panelId = panel.id;
            item.innerHTML = `<span class="pui-drawer-item-title">${escapeHtml(String(title))}</span>`;

            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.restorePanel(panel.id);
            });

            d.listEl?.appendChild(item);
            this._items.set(panel.id, { side, itemEl: item });

            panel.setState(side === 'left' ? 'drawer-left' : 'drawer-right');

            if (d.autoOpened && !d.manual) {
                setTimeout(() => this.close(side), 200);
            }
        }

        restorePanel(panelId) {
            const entry = this._items.get(panelId);
            const panel = this.ui?.getPanel?.(panelId) || null;
            if (entry) {
                entry.itemEl?.remove?.();
                this._items.delete(panelId);
            }
            if (!panel) return;

            if (panel.cubeEl) {
                panel.cubeEl.classList.remove('visible');
                panel.cubeEl.style.display = '';
            }
            panel.expand?.();
            this.ui?.bringToFront?.(panelId);
        }

        removePanel(panelId) {
            const entry = this._items.get(panelId);
            if (entry) {
                entry.itemEl?.remove?.();
                this._items.delete(panelId);
            }
        }
    }

    class PlasticineUI {
        constructor(options = {}) {
            this.mount = options.mount || document.body;
            this.zonesContainer = null;
            this.panels = new Map();
            this.cubes = new Map();
            this._maxZIndex = 1000;
            this._activePanelId = null;
            this.statusTrayEl = null;
            this.statusTrayIcons = null;
            this.statusTrayDrop = null;
            this._statusTrayRegistry = new Map();
            this._drawers = null;
            this._ensureStatusTray(true);
            this._ensureZones();
            this._ensureDrawers();
        }

        _ensureStatusTray(force = false) {
            if (this.statusTrayEl && !force) return;
            const tray = document.querySelector('[data-role="status-tray"]');
            this.statusTrayEl = tray;
            this.statusTrayIcons = tray?.querySelector('[data-role="status-tray-icons"]') || null;
            this.statusTrayDrop = tray?.querySelector('[data-role="status-tray-drop"]') || tray;
        }

        isPointOverStatusTray(x, y) {
            this._ensureStatusTray();
            if (!this.statusTrayDrop) return false;
            const rect = this.statusTrayDrop.getBoundingClientRect();
            return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
        }

        setStatusTrayDragOver(active) {
            this._ensureStatusTray();
            if (this.statusTrayEl) {
                this.statusTrayEl.classList.toggle('drag-over', !!active);
            }
        }

        attachCubeToStatusTray(panelId, cubeEl) {
            this._ensureStatusTray();
            if (!this.statusTrayIcons || !cubeEl) return;
            if (this._statusTrayRegistry.has(panelId)) return;
            cubeEl.classList.add('in-tray');
            cubeEl.style.position = 'relative';
            cubeEl.style.left = '';
            cubeEl.style.top = '';
            cubeEl.style.right = '';
            cubeEl.style.bottom = '';
            cubeEl.style.width = '';
            cubeEl.style.height = '';
            this.statusTrayIcons.appendChild(cubeEl);
            this._statusTrayRegistry.set(panelId, cubeEl);
        }

        detachCubeFromStatusTray(panelId) {
            this._ensureStatusTray();
            const cubeEl = this._statusTrayRegistry.get(panelId);
            if (!cubeEl) return;
            cubeEl.classList.remove('in-tray');
            this._statusTrayRegistry.delete(panelId);
            cubeEl.style.position = 'fixed';
            cubeEl.style.width = '';
            cubeEl.style.height = '';
            cubeEl.style.left = '';
            cubeEl.style.top = '';
            cubeEl.style.right = '';
            cubeEl.style.bottom = '';
            this.mount.appendChild(cubeEl);
            const pos = this._findNonOverlappingCubePosition();
            cubeEl.style.left = pos.x + 'px';
            cubeEl.style.top = pos.y + 'px';
            cubeEl.style.right = 'auto';
            cubeEl.style.bottom = 'auto';
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

        _ensureDrawers() {
            if (!this._drawers) this._drawers = new PanelDrawers({ mount: this.mount, ui: this });
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
                ui: this,
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
                this._drawers?.removePanel?.(id);
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
