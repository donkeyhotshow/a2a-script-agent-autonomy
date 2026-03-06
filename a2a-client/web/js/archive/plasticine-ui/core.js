/**
 * Plasticine UI - Core Module
 * Основной класс UI
 */

(function (global) {
    'use strict';

    /**
     * Класс основного UI
     */
    class PlasticineUI {
        constructor(options = {}) {
            this.mount = options.mount || document.body;
            this.panels = new Map(); // id -> panel
            this.cubes = new Map(); // id -> cube element
            this._statusTrayRegistry = new Map();
            this._statusTrayZIndex = 1000;
            
            this._init();
        }

        _init() {
            this._ensureZones();
            this._ensureStatusTray();
        }

        _ensureZones() {
            let zones = this.mount.querySelector('.pui-zones');
            if (!zones) {
                zones = document.createElement('div');
                zones.className = 'pui-zones';
                zones.innerHTML = `
                    <div class="pui-zone" data-zone="docked-left"></div>
                    <div class="pui-zone" data-zone="docked-right"></div>
                    <div class="pui-zone" data-zone="docked-bottom"></div>
                `;
                this.mount.appendChild(zones);
            }
            this.zonesContainer = zones;
        }

        _ensureStatusTray(force = false) {
            if (this.statusTrayEl && !force) return;
            const tray = document.querySelector('[data-role="status-tray"]');
            this.statusTrayEl = tray;
            this.statusTrayDrop = tray?.querySelector('.status-tray-drop');
        }

        isPointOverStatusTray(x, y) {
            this._ensureStatusTray();
            if (!this.statusTrayDrop) return false;
            const rect = this.statusTrayDrop.getBoundingClientRect();
            return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
        }

        addCubeToStatusTray(panelId, cubeEl) {
            this._ensureStatusTray();
            const cubeEl2 = this._statusTrayRegistry.get(panelId);
            if (!cubeEl2) return;
            this._statusTrayRegistry.set(panelId, cubeEl);
            this.cubes.set(panelId, cubeEl);
            this.mount.appendChild(cubeEl);
            const pos = this._findNonOverlappingCubePosition();
            cubeEl.style.left = pos.x + 'px';
            cubeEl.style.top = pos.y + 'px';
            cubeEl.classList.add('visible');
        }

        bringToFront(id) {
            const panel = this.panels.get(id);
            if (panel) {
                const zIndex = this._getNextZIndex();
                panel.container.style.zIndex = zIndex;
            }
            const cube = this.cubes.get(id);
            if (cube) {
                const zIndex = this._getNextZIndex();
                cube.style.zIndex = zIndex;
            }
        }

        _getNextZIndex() {
            return ++this._zIndexCounter || (this._zIndexCounter = 2000);
        }

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

        _findNonOverlappingCubePosition() {
            const cubeSize = 54;
            const margin = 10;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const occupied = this._getOccupiedCubePositions();

            // Grid positions
            for (let x = margin; x <= viewportWidth - cubeSize - margin; x += cubeSize) {
                for (let y = margin; y <= viewportHeight - cubeSize - margin; y += cubeSize) {
                    const overlaps = occupied.some(pos => {
                        return !(x + cubeSize + margin < pos.x ||
                                x > pos.x + pos.width + margin ||
                                y + cubeSize + margin < pos.y ||
                                y > pos.y + pos.height + margin);
                    });
                    if (!overlaps) return { x, y };
                }
            }
            return { x: margin, y: margin };
        }

        addPanel(opts) {
            const id = opts.id || 'panel-' + Math.random().toString(36).slice(2, 9);
            const el = opts.element || createPanelDOM({...opts, id});
            if (!opts.element) this.mount.appendChild(el);
            const cubeEl = createCubeDOM(id, !!opts.critical);

            const pos = this._findNonOverlappingCubePosition();
            cubeEl.style.right = 'auto';
            cubeEl.style.left = pos.x + 'px';
            cubeEl.style.top = pos.y + 'px';

            const zIndex = this._getNextZIndex();
            el.style.zIndex = zIndex;

            this.mount.appendChild(cubeEl);
            const panel = new PlasticinePanel(el, {
                id,
                ui: this,
                ...opts
            });

            this.panels.set(id, panel);
            this.cubes.set(id, cubeEl);

            // Bring to front on header mousedown
            const header = el.querySelector('.pui-panel-header');
            header?.addEventListener('mousedown', () => this.bringToFront(id));

            // Create cube click handler
            cubeEl.addEventListener('click', () => {
                this.bringToFront(id);
                panel.setState('expanded');
            });

            return panel;
        }

        removePanel(id) {
            const panel = this.panels.get(id);
            if (panel) {
                panel.container?.remove();
                panel.destroy();
                this.panels.delete(id);
            }
            const cube = this.cubes.get(id);
            if (cube) {
                cube.remove();
                this.cubes.delete(id);
            }
        }

        getContentEl(id) {
            const p = this.panels.get(id);
            return p?.container?.querySelector('.pui-panel-content') || null;
        }

        getPanel(id) {
            return this.panels.get(id);
        }

        setStatusTrayDragOver(isOver) {
            if (this.statusTrayDrop) {
                this.statusTrayDrop.classList.toggle('drag-over', isOver);
            }
        }
    }

    // Export
    global.PlasticineUI = PlasticineUI;

    // Helper functions from original file
    function createPanelDOM(opts) {
        const id = opts.id || 'panel-' + Math.random().toString(36).slice(2, 9);
        const title = opts.title != null ? opts.title : 'Panel';
        const slot = opts.slot || 'floating';
        const slotClass = SLOTS[slot] || SLOTS.floating;
        
        const div = document.createElement('div');
        div.className = `pui-panel expanded ${slotClass}`;
        div.dataset.panelId = id;
        div.innerHTML = `
            <div class="pui-panel-header">
                <span class="pui-panel-title">${escapeHtml(title)}</span>
                <div class="pui-panel-controls">
                    <button class="pui-btn-minimize" data-action="minimize" title="Minimize">−</button>
                    <button class="pui-btn-close" data-action="close" title="Close">×</button>
                </div>
            </div>
            <div class="pui-panel-content"></div>
            <div class="pui-panel-resize"></div>
        `;
        return div;
    }

    function createCubeDOM(panelId, critical) {
        const div = document.createElement('div');
        div.className = 'pui-cube' + (critical ? ' pui-critical' : '');
        div.dataset.panelId = panelId;
        div.innerHTML = `
            <div class="pui-cube-btn"></div>
            <div class="pui-cube-status idle"></div>
        `;
        return div;
    }

    function createZonesDOM() {
        const div = document.createElement('div');
        div.className = 'pui-zones';
        div.innerHTML = `
            <div class="pui-zone" data-zone="docked-left"></div>
            <div class="pui-zone" data-zone="docked-right"></div>
            <div class="pui-zone" data-zone="docked-bottom"></div>
        `;
        return div;
    }

    function escapeHtml(s) {
        const el = document.createElement('div');
        el.textContent = s;
        return el.innerHTML;
    }

    // Export helpers
    global.createPanelDOM = createPanelDOM;
    global.createCubeDOM = createCubeDOM;
    global.createZonesDOM = createZonesDOM;
    global.escapeHtml = escapeHtml;

})(typeof window !== 'undefined' ? window : global);
