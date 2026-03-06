/**
 * Plasticine UI - Panel Module
 * Класс панели
 */

(function (global) {
    'use strict';

    const SLOTS = {
        floating: 'pui-slot-floating',
        left: 'pui-slot-left',
        right: 'pui-slot-right',
        bottom: 'pui-slot-bottom'
    };

    const DOCK_STATES = ['minimized', 'docked-left', 'docked-right', 'docked-bottom', 'status-tray', 'drawer-left', 'drawer-right'];

    /**
     * Класс панели Plasticine
     */
    class PlasticinePanel {
        constructor(container, options = {}) {
            this.container = container;
            this.id = options.id || container?.dataset?.panelId || 'panel-' + Math.random().toString(36).slice(2, 9);
            this.slot = options.slot || 'floating';
            this.critical = !!options.critical;
            this.ui = options.ui || null;
            
            this.state = 'expanded';
            this._drag = { on: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 };
            this._resize = { on: false, startX: 0, startY: 0, startW: 0, startH: 0 };
            this._boundHandlers = {};
            this._init();
        }

        _init() {
            if (this.critical) this.container.classList.add('pui-critical');
            const header = this.container.querySelector('.pui-panel-header');
            const resizeHandle = this.container.querySelector('.pui-panel-resize');
            const minimizeBtn = this.container.querySelector('[data-action="minimize"]');
            const closeBtn = this.container.querySelector('[data-action="close"]');
            this._closeBtn = closeBtn;

            // Drag handlers
            const dragStart = (e) => {
                if (e.target.closest('button')) return;
                this._drag.on = true;
                this._drag.startX = e.clientX;
                this._drag.startY = e.clientY;
                const r = this.container.getBoundingClientRect();
                this._drag.startLeft = r.left;
                this._drag.startTop = r.top;
            };

            const move = (e) => {
                if (this._drag.on) {
                    const dx = e.clientX - this._drag.startX, dy = e.clientY - this._drag.startY;
                    this.container.style.left = (this._drag.startLeft + dx) + 'px';
                    this.container.style.top = (this._drag.startTop + dy) + 'px';
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
                        else this._clampPosition();
                    }
                }
                this._drag.on = false;
                this._resize.on = false;
            };

            this._boundHandlers = { dragStart, move, up };
            header?.addEventListener('mousedown', dragStart);
            window.addEventListener('mousemove', move);
            window.addEventListener('mouseup', up);

            resizeHandle?.addEventListener('mousedown', (e) => {
                this._resize.on = true;
                this._resize.startX = e.clientX;
                this._resize.startY = e.clientY;
                this._resize.startW = this.container.offsetWidth;
                this._resize.startH = this.container.offsetHeight;
            });

            minimizeBtn?.addEventListener('click', () => this.minimize());
            closeBtn?.addEventListener('click', () => this.close());
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
            const wasTray = this.state === 'status-tray';
            if (wasTray && newState !== 'status-tray') {
                this.container.style.display = '';
            }

            const styles = this.container.style;
            if (newState === 'expanded') {
                styles.display = '';
                this.container.classList.remove('minimized', 'docked-left', 'docked-right', 'docked-bottom');
            } else if (newState === 'minimized') {
                styles.display = 'none';
                this.container.classList.add('minimized');
            }
            this.state = newState;
        }

        minimize() {
            this.setState('minimized');
            this._createCube();
        }

        close() {
            this.setState('closed');
            this.container.style.display = 'none';
            if (this._closeBtn) this._closeBtn.style.display = 'none';
        }

        _createCube() {
            // Create cube for minimized state
            const cube = document.createElement('div');
            cube.className = 'pui-cube' + (this.critical ? ' pui-critical' : '');
            cube.dataset.panelId = this.id;
            cube.innerHTML = `
                <div class="pui-cube-btn"></div>
                <div class="pui-cube-status idle"></div>
            `;
            document.body.appendChild(cube);
            this.cubeEl = cube;
        }

        setStatus(status) {
            if (this.cubeEl) {
                const s = this.cubeEl.querySelector('.pui-cube-status');
                if (s) s.className = 'pui-cube-status ' + (status || 'idle');
            }
        }

        destroy() {
            // Cleanup
            this._boundHandlers && Object.values(this._boundHandlers).forEach(fn => {
                if (typeof fn === 'function') {
                    window.removeEventListener('mousemove', fn);
                    window.removeEventListener('mouseup', fn);
                }
            });
        }
    }

    // Export
    global.PlasticinePanel = PlasticinePanel;
    global.SLOTS = SLOTS;
    global.DOCK_STATES = DOCK_STATES;

})(typeof window !== 'undefined' ? window : global);
