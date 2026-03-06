/**
 * Flow Nodes - Utility Functions
 * Утилиты для работы с узлами
 */

(function (global) {
    'use strict';

    /**
     * Получить тип узла по результату
     * @param {Object} outcome - результат выполнения
     */
    export function getNodeType(outcome) {
        const typeMap = {
            'task_request': 'taskInput',
            'action': 'actionNode',
            'sub_action': 'subActionNode',
            'action_result': 'resultNode',
            'completed': 'summaryNode'
        };
        return typeMap[outcome?.type] || 'default';
    }

    /**
     * Получить цвет узла по типу
     * @param {Object} outcome - результат выполнения
     */
    export function getNodeColor(outcome) {
        const colorMap = {
            'task_request': '#22c55e',     // green
            'action': '#3b82f6',           // blue
            'sub_action': '#8b5cf6',       // purple
            'action_result': '#f97316',    // orange
            'completed': '#22c55e'          // green
        };
        const nodeType = getNodeType(outcome);
        return colorMap[nodeType] || '#6b7280'; // gray default
    }

    // Export for use in other modules
    global.FlowNodesUtils = {
        getNodeType,
        getNodeColor
    };

})(typeof window !== 'undefined' ? window : global);
