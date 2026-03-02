/**
 * PanelDock - атомарный компонент docked зон
 * Логика: приём панелей слева/справа/снизу, рендер содержимого в docked режиме
 */

(function (global) {
    'use strict';

    // Доступные позиции для dock
    const DOCK_POSITIONS = {
        'docked-left': {icon: '◀', title: 'Dock left'},
        'docked-right': {icon: '▶', title: 'Dock right'},
        'docked-bottom': {icon: '▼', title: 'Dock bottom'}
    };

    // Slot to dock position mapping
    const SLOT_TO_DOCK = {
        'left': 'docked-left',
        'right': 'docked-right',
        'bottom': 'docked-bottom'
    };

    /**
     * PanelDock - класс для управления docked зонами
     */
    class PanelDock {
        /**
         * @param {HTMLElement} container - контейнер для зон
         * @param {Object} options
         * @param {Function} options.onDock - колбэк при dock панели (zone, panelId)
         */
        constructor(container, options = {}) {
            this.container = container;
            this.onDock = options.onDock || (() => {
            });
            this.panels = new Map(); // zone -> array of panel IDs
            this.maxPanels = {
                'docked-left': 1,
                'docked-right': 1,
                'docked-bottom': 2
            };

            this._initDOM();
        }

        /**
         * Check if zone has capacity for more panels
         * @param {string} zone
         * @returns {boolean}
         */
        hasCapacity(zone) {
            const panels = this.panels.get(zone) || [];
            const max = this.maxPanels[zone] || 1;
            return panels.length < max;
        }

        /**
         * Get panels in zone
         * @param {string} zone
         * @returns {string[]}
         */
        getPanelsInZone(zone) {
            return this.panels.get(zone) || [];
        }

        /**
         * Инициализировать DOM элементы зон
         * @private
         */
        _initDOM() {
            this.container.classList.add('pui-dock-container');

            // Создать зоны для каждой позиции
            Object.entries(DOCK_POSITIONS).forEach(([zone, config]) => {
                const zoneEl = document.createElement('div');
                zoneEl.className = `pui-dock-zone ${zone.replace('docked-', '')}`;
                zoneEl.dataset.zone = zone;
                zoneEl.title = config.title;
                zoneEl.innerHTML = `
          <span class="pui-dock-icon">${config.icon}</span>
          <span class="pui-dock-label">${this._getZoneLabel(zone)}</span>`;
                this.container.appendChild(zoneEl);
            });
        }

        /**
         * Получить метку зоны
         * @param {string} zone
         * @returns {string}
         * @private
         */
        _getZoneLabel(zone) {
            const labels = {
                'docked-left': 'Left',
                'docked-right': 'Right',
                'docked-bottom': 'Bottom'
            };
            return labels[zone] || zone;
        }

        /**
         * Показать все зоны
         */
        show() {
            this.container.classList.add('active');
        }

        /**
         * Скрыть все зоны
         */
        hide() {
            this.container.classList.remove('active');
        }

        /**
         * Активировать зону (показать подсветку)
         * @param {string} zone
         */
        highlightZone(zone) {
            this.container.querySelectorAll('.pui-dock-zone').forEach(z => {
                z.classList.toggle('active', z.dataset.zone === zone);
            });
        }

        /**
         * Убрать подсветку всех зон
         */
        clearHighlight() {
            this.container.querySelectorAll('.pui-dock-zone').forEach(z => {
                z.classList.remove('active');
            });
        }

        /**
         * Получить зону под курсором
         * @param {number} x
         * @param {number} y
         * @returns {string|null}
         */
        getZoneAt(x, y) {
            let zone = null;
            this.container.querySelectorAll('.pui-dock-zone').forEach(z => {
                const r = z.getBoundingClientRect();
                if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
                    zone = z.dataset.zone;
                }
            });
            return zone;
        }

        /**
         * Добавить панель в зону
         * @param {string} panelId
         * @param {string} zone
         * @returns {boolean} true если успешно
         */
        addPanelToZone(panelId, zone) {
            if (!this.hasCapacity(zone)) {
                console.warn(`[PanelDock] Zone ${zone} is full`);
                return false;
            }

            const panels = this.panels.get(zone) || [];
            if (!panels.includes(panelId)) {
                panels.push(panelId);
                this.panels.set(zone, panels);
                this._updateZoneContent(zone);
                this.onDock(zone, panelId);
            }
            return true;
        }

        /**
         * Удалить панель из зоны
         * @param {string} zone
         */
        removePanelFromZone(zone) {
            const panels = this.panels.get(zone) || [];
            if (panels.length > 0) {
                panels.pop();
                if (panels.length === 0) {
                    this.panels.delete(zone);
                } else {
                    this.panels.set(zone, panels);
                }
                this._updateZoneContent(zone);
            }
        }

        /**
         * Обновить содержимое зоны
         * @param {string} zone
         * @private
         */
        _updateZoneContent(zone) {
            const zoneEl = this.container.querySelector(`[data-zone="${zone}"]`);
            if (!zoneEl) return;

            const panels = this.panels.get(zone) || [];
            if (panels.length > 0) {
                zoneEl.classList.add('has-panel');
                zoneEl.dataset.panelId = panels.join(',');
                zoneEl.dataset.panelCount = panels.length;
            } else {
                zoneEl.classList.remove('has-panel');
                delete zoneEl.dataset.panelId;
                delete zoneEl.dataset.panelCount;
            }
        }

        /**
         * Получить панель в зоне
         * @param {string} zone
         * @returns {string|null}
         */
        getPanelInZone(zone) {
            const panels = this.panels.get(zone) || [];
            return panels.length > 0 ? panels[panels.length - 1] : null;
        }

        /**
         * Проверить, есть ли панель в зоне
         * @param {string} zone
         * @returns {boolean}
         */
        hasPanelInZone(zone) {
            const panels = this.panels.get(zone) || [];
            return panels.length > 0;
        }

        /**
         * Получить все занятые зоны
         * @returns {string[]}
         */
        getOccupiedZones() {
            return Array.from(this.panels.keys());
        }

        /**
         * Показать превью панели в зоне (drag over)
         * @param {string} zone
         */
        showPreview(zone) {
            const zoneEl = this.container.querySelector(`[data-zone="${zone}"]`);
            if (zoneEl) {
                zoneEl.classList.add('drag-over');
            }
        }

        /**
         * Скрыть превью панели в зоне
         * @param {string} zone
         */
        hidePreview(zone) {
            const zoneEl = this.container.querySelector(`[data-zone="${zone}"]`);
            if (zoneEl) {
                zoneEl.classList.remove('drag-over');
            }
        }

        /**
         * Скрыть все превью
         */
        hideAllPreviews() {
            this.container.querySelectorAll('.pui-dock-zone').forEach(z => {
                z.classList.remove('drag-over');
            });
        }

        /**
         * Установить контент для docked панели
         * @param {HTMLElement} panelContentEl
         * @param {string} zone
         */
        renderDockedContent(panelContentEl, zone) {
            if (!panelContentEl) return;

            // В docked режиме контент может быть свернут или показан частично
            if (zone === 'docked-left' || zone === 'docked-right') {
                // Вертикальная ориентация - скрыть основной контент
                panelContentEl.style.display = 'none';
            } else if (zone === 'docked-bottom') {
                // Горизонтальная ориентация - показать компактный контент
                panelContentEl.classList.add('pui-docked-compact');
            }
        }

        /**
         * Восстановить контент после undock
         * @param {HTMLElement} panelContentEl
         */
        restoreContent(panelContentEl) {
            if (!panelContentEl) return;
            panelContentEl.style.display = '';
            panelContentEl.classList.remove('pui-docked-compact');
        }

        /**
         * Получить позицию слота для dock позиции
         * @param {string} dockPosition
         * @returns {string}
         */
        static getSlotForDock(dockPosition) {
            const reverseMap = {
                'docked-left': 'left',
                'docked-right': 'right',
                'docked-bottom': 'bottom'
            };
            return reverseMap[dockPosition] || 'floating';
        }

        /**
         * Получить dock позицию для слота
         * @param {string} slot
         * @returns {string|null}
         */
        static getDockForSlot(slot) {
            return SLOT_TO_DOCK[slot] || null;
        }

        /**
         * Уничтожить
         */
        destroy() {
            this.panels.clear();
            this.container.remove();
        }
    }

    /**
     * Создать DOM контейнера для dock зон
     * @returns {HTMLElement}
     */
    function createDockContainerDOM() {
        const div = document.createElement('div');
        div.className = 'pui-dock-zones';
        div.id = 'puiDockZones';
        return div;
    }

    // Export
    global.PanelDock = PanelDock;
    global.createDockContainerDOM = createDockContainerDOM;
    global.DOCK_POSITIONS = DOCK_POSITIONS;

})(typeof window !== 'undefined' ? window : globalThis);
