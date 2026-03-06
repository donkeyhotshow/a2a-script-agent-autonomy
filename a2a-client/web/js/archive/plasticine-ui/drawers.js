/**
 * Plasticine UI - Drawers Module
 * Модуль управления ящиками (drawers)
 */

(function (global) {
    'use strict';

    /**
     * Класс управления ящиками
     */
    class PanelDrawers {
        constructor(options = {}) {
            this.mount = options.mount || document.body;
            this._drawers = new Map(); // side -> drawer data
            this._items = new Map(); // panelId -> item data
            this._dragging = false;
            this._autoOpenThresholdPx = 30;
            this._init();
        }

        _init() {
            ['left', 'right'].forEach(side => this._ensureDrawer(side));
        }

        _ensureDrawer(side) {
            const id = `puiDrawer-${side}`;
            let el = this.mount.querySelector(`#${id}`);
            
            if (!el) {
                el = document.createElement('div');
                el.id = id;
                el.className = `pui-drawer pui-drawer-${side}`;
                el.innerHTML = `
                    <div class="pui-drawer-handle">${side === 'left' ? '❯' : '❮'}</div>
                    <div class="pui-drawer-content">
                        <div class="pui-drawer-drop-list"></div>
                    </div>
                `;
                this.mount.appendChild(el);
            }

            const handle = el.querySelector('.pui-drawer-handle');
            const listEl = el.querySelector('.pui-drawer-drop-list');

            const updateHandleIcon = () => {
                const isOpen = el.classList.contains('open');
                handle.textContent = isOpen ? (side === 'left' ? '❮' : '❯') : (side === 'left' ? '❯' : '❮');
            };

            handle?.addEventListener('click', (e) => {
                e.stopPropagation();
                const d = this._drawers.get(side);
                const willOpen = !el.classList.contains('open');
                if (willOpen) {
                    this.open(side);
                } else {
                    this.close(side);
                }
            });

            this._drawers.set(side, { el, handle, listEl, side });
        }

        open(side) {
            const d = this._drawers.get(side);
            if (!d) return;
            d.el.classList.add('open');
        }

        close(side, opts = {}) {
            const d = this._drawers.get(side);
            if (!d) return;
            d.el.classList.remove('open');
        }

        getDropSideAt(x, y) {
            if (!this._dragging) return null;
            const w = window.innerWidth || document.documentElement.clientWidth || 0;
            if (x <= this._autoOpenThresholdPx) return 'left';
            if (x >= w - this._autoOpenThresholdPx) return 'right';
            return null;
        }

        _autoOpen(side) {
            const d = this._drawers.get(side);
            if (!d) return;
            d.el.classList.add('open');
        }

        handleDragMove(x, y) {
            if (!this._dragging) return;
            const side = this.getDropSideAt(x, y);
            for (const [s, d] of this._drawers.entries()) {
                if (s !== side) d.el.classList.remove('open');
            }
            if (side) this._autoOpen(side);
        }

        dockPanel(panel, side) {
            if (!panel || !panel.id) return;
            const d = this._drawers.get(side);
            if (!d) return;

            const title = panel.container?.querySelector?.('.pui-panel-title')?.textContent || panel.id;
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'pui-drawer-item';
            item.textContent = title;
            item.addEventListener('click', () => {
                this.ui?.restorePanel(panel.id);
                panel.setState('expanded');
            });

            d.listEl.appendChild(item);
            this._items.set(panel.id, { item, side, panel });
            panel.container.style.display = 'none';
        }

        undockPanel(panelId) {
            const entry = this._items.get(panelId);
            if (entry) {
                entry.item?.remove();
                this._items.delete(panelId);
            }
        }

        restorePanel(panelId) {
            const entry = this._items.get(panelId);
            const panel = this.ui?.getPanel?.(panelId) || null;
            if (entry) {
                this.undockPanel(panelId);
            }
            if (panel) {
                panel.setState('expanded');
            }
        }

        removePanel(panelId) {
            const entry = this._items.get(panelId);
            if (entry) {
                entry.item?.remove();
                this._items.delete(panelId);
            }
        }
    }

    // Export
    global.PanelDrawers = PanelDrawers;

})(typeof window !== 'undefined' ? window : global);
