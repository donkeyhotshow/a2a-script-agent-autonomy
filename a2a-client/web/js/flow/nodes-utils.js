/**
 * VueFlow Custom Nodes - Utility Functions
 * 
 * Provides helper functions for node type and color mapping
 */

// Utility functions for node type and color mapping
export function getNodeType(outcome) {
    const typeMap = {
        'task_request': 'taskInput',
        'action_proposal': 'actionProposal',
        'action_executing': 'subAction',
        'step_result': 'result',
        'action_complete': 'actionComplete'
    };
    return typeMap[outcome] || 'default';
}

export function getNodeColor(outcome) {
    const colorMap = {
        'task_request': '#22c55e',     // green
        'action_proposal': '#eab308',  // yellow
        'action_executing': '#3b82f6', // blue
        'step_result': '#6b7280',      // gray
        'action_complete': '#22c55e'   // green
    };
    return colorMap[outcome] || '#6b7280'; // default gray
}
