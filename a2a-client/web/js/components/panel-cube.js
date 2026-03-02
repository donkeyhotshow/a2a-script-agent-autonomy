/**
 * PanelCube - атомарный компонент куба (минимизированная панель)
 * Логика: создание куба при close, drag, клик - открыть панель, правый клик - сменить цвет
 */

(function (global) {
    'use strict';

    // Цвета для смены при правом клике
    const CUBE_COLORS = ['#6366f1', '#22c55e', '#f97316', '#3b82f6', '#8b5cf6', '#ef4444'];
    let colorIndex = 0;

    /**
     * Создать DOM элемент куба
     * @param {string} panelId - ID панели
     * @param {boolean} critical - критическая панель
     * @returns {HTMLElement}
     */
    function createCubeDOM(panelId, critical) {
        const div = document.createElement('div');
        div.className = 'pui-cube' + (critical ? ' pui-critical' : '');
        div.dataset.panelId = panelId;
        div.innerHTML = `
      <span class="pui-cube-status idle"></span>
      <button type="button" class="pui-cube-btn"></button>`;
        return div;
    }

    /**
     * PanelCube - класс для управления кубом панели
     */
    class PanelCube {
        /**
         * @param {HTMLElement} cubeEl - DOM элемент куба
         * @param {Object} options
         * @param {Function} options.onClick - колбэк при клике (открыть панель)
         * @param {Function} options.onRightClick - колбэк при правом клике (сменить цвет)
         * @param {Function} options.onDragStart - колбэк при начале drag
         * @param {Function} options.onDragEnd - колбэк при окончании drag
         */
        constructor(cubeEl, options = {}) {
            this.cubeEl = cubeEl;
            this.panelId = cubeEl.dataset.panelId;
            this.onClick = options.onClick || (() => {
            });
            this.onRightClick = options.onRightClick || (() => {
            });
            this.onDragStart = options.onDragStart || (() => {
            });
            this.onDragEnd = options.onDragEnd || (() => {
            });

            this._drag = {
                on: false,
                startX: 0,
                startY: 0,
                startLeft: 0,
                startTop: 0
            };

            this._bind();
        }

        /**
         * Привязка обработчиков событий
         * @private
         */
        _bind() {
            // Левый клик - открыть панель
            this.cubeEl.addEventListener('click', (e) => {
                if (!this._drag.on) {
                    this.onClick(this);
                }
            });

            // Правый клик - сменить цвет
            this.cubeEl.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this._cycleColor();
                this.onRightClick(this, this.getCurrentColor());
            });

            // Drag start
            this.cubeEl.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return; // только левую кнопку
                this._drag.on = true;
                this._drag.startX = e.clientX;
                this._drag.startY = e.clientY;
                const r = this.cubeEl.getBoundingClientRect();
                this._drag.startLeft = r.left;
                this._drag.startTop = r.top;
                this.cubeEl.classList.add('dragging');

                // Bring to front on drag start
                this.cubeEl.style.zIndex = String(parseInt(this.cubeEl.style.zIndex) || 1001 + 1);

                this.onDragStart(this, e);
                e.preventDefault();
            });

            // Drag move
            const move = (e) => {
                if (!this._drag.on) return;
                const dx = e.clientX - this._drag.startX;
                const dy = e.clientY - this._drag.startY;
                this.cubeEl.style.left = (this._drag.startLeft + dx) + 'px';
                this.cubeEl.style.top = (this._drag.startTop + dy) + 'px';
                this.cubeEl.style.right = 'auto';
                this.cubeEl.style.bottom = 'auto';
            };

            // Drag end
            const up = (e) => {
                if (!this._drag.on) return;
                this._drag.on = false;
                this.cubeEl.classList.remove('dragging');
                this._clampPosition();
                this.onDragEnd(this, e);
            };

            document.addEventListener('mousemove', move);
            document.addEventListener('mouseup', up);

            this._cleanup = () => {
                document.removeEventListener('mousemove', move);
                document.removeEventListener('mouseup', up);
            };
        }

        /**
         * Ограничить позицию куба в пределах viewport
         * @private
         */
        _clampPosition() {
            const left = parseInt(this.cubeEl.style.left, 10) || 20;
            const top = parseInt(this.cubeEl.style.top, 10) || 20;
            const maxL = window.innerWidth - this.cubeEl.offsetWidth;
            const maxT = window.innerHeight - this.cubeEl.offsetHeight;
            this.cubeEl.style.left = Math.max(0, Math.min(left, maxL)) + 'px';
            this.cubeEl.style.top = Math.max(0, Math.min(top, maxT)) + 'px';
        }

        /**
         * Показать куб
         */
        show() {
            this.cubeEl.classList.add('visible');
            this.cubeEl.style.display = 'flex';
        }

        /**
         * Скрыть куб
         */
        hide() {
            this.cubeEl.classList.remove('visible');
            this.cubeEl.style.display = 'none';
        }

        /**
         * Установить позицию куба
         * @param {number} x
         * @param {number} y
         */
        setPosition(x, y) {
            this.cubeEl.style.left = x + 'px';
            this.cubeEl.style.top = y + 'px';
            this.cubeEl.style.right = 'auto';
            this.cubeEl.style.bottom = 'auto';
        }

        /**
         * Установить позицию справа-снизу с учетом индекса
         * @param {number} index - порядковый номер куба
         */
        setPositionByIndex(index) {
            this.cubeEl.style.right = (20 + index * 54) + 'px';
            this.cubeEl.style.bottom = '20px';
            this.cubeEl.style.left = 'auto';
            this.cubeEl.style.top = 'auto';
        }

        /**
         * Установить текущий цвет кнопки куба
         * @param {string} color
         */
        setButtonColor(color) {
            const btn = this.cubeEl.querySelector('.pui-cube-btn');
            if (btn) {
                btn.style.backgroundColor = color;
            }
        }

        /**
         * Получить текущий цвет кнопки куба
         * @returns {string}
         */
        getCurrentColor() {
            const btn = this.cubeEl.querySelector('.pui-cube-btn');
            return btn ? btn.style.backgroundColor || CUBE_COLORS[0] : CUBE_COLORS[0];
        }

        /**
         * Сменить цвет на следующий
         * @private
         */
        _cycleColor() {
            colorIndex = (colorIndex + 1) % CUBE_COLORS.length;
            this.setButtonColor(CUBE_COLORS[colorIndex]);
        }

        /**
         * Установить статус куба
         * @param {string} status - idle, running, completed
         */
        setStatus(status) {
            const statusEl = this.cubeEl.querySelector('.pui-cube-status');
            if (statusEl) {
                statusEl.className = 'pui-cube-status ' + (status || 'idle');
            }
        }

        /**
         * Установить критичность
         * @param {boolean} critical
         */
        setCritical(critical) {
            this.cubeEl.classList.toggle('pui-critical', critical);
        }

        /**
         * Уничтожить куб
         */
        destroy() {
            this._cleanup?.();
            this.cubeEl.remove();
        }
    }

    // Export
    global.PanelCube = PanelCube;
    global.createCubeDOM = createCubeDOM;
    global.CUBE_COLORS = CUBE_COLORS;

    /**
     * Создать куб в указанной позиции (под курсором мыши)
     * @param {number} x - координата X (event.clientX)
     * @param {number} y - координата Y (event.clientY)
     * @param {string} panelId - ID панели
     * @param {boolean} critical - критическая панель
     * @returns {HTMLElement}
     */
    global.createCubeAtPosition = function (x, y, panelId, critical) {
        const cube = createCubeDOM(panelId, critical);
        cube.classList.add('pui-cube', 'visible');
        cube.style.position = 'fixed';
        cube.style.left = x + 'px';
        cube.style.top = y + 'px';
        cube.style.right = 'auto';
        cube.style.bottom = 'auto';
        document.body.appendChild(cube);
        return cube;
    };

})(typeof window !== 'undefined' ? window : globalThis);
