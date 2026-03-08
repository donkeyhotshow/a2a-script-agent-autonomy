/**
 * AI Actions Utils - утилиты для AI Actions панели
 */

(function (global) {
    'use strict';

    /**
     * Форматировать время
     * @param {string} isoString
     * @returns {string}
     */
    function formatTime(isoString) {
        if (typeof formatTime === 'function') {
            return formatTime(isoString);
        }
        if (!isoString) return '';
        try {
            const date = new Date(isoString);
            return date.toLocaleTimeString();
        } catch (e) {
            return isoString;
        }
    }

    /**
     * Получить тип действия
     * @param {Object} action
     * @returns {string}
     */
    function getActionType(action) {
        // Check direct type first
        if (action.type) return action.type;

        // Check execute object structure (new protocol v2.0)
        if (action.execute) {
            if (action.execute.finalResult) return 'finalResult';
            if (action.execute.form) return 'form';
            if (action.execute.message) return 'message';
            if (action.execute.script) return 'script';
            if (action.execute['rag-search']) return 'rag-search';
            if (action.execute['read-file']) return 'read-file';
            if (action.execute['write-file']) return 'write-file';
            if (action.execute['execute-command']) return 'execute-command';
        }

        // Legacy format check
        if (action.finalResult) return 'finalResult';
        if (action.form) return 'form';
        if (action.message) return 'message';
        if (action.script) return 'script';
        if (action['rag-search']) return 'rag-search';
        if (action['read-file']) return 'read-file';
        if (action['write-file']) return 'write-file';
        if (action['execute-command']) return 'execute-command';
        return 'unknown';
    }

    /**
     * Сортировка сессий по дате обновления
     * @param {Map} sessions
     * @returns {Array}
     */
    function sortSessions(sessions) {
        return Array.from(sessions.values()).sort((a, b) => 
            new Date(b.updatedAt) - new Date(a.updatedAt)
        );
    }

    // Export utils
    global.aiActionsUtils = {
        formatTime,
        getActionType,
        sortSessions
    };

})(typeof window !== 'undefined' ? window : globalThis);
