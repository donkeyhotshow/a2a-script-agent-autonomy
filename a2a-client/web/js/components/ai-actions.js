/**
 * AI Actions Session Panel - атомарный компонент для управления сессиями AI actions
 * 
 * Особенности:
 * - Отображение списка сессий с их статусами
 * - Поддержка AI actions (form, message, script, rag-search, read-file, write-file, execute-command)
 * - Интеграция с FloatingPanel для управления состоянием
 * - Возможность переключения между сессиями
 * - Отображение истории действий в каждой сессии
 * 
 * Поддержка нового протокола (v2.0):
 * - execute.form.choices - выбор действия из списка
 * - execute.message - UI-only сообщения
 * - result: { choice: "..." } - отправка выбора
 * 
 * Модульная структура:
 * - ai-actions-core.js - основной класс
 * - ai-actions-render.js - методы рендеринга
 * - ai-actions-api.js - интеграция с API
 * - ai-actions-session-manager.js - интеграция с SessionManager
 * - ai-actions-storage.js - сохранение/загрузка
 */

(function (global) {
    'use strict';

    // Подключаем модули и применяем миксины
    // Примечание: порядок миксинов важен
    
    // Ядро уже определено в ai-actions-core.js
    // Применяем миксин рендеринга
    if (global.mixinAIRender && global.AIActionsSessionPanel) {
        global.mixinAIRender(global.AIActionsSessionPanel);
    }
    
    // Применяем миксин API
    if (global.mixinAIAPI && global.AIActionsSessionPanel) {
        global.mixinAIAPI(global.AIActionsSessionPanel);
    }
    
    // Применяем миксин SessionManager
    if (global.mixinAISessionManager && global.AIActionsSessionPanel) {
        global.mixinAISessionManager(global.AIActionsSessionPanel);
    }
    
    // Применяем миксин Storage
    if (global.mixinAIStorage && global.AIActionsSessionPanel) {
        global.mixinAIStorage(global.AIActionsSessionPanel);
    }

    /**
     * Простая функция экранирования HTML
     */
    function simpleEscape(str) {
        var s = String(str);
        s = s.replace(/&/g, '&');
        s = s.replace(/</g, '<');
        s = s.replace(/>/g, '>');
        s = s.replace(/"/g, '"');
        return s;
    }

    /**
     * Создать DOM элемент сессионной панели AI actions
     * @param {Object} options
     * @returns {HTMLElement}
     */
    function createAIActionsPanelDOM(options) {
        options = options || {};
        var id = options.id || 'ai-actions-panel-' + Math.random().toString(36).slice(2, 9);
        var title = options.title != null ? options.title : 'AI Actions';
        var slot = options.slot || 'floating';
        var slotClasses = {
            floating: 'pui-slot-floating',
            left: 'pui-slot-left',
            right: 'pui-slot-right',
            bottom: 'pui-slot-bottom',
            header: 'pui-slot-header'
        };
        var slotClass = slotClasses[slot] || slotClasses.floating;

        var div = document.createElement('div');
        div.className = 'pui-panel expanded ' + slotClass;
        div.dataset.panelId = id;
        if (options.critical) {
            div.classList.add('pui-critical');
        }

        var escapeHtml = global.escapeHtml || simpleEscape;

        div.innerHTML = 
            '<div class="pui-panel-header">' +
                '<span class="pui-panel-title">' + escapeHtml(String(title)) + '</span>' +
                '<div class="pui-panel-controls">' +
                    '<button type="button" class="pui-panel-control-btn" title="Maximize">[]</button>' +
                    '<button type="button" class="pui-panel-control-btn" data-action="close" title="Close">X</button>' +
                '</div>' +
            '</div>' +
            '<div class="pui-panel-content">' +
                '<!-- Содержимое будет добавлено при инициализации -->' +
            '</div>' +
            '<div class="pui-panel-resize"></div>';

        return div;
    }

    // Экспорт
    global.AIActionsSessionPanel = global.AIActionsSessionPanel;
    global.createAIActionsPanelDOM = createAIActionsPanelDOM;

})(typeof window !== 'undefined' ? window : globalThis);
