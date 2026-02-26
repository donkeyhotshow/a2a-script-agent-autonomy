/**
 * FloatingPanel - атомарный компонент плавающей панели
 * Управление состояниями: expanded, minimized, docked-left, docked-right, docked-bottom
 * Поддержка drag, resize, minimize, expand, dock
 */

(function (global) {
  'use strict';

  const DOCK_STATES = ['minimized', 'docked-left', 'docked-right', 'docked-bottom', 'minimized-to-footer', 'closed-via-cube'];

  /**
   * FloatingPanel - класс для управления плавающей панелью
   */
  class FloatingPanel {
    /**
     * @param {HTMLElement} container - DOM элемент панели
     * @param {Object} options - настройки
     * @param {string} options.id - ID панели
     * @param {string} options.slot - слот (floating, left, right, bottom)
     * @param {boolean} options.critical - критическая панель
     * @param {Function} options.onClose - колбэк при закрытии
     * @param {Function} options.onStateChange - колбэк при изменении состояния
     * @param {HTMLElement} options.zonesContainer - контейнер зон для dock
     */
    constructor(container, options = {}) {
      this.container = container;
      this.id = options.id || container.dataset.panelId || 'panel-' + Math.random().toString(36).slice(2, 9);
      this.slot = options.slot || 'floating';
      this.type = options.type || 'task'; // panel type: task, logs, chat, debug, sessions
      this.critical = !!options.critical;
      this.onClose = options.onClose || (() => {});
      this.onStateChange = options.onStateChange || (() => {});
      this.zonesContainer = options.zonesContainer || null;
      this.cubeEl = null;
      this.state = 'expanded';

      // Slot CSS classes mapping
      this._slotClasses = {
        floating: 'pui-slot-floating',
        left: 'pui-slot-left',
        right: 'pui-slot-right',
        bottom: 'pui-slot-bottom',
        header: 'pui-slot-header'
      };
      this._slotClass = this._slotClasses[this.slot] || this._slotClasses.floating;

      // Drag state
      this._drag = {
        on: false,
        startX: 0,
        startY: 0,
        startLeft: 0,
        startTop: 0
      };

      // Resize state
      this._resize = {
        on: false,
        startX: 0,
        startY: 0,
        startW: 0,
        startH: 0
      };

      this._cleanup = null;
      this._bind();
    }

    /**
     * Привязка обработчиков событий
     * @private
     */
    _bind() {
      this.container.dataset.panelId = this.id;
      this.container.classList.add('pui-panel', 'expanded', this._slotClass);
      if (this.critical) this.container.classList.add('pui-critical');

      const header = this.container.querySelector('.pui-panel-header');
      const resizeHandle = this.container.querySelector('.pui-panel-resize');
      const minimizeBtn = this.container.querySelector('[data-action="minimize"]');
      const closeBtn = this.container.querySelector('[data-action="close"]');

      // Drag handlers
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

      // Resize handlers
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

      // Global mouse move handler
      const move = (e) => {
        if (this._drag.on) {
          const dx = e.clientX - this._drag.startX;
          const dy = e.clientY - this._drag.startY;
          this.container.style.left = (this._drag.startLeft + dx) + 'px';
          this.container.style.top = (this._drag.startTop + dy) + 'px';
          this.container.style.right = this.container.style.bottom = 'auto';
          this._highlightZone(e);
        }
        if (this._resize.on) {
          const dx = e.clientX - this._resize.startX;
          const dy = e.clientY - this._resize.startY;
          // Calculate new dimensions with min/max constraints
          const newWidth = Math.max(180, Math.min(this._resize.startW + dx, window.innerWidth - 20));
          const newHeight = Math.max(120, Math.min(this._resize.startH + dy, window.innerHeight - 20));
          this.container.style.width = newWidth + 'px';
          this.container.style.height = newHeight + 'px';
        }
      };

      // Global mouse up handler
      const up = (e) => {
        if (this._drag.on) {
          const zone = this._getZoneAt(e.clientX, e.clientY);
          if (zone) {
            this.setState(zone);
          } else {
            this._clampPosition();
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

      // Minimize/Close buttons
      minimizeBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.minimizeToFooter();
      });
      closeBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        // Создать куб под курсором мыши
        const cube = createCubeAtPosition(e.clientX, e.clientY, this.id, this.critical);
        this.cubeEl = cube;
        // Скрыть панель
        this.container.style.display = 'none';
        // Установить состояние "closed-via-cube"
        this.setState('closed-via-cube');
        this.onClose(this);
      });
    }

    /**
     * Показать зоны при drag
     * @private
     */
    _showZones() {
      if (this.zonesContainer) {
        this.zonesContainer.classList.add('active');
      }
    }

    /**
     * Скрыть зоны
     * @private
     */
    _hideZones() {
      if (this.zonesContainer) {
        this.zonesContainer.classList.remove('active');
        this.zonesContainer.querySelectorAll('.pui-zone').forEach(z => z.classList.remove('drag-over'));
      }
    }

    /**
     * Подсветить зону под курсором
     * @param {MouseEvent} e
     * @private
     */
    _highlightZone(e) {
      if (!this.zonesContainer) return;
      this.zonesContainer.querySelectorAll('.pui-zone').forEach(z => {
        const r = z.getBoundingClientRect();
        const isOver = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        z.classList.toggle('drag-over', isOver);
      });
    }

    /**
     * Получить зону под курсором
     * @param {number} x
     * @param {number} y
     * @returns {string|null}
     * @private
     */
    _getZoneAt(x, y) {
      let zone = null;
      this.zonesContainer?.querySelectorAll('.pui-zone').forEach(z => {
        const r = z.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
          zone = z.dataset.zone;
        }
      });
      return zone;
    }

    /**
     * Ограничить позицию панели в пределах viewport
     * @private
     */
    _clampPosition() {
      const left = parseInt(this.container.style.left, 10) || 20;
      const top = parseInt(this.container.style.top, 10) || 20;
      const maxL = window.innerWidth - this.container.offsetWidth;
      const maxT = window.innerHeight - this.container.offsetHeight;
      this.container.style.left = Math.max(0, Math.min(left, maxL)) + 'px';
      this.container.style.top = Math.max(0, Math.min(top, maxT)) + 'px';
    }

    /**
     * Установить состояние панели
     * @param {string} newState - expanded, minimized, docked-left, docked-right, docked-bottom
     */
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
      } else if (newState === 'minimized-to-footer') {
        styles.width = '200px';
        styles.height = '40px';
        styles.position = 'relative';
        styles.left = 'auto';
        styles.top = 'auto';
        styles.right = 'auto';
        styles.bottom = 'auto';
        styles.display = 'inline-block';
        styles.verticalAlign = 'middle';
        styles.margin = '0 5px';
      }

      this.onStateChange(this.state);
    }

    /**
     * Развернуть панель
     */
    expand() {
      this.container.style.display = '';
      this.setState('expanded');
      if (this.cubeEl) {
        this.cubeEl.classList.remove('visible');
      }
      this.renderContentByType();
    }

    /**
     * Свернуть панель в куб
     */
    minimize() {
      this.setState('minimized');
    }

    /**
     * Свернуть панель в футер
     * Панель перемещается в нижнюю часть экрана и показывается как узкая полоса
     */
    minimizeToFooter() {
      this.setState('minimized-to-footer');
      
      // Добавить панель в footer контейнер
      const footer = document.getElementById('appFooter');
      if (footer) {
        footer.appendChild(this.container);
        this.container.classList.add('footer-panel');
      }
    }

    /**
     * Развернуть панель из футера
     */
    expandFromFooter() {
      const mainArea = document.getElementById('mainCanvas') || document.body;
      mainArea.appendChild(this.container);
      this.container.classList.remove('footer-panel');
      this.setState('expanded');
      this.renderContentByType();
    }

    /**
     * Переключить состояние (expand/minimize)
     */
    toggle() {
      if (this.state === 'minimized') {
        this.expand();
      } else {
        this.minimize();
      }
    }

    /**
     * Пристыковать слева
     */
    dockLeft() {
      this.setState('docked-left');
    }

    /**
     * Пристыковать справа
     */
    dockRight() {
      this.setState('docked-right');
    }

    /**
     * Пристыковать снизу
     */
    dockBottom() {
      this.setState('docked-bottom');
    }

    /**
     * Установить критичность панели
     * @param {boolean} c
     */
    setCritical(c) {
      this.critical = !!c;
      this.container.classList.toggle('pui-critical', this.critical);
      if (this.cubeEl) {
        this.cubeEl.classList.toggle('pui-critical', this.critical);
      }
    }

    /**
     * Рендер контента по типу панели
     */
    renderContentByType() {
      const contentEl = this.container.querySelector('.pui-panel-content');
      if (!contentEl) return;
      
      // Don't re-render if content already exists
      if (contentEl.querySelector('.logs-view, .chat-view, .debug-view, .sessions-view, .task-view')) {
        return;
      }

      switch (this.type) {
        case 'logs':
          contentEl.innerHTML = '<div class="logs-view"><pre>No logs yet...</pre></div>';
          break;
        case 'chat':
          contentEl.innerHTML = '<div class="chat-view"><div class="messages"></div><input placeholder="Type message..."></div>';
          break;
        case 'debug':
          contentEl.innerHTML = '<div class="debug-view"><div class="variables"></div><div class="console"></div></div>';
          break;
        case 'sessions':
          contentEl.innerHTML = '<div class="sessions-view"><ul class="session-list"></ul></div>';
          break;
        case 'task':
        default:
          contentEl.innerHTML = '<div class="task-view"><div class="task-input"></div><div class="task-output"></div></div>';
      }
    }

    /**
     * Установить тип панели
     * @param {string} type - task, logs, chat, debug, sessions
     */
    setType(type) {
      this.type = type;
      this.renderContentByType();
    }

    /**
     * Установить статус куба
     * @param {string} status - idle, running, completed
     */
    setCubeStatus(status) {
      if (this.cubeEl) {
        const s = this.cubeEl.querySelector('.pui-cube-status');
        if (s) {
          s.className = 'pui-cube-status ' + (status || 'idle');
        }
      }
    }

    /**
     * Уничтожить панель
     */
    destroy() {
      this._cleanup?.();
      this.container.remove();
      if (this.cubeEl) {
        this.cubeEl.remove();
      }
    }

    /**
     * Сохранить состояние панелей в localStorage
     * @param {Object} panels - объект с панелями
     */
    static savePanels(panels) {
      const data = Object.values(panels).map(panel => ({
        id: panel.id,
        title: panel.container.querySelector('.pui-panel-title')?.textContent || 'Panel',
        type: panel.type,
        state: panel.state,
        position: panel.state === 'expanded' ? {
          x: panel.container.style.left,
          y: panel.container.style.top
        } : null,
        slot: panel.slot
      }));
      localStorage.setItem('plasticine-panels', JSON.stringify(data));
    }

    /**
     * Загрузить состояние панелей из localStorage
     * @returns {Array} массив сохраненных данных панелей
     */
    static loadPanels() {
      const data = localStorage.getItem('plasticine-panels');
      return data ? JSON.parse(data) : [];
    }

    /**
     * Очистить сохраненные панели из localStorage
     */
    static clearSavedPanels() {
      localStorage.removeItem('plasticine-panels');
    }
  }

  /**
   * Создать DOM элемент панели
   * @param {Object} opts
   * @returns {HTMLElement}
   */
  function createPanelDOM(opts) {
    const id = opts.id || 'panel-' + Math.random().toString(36).slice(2, 9);
    const title = opts.title != null ? opts.title : 'Panel';
    const slot = opts.slot || 'floating';
    const slotClasses = {
      floating: 'pui-slot-floating',
      left: 'pui-slot-left',
      right: 'pui-slot-right',
      bottom: 'pui-slot-bottom',
      header: 'pui-slot-header'
    };
    const slotClass = slotClasses[slot] || slotClasses.floating;

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

  /**
   * Экранирование HTML
   * @param {string} s
   * @returns {string}
   */
  function escapeHtml(s) {
    const el = document.createElement('div');
    el.textContent = s;
    return el.innerHTML;
  }

  // Export
  global.FloatingPanel = FloatingPanel;
  global.createPanelDOM = createPanelDOM;
  global.escapeHtml = escapeHtml;

})(typeof window !== 'undefined' ? window : globalThis);
