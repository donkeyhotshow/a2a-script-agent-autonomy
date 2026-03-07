/**
 * VueFlow Custom Nodes for A2A Script Agent
 *
 * Implements custom node types for visualizing task execution flows:
 * - TaskInputNode: Entry point for user tasks
 * - ActionProposalNode: Shows proposed actions with subActions
 * - SubActionNode: Individual execution steps with DSL/script
 * - ResultNode: Success/failure results
 * - ActionCompleteNode: Final completion with summary stats
 *
 * This file re-exports from modular components:
 * - nodes-utils.js: Utility functions
 * - nodes/index.js: All node components
 */

// Re-export from modular structure
export { getNodeType, getNodeColor } from './nodes-utils.js';

export { TaskInputNode } from './nodes/task-input.js';
export { ActionProposalNode } from './nodes/action-proposal.js';
export { SubActionNode } from './nodes/sub-action.js';
export { ResultNode } from './nodes/result.js';
export { ActionCompleteNode } from './nodes/action-complete.js';

// Register all custom nodes
export function registerCustomNodes() {
    return {
        taskInput: require('./nodes/task-input.js'),
        actionProposal: require('./nodes/action-proposal.js'),
        subAction: require('./nodes/sub-action.js'),
        result: require('./nodes/result.js'),
        actionComplete: require('./nodes/action-complete.js')
    };
}
