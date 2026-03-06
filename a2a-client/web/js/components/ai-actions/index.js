/**
 * AI Actions Session Panel - Main Entry Point
 * Объединяет все модули в единый API
 * 
 * Загружает модули:
 * - core.js - основной класс и событийная система
 * - session.js - управление сессиями
 * - renderer.js - рендеринг UI
 * - execute.js - выполнение действий
 * - handlers.js - обработчики пользовательских действий
 * - integration.js - интеграция с SessionManager
 */

(function (global) {
    'use strict';

    // Mixins for extending the base class
    const mixins = [
        global.AIActionsSessionPanelSession,
        global.AIActionsSessionPanelRenderer,
        global.AIActionsSessionPanelExecute,
        global.AIActionsSessionPanelHandlers,
        global.AIActionsSessionPanelIntegration
    ];

    // Apply mixins to prototype
    if (global.AIActionsSessionPanel) {
        mixins.forEach(mixin => {
            if (mixin) {
                Object.keys(mixin).forEach(key => {
                    if (typeof mixin[key] === 'function') {
                        global.AIActionsSessionPanel.prototype[key] = mixin[key];
                    }
                });
            }
        });

        // Add _bindContentEvents to _init
        const originalInit = global.AIActionsSessionPanel.prototype._init;
        global.AIActionsSessionPanel.prototype._init = function() {
            originalInit.call(this);
            this._bindContentEvents();
        };
    }

    /**
     * Создать DOM элемент для AI Actions панели
     * @param {Object} options - настройки
     * @returns {HTMLElement} элемент панели
     */
    function createAIActionsPanelDOM(options = {}) {
        const id = options.id || 'ai-actions-panel-' + Math.random().toString(36).slice(2, 9);
        const title = options.title != null ? options.title : 'AI Actions';
        const slot = options.slot || 'floating';
        const slotClasses = {
            floating: 'pui-slot-floating',
            left: 'pui-slot-left',
            right: 'pui-slot-right',
            bottom: 'pui-slot-bottom'
        };
        const slotClass = slotClasses[slot] || slotClasses.floating;

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

    /**
     * Вспомогательная функция для экранирования HTML
     */
    function escapeHtml(s) {
        const el = document.createElement('div');
        el.textContent = s;
        return el.innerHTML;
    }

    // Export to global
    global.createAIActionsPanelDOM = createAIActionsPanelDOM;
    global.escapeHtml = escapeHtml;

    // Auto-initialize if DOM is ready
    if (typeof document !== 'undefined') {
        document.addEventListener('DOMContentLoaded', function() {
            // Check for auto-init data attribute
            const autoInitPanels = document.querySelectorAll('[data-auto-init="ai-actions"]');
            autoInitPanels.forEach(container => {
                const options = {
                    id: container.dataset.panelId,
                    title: container.dataset.panelTitle,
                    slot: container.dataset.panelSlot
                };
                const panel = createAIActionsPanelDOM(options);
                container.appendChild(panel);
                new global.AIActionsSessionPanel(panel, options);
            });
        });
    }

})(typeof window !== 'undefined' ? window : global);
