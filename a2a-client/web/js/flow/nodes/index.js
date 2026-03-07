/**
 * VueFlow Custom Nodes Index
 * 
 * Central export point for all custom VueFlow nodes
 */

// Import all node components
import { TaskInputNode } from './task-input.js';
import { ActionProposalNode } from './action-proposal.js';
import { SubActionNode } from './sub-action.js';
import { ResultNode } from './result.js';
import { ActionCompleteNode } from './action-complete.js';

// Import utility functions
import { getNodeType, getNodeColor } from '../nodes-utils.js';

// Export all nodes
export {
    TaskInputNode,
    ActionProposalNode,
    SubActionNode,
    ResultNode,
    ActionCompleteNode,
    getNodeType,
    getNodeColor
};

// Register all custom nodes
export function registerCustomNodes() {
    return {
        taskInput: TaskInputNode,
        actionProposal: ActionProposalNode,
        subAction: SubActionNode,
        result: ResultNode,
        actionComplete: ActionCompleteNode
    };
}
