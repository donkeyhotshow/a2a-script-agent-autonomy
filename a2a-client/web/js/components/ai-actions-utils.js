/**
 * AI Actions Utilities
 * Утилитарные функции для AI Actions панели
 * 
 * Использование:
 * <script src="ai-actions-utils.js"></script>
 * <script src="ai-actions.js"></script>
 */

(function (global) {
    'use strict';

    /**
     * Экранирование HTML
     * @param {string} s - строка для экранирования
     * @returns {string} - экранированная строка
     */
    function escapeHtml(s) {
        const el = document.createElement('div');
        el.textContent = s;
        return el.innerHTML;
    }

    /**
     * Форматирование времени из ISO строки
     * @param {string} isoString - ISO дата строка
     * @returns {string} - отформатированное время
     */
    function formatTime(isoString) {
        const date = new Date(isoString);
        const now = new Date();
        const diff = now - date;

        // Менее минуты
        if (diff < 60000) {
            return 'just now';
        }
        
        // Менее часа
        if (diff < 3600000) {
            const mins = Math.floor(diff / 60000);
            return `${mins}m ago`;
        }
        
        // Менее суток
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `${hours}h ago`;
        }
        
        // Иначе показываем дату
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    /**
     * Генерация уникального ID
     * @param {string} prefix - префикс ID
     * @returns {string} - уникальный ID
     */
    function generateId(prefix = 'id') {
        return prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    }

    /**
     *deep clone объекта
     * @param {*} obj - объект для клонирования
     * @returns {*} - клонированный объект
     */
    function deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    // Export to global
    global.AIActionsUtils = {
        escapeHtml,
        formatTime,
        generateId,
        deepClone
    };

    // Also export individual functions for convenience
    global.escapeHtml = escapeHtml;
    global.formatTime = formatTime;
    global.generateId = generateId;
    global.deepClone = deepClone;

})(typeof window !== 'undefined' ? window : globalThis);
