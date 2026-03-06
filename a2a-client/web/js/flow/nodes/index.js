/**
 * Flow Nodes - Main Entry Point
 * Объединяет все типы узлов для VueFlow
 * 
 * Модули:
 * - utils.js - утилиты (getNodeType, getNodeColor)
 * - task-input.js - узел ввода задачи
 * - action-node.js - узел действия
 * - sub-action-node.js - узел под-действия
 * - result-node.js - узел результата
 * - summary-node.js - узел сводки
 */

(function (global) {
    'use strict';

    // Export all node types
    const FlowNodes = {
        // Utilities
        getNodeType: global.FlowNodesUtils?.getNodeType,
        getNodeColor: global.FlowNodesUtils?.getNodeColor,
        
        // Node types
        TaskInputNode: global.TaskInputNode,
        ActionNode: global.ActionNode,
        SubActionNode: global.SubActionNode,
        ResultNode: global.ResultNode,
        SummaryNode: global.SummaryNode
    };

    // Register nodes with VueFlow if available
    if (typeof global.VueFlow !== 'undefined') {
        const VueFlow = global.VueFlow;
        
        // Register each node type
        if (global.TaskInputNode) {
            VueFlow.register(global.TaskInputNode);
        }
        if (global.ActionNode) {
            VueFlow.register(global.ActionNode);
        }
        if (global.SubActionNode) {
            VueFlow.register(global.SubActionNode);
        }
        if (global.ResultNode) {
            VueFlow.register(global.ResultNode);
        }
        if (global.SummaryNode) {
            VueFlow.register(global.SummaryNode);
        }
    }

    // Export to global
    global.FlowNodes = FlowNodes;

    // Convenience function to create node by type
    global.createFlowNode = function(type, data) {
        const nodeFactory = {
            'taskInput': global.TaskInputNode?.createElement,
            'actionNode': global.ActionNode?.createElement,
            'subActionNode': global.SubActionNode?.createElement,
            'resultNode': global.ResultNode?.createElement,
            'summaryNode': global.SummaryNode?.createElement
        };
        
        const factory = nodeFactory[type];
        if (factory) {
            return factory(data);
        }
        
        // Default fallback
        return {
            type: type || 'default',
            data: data || {}
        };
    };

})(typeof window !== 'undefined' ? window : global);
