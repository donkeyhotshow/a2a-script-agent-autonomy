/**
 * @a2a/json - VueFlow Mapper
 * Converts UnifiedResponse to VueFlow nodes and edges
 *
 * `result.actionId` here is an internal VueFlow correlation id (progress/completed node wiring),
 * not the A2A protocol `execute` action key nor `result.choice`. See packages/json/README.md.
 */

import type {
    UnifiedResponse,
    VueFlowNode,
    VueFlowEdge,
    ActionProposalResponse,
    ActionExecutingResponse,
    ActionProgressResponse,
    ActionCompletedResponse,
    ActionErrorResponse
} from './types.js';
import {
    isActionProposalResponse,
    isActionExecutingResponse,
    isActionProgressResponse,
    isActionCompletedResponse,
    isActionErrorResponse
} from './parser.js';

/**
 * Node position counter for auto-layout
 */
let nodeCounter = 0;

const CONTEXT_NODE_ID = 'context';

/**
 * Reset node counter (useful for testing)
 */
export function resetNodeCounter(): void {
    nodeCounter = 0;
}

/**
 * Calculate node position for auto-layout
 */
function calculatePosition(index: number): { x: number; y: number } {
    const x = 100;
    const y = 100 + index * 120;
    return {x, y};
}

/**
 * Convert UnifiedResponse to VueFlow nodes
 * @param response - UnifiedResponse from server
 * @returns Array of VueFlow nodes
 */
export function convertToVueFlowNodes(response: UnifiedResponse): VueFlowNode[] {
    const nodes: VueFlowNode[] = [];
    let index = nodeCounter;

    if (isActionProposalResponse(response)) {
        const result = response.result;

        // Context node
        nodes.push({
            id: CONTEXT_NODE_ID,
            type: 'context',
            position: calculatePosition(index++),
            data: {
                label: 'Context',
                tasks: result.context.tasks?.length || 0,
                status: 'loaded',
            },
        });

        // Proposed actions nodes
        if (result.proposedActions) {
            result.proposedActions.forEach((action, actionIndex) => {
            nodes.push({
                id: `action_${action.id}`,
                type: 'action',
                position: calculatePosition(index++),
                data: {
                    label: action.name,
                    description: action.description,
                    priority: action.priority,
                    actionId: action.id,
                    status: 'proposed',
                    dsl: action.dsl,
                },
            });

            // Edge from context to action
            // (edges are handled in convertToVueFlowEdges)
        });

        // Fallback actions
        result.fallbackActions?.forEach((fallback) => {
            nodes.push({
                id: `fallback_${fallback.id}`,
                type: 'fallback',
                position: calculatePosition(index++),
                data: {
                    label: fallback.name,
                    description: fallback.description,
                    reason: fallback.reason,
                    actionId: fallback.id,
                    status: 'fallback',
                },
            });
        });
    }

    if (isActionExecutingResponse(response)) {
        const result = response.result;

        // Current executing action
        nodes.push({
            id: `executing_${result.executingAction.id}`,
            type: 'action',
            position: calculatePosition(index++),
            data: {
                label: result.executingAction.name,
                description: result.executingAction.description,
                priority: result.executingAction.priority,
                actionId: result.executingAction.id,
                status: 'executing',
                dsl: result.executingAction.dsl,
            },
        });

        // Next steps
        result.nextSteps.forEach((step, stepIndex) => {
            nodes.push({
                id: `next_${step.id}`,
                type: 'nextStep',
                position: calculatePosition(index++),
                data: {
                    label: step.name,
                    description: step.description,
                    priority: step.priority,
                    actionId: step.id,
                    status: 'pending',
                    stepIndex,
                },
            });
        });
    }

    if (isActionProgressResponse(response)) {
        const result = response.result;

        // Current step node
        nodes.push({
            id: `progress_${result.actionId}`,
            type: 'progress',
            position: calculatePosition(index++),
            data: {
                label: result.currentStep.title,
                description: result.currentStep.code,
                progress: result.currentStep.progress,
                actionId: result.actionId,
                status: 'in_progress',
                message: result.message,
                completedSteps: result.completedSteps.length,
                remainingSteps: result.remainingSteps.length,
            },
        });
    }

    if (isActionCompletedResponse(response)) {
        const result = response.result;

        // Completed action node
        nodes.push({
            id: `completed_${result.actionId}`,
            type: 'completed',
            position: calculatePosition(index++),
            data: {
                label: 'Completed',
                description: result.summary,
                actionId: result.actionId,
                status: 'completed',
                output: result.output,
                filesModified: result.filesModified,
                executionTimeMs: result.executionTimeMs,
            },
        });
    }

    if (isActionErrorResponse(response)) {
        const result = response.result;

        // Error node
        nodes.push({
            id: `error_${result.actionId}`,
            type: 'error',
            position: calculatePosition(index++),
            data: {
                label: 'Error',
                description: result.error.message,
                actionId: result.actionId,
                status: 'failed',
                errorCode: result.error.code,
                canRetry: result.canRetry,
                failedStep: result.failedStep,
            },
        });
    }

    // Update global counter
    nodeCounter = index;

    return nodes;
}

/**
 * Convert UnifiedResponse to VueFlow edges
 * @param response - UnifiedResponse from server
 * @param nodes - Previously created nodes (to get IDs)
 * @returns Array of VueFlow edges
 */
export function convertToVueFlowEdges(response: UnifiedResponse, nodes?: VueFlowNode[]): VueFlowEdge[] {
    const edges: VueFlowEdge[] = [];

    if (isActionProposalResponse(response)) {
        const result = response.result;
        const contextId = CONTEXT_NODE_ID;

        // Edges from context to each proposed action
        if (result.proposedActions) {
            result.proposedActions.forEach((action) => {
            edges.push({
                id: `edge_${contextId}_${action.id}`,
                source: contextId,
                target: `action_${action.id}`,
                type: 'smoothstep',
                animated: false,
                label: 'proposes',
            });
        });

        // Edges from context to fallback actions
        result.fallbackActions?.forEach((fallback) => {
            edges.push({
                id: `edge_${contextId}_fallback_${fallback.id}`,
                source: contextId,
                target: `fallback_${fallback.id}`,
                type: 'smoothstep',
                animated: false,
                label: 'fallback',
            });
        });
    }

    if (isActionExecutingResponse(response)) {
        const result = response.result;

        // Edge from executing action to next steps
        result.nextSteps.forEach((step, index) => {
            edges.push({
                id: `edge_${result.executingAction.id}_${step.id}`,
                source: `action_${result.executingAction.id}`,
                target: `next_${step.id}`,
                type: 'smoothstep',
                animated: true,
                label: `step ${index + 1}`,
            });
        });
    }

    if (isActionProgressResponse(response)) {
        const result = response.result;

        // Edge from previous completed step to current
        if (result.completedSteps.length > 0) {
            const lastCompleted = result.completedSteps[result.completedSteps.length - 1];
            edges.push({
                id: `edge_progress_${lastCompleted}_${result.currentStep.id}`,
                source: `progress_${lastCompleted}`,
                target: `progress_${result.actionId}`,
                type: 'smoothstep',
                animated: true,
                label: 'completed',
            });
        }
    }

    return edges;
}

/**
 * Convert full UnifiedResponse to VueFlow graph (nodes + edges)
 * @param response - UnifiedResponse from server
 * @returns Object with nodes and edges arrays
 */
export function convertToVueFlowGraph(response: UnifiedResponse): { nodes: VueFlowNode[]; edges: VueFlowEdge[] } {
    // Reset counter for new graph
    resetNodeCounter();

    const nodes = convertToVueFlowNodes(response);
    const edges = convertToVueFlowEdges(response, nodes);

    return {nodes, edges};
}

/**
 * Get node status color for styling
 * @param status - Node status
 * @returns Color hex code
 */
export function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
        proposed: '#3B82F6',   // blue
        pending: '#6B7280',    // gray
        executing: '#F59E0B',  // amber
        in_progress: '#F59E0B', // amber
        completed: '#10B981',  // green
        failed: '#EF4444',     // red
        fallback: '#8B5CF6',   // purple
        error: '#EF4444',      // red
    };

    return colors[status] || '#6B7280';
}

/**
 * Get node type icon for display
 * @param nodeType - VueFlow node type
 * @returns Icon identifier
 */
export function getNodeTypeIcon(nodeType: string): string {
    const icons: Record<string, string> = {
        context: '📋',
        action: '⚡',
        nextStep: '➡️',
        progress: '⏳',
        completed: '✅',
        error: '❌',
        fallback: '🔄',
    };

    return icons[nodeType] || '📦';
}
