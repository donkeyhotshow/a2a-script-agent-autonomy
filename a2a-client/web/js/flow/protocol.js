/**
 * VueFlow Protocol Mapping
 *
 * Maps A2A simulation responses to VueFlow nodes and edges.
 * Handles different outcome types: action_proposal, action_executing, action_complete.
 */

import { getNodeType, getNodeColor } from './nodes.js';

/**
 * Maps a simulation response to VueFlow nodes and edges
 * @param {Object} response - A2A simulation response
 * @param {Array} existingNodes - Existing nodes in the flow
 * @returns {Object} { nodes: [], edges: [] }
 */
export function mapSimulationResponseToFlow(response, existingNodes = []) {
    const nodes = [...existingNodes];
    const edges = [];
    const outcome = response?.outcome;
    const context = response?.context || {};
    const execution = context?.execution || {};

    // Generate unique IDs for nodes
    const getNodeId = (type, index = 0) => `${type}-${Date.now()}-${index}`;

    switch (outcome) {
        case 'action_proposal':
            return mapActionProposalResponse(response, nodes, edges, getNodeId);

        case 'action_executing':
            return mapActionExecutingResponse(response, nodes, edges, getNodeId);

        case 'action_complete':
            return mapActionCompleteResponse(response, nodes, edges, getNodeId);

        case 'task_request':
            return mapTaskRequestResponse(response, nodes, edges, getNodeId);

        default:
            return { nodes, edges };
    }
}

/**
 * Maps action_proposal outcome to nodes
 */
function mapActionProposalResponse(response, nodes, edges, getNodeId) {
    const context = response?.context || {};
    const execution = context?.execution || {};
    const data = response?.data || {};

    // Create action proposal node
    const proposalNodeId = getNodeId('actionProposal');
    const proposalNode = {
        id: proposalNodeId,
        type: 'actionProposal',
        position: { x: 250, y: nodes.length * 150 },
        data: {
            actionName: execution.action || data.actionName || 'Proposed Action',
            description: data.description || execution.description || '',
            matchScore: data.matchScore || execution.matchScore,
            subActions: data.subActions || execution.subActions || []
        }
    };
    nodes.push(proposalNode);

    // Connect to previous node if exists
    if (nodes.length > 1) {
        const prevNode = nodes[nodes.length - 2];
        edges.push({
            id: `edge-${prevNode.id}-${proposalNodeId}`,
            source: prevNode.id,
            target: proposalNodeId,
            type: 'default',
            style: { stroke: '#eab308', strokeWidth: 2 }
        });
    }

    return { nodes, edges };
}

/**
 * Maps action_executing outcome to nodes
 */
function mapActionExecutingResponse(response, nodes, edges, getNodeId) {
    const context = response?.context || {};
    const execution = context?.execution || {};
    const data = response?.data || {};
    const executingAction = data?.executingAction || execution?.action;

    if (!executingAction) return { nodes, edges };

    // Find or create subAction nodes
    const subActions = data?.subActions || executingAction.subActions || [];
    let lastNodeId = nodes.length > 0 ? nodes[nodes.length - 1].id : null;

    subActions.forEach((subAction, index) => {
        const subActionNodeId = getNodeId('subAction', index);
        const subActionNode = {
            id: subActionNodeId,
            type: 'subAction',
            position: { x: 250, y: nodes.length * 150 },
            data: {
                subActionName: subAction.title || subAction.actionId || `Step ${index + 1}`,
                stepIndex: index + 1,
                dsl: subAction.dsl || subAction.script || '',
                input: subAction.input || {},
                output: subAction.output || '',
                status: subAction.status || 'running'
            }
        };
        nodes.push(subActionNode);

        // Connect to previous node
        if (lastNodeId) {
            edges.push({
                id: `edge-${lastNodeId}-${subActionNodeId}`,
                source: lastNodeId,
                target: subActionNodeId,
                type: 'default',
                style: { stroke: '#3b82f6', strokeWidth: 2 },
                animated: subAction.status === 'running'
            });
        }

        lastNodeId = subActionNodeId;
    });

    return { nodes, edges };
}

/**
 * Maps action_complete outcome to nodes
 */
function mapActionCompleteResponse(response, nodes, edges, getNodeId) {
    const context = response?.context || {};
    const execution = context?.execution || {};
    const data = response?.data || {};
    const finalResult = data?.finalResult || execution?.finalResult;

    // Create result node if there are errors or changes
    if (finalResult) {
        const resultNodeId = getNodeId('result');
        const resultNode = {
            id: resultNodeId,
            type: 'result',
            position: { x: 250, y: nodes.length * 150 },
            data: {
                success: !finalResult.error,
                message: finalResult.summary || finalResult.message || 'Action completed',
                result: finalResult,
                changes: finalResult.changes || []
            }
        };
        nodes.push(resultNode);

        // Connect to previous node
        if (nodes.length > 1) {
            const prevNode = nodes[nodes.length - 2];
            edges.push({
                id: `edge-${prevNode.id}-${resultNodeId}`,
                source: prevNode.id,
                target: resultNodeId,
                type: 'default',
                style: {
                    stroke: finalResult.error ? '#ef4444' : '#22c55e',
                    strokeWidth: 2
                }
            });
        }
    }

    // Create action complete node
    const completeNodeId = getNodeId('actionComplete');
    const completeNode = {
        id: completeNodeId,
        type: 'actionComplete',
        position: { x: 250, y: nodes.length * 150 },
        data: {
            actionName: execution.action || data.actionName || 'Action',
            summary: finalResult?.summary || {},
            totalSteps: data.totalSteps || finalResult?.totalSteps || 0,
            duration: finalResult?.duration || '0s'
        }
    };
    nodes.push(completeNode);

    // Connect to previous node
    if (nodes.length > 1) {
        const prevNode = nodes[nodes.length - 2];
        edges.push({
            id: `edge-${prevNode.id}-${completeNodeId}`,
            source: prevNode.id,
            target: completeNodeId,
            type: 'default',
            style: { stroke: '#22c55e', strokeWidth: 2 }
        });
    }

    return { nodes, edges };
}

/**
 * Maps task_request outcome to nodes
 */
function mapTaskRequestResponse(response, nodes, edges, getNodeId) {
    const context = response?.context || {};
    const task = context?.task || response?.task || 'Unknown task';

    // Create task input node
    const taskNodeId = getNodeId('taskInput');
    const taskNode = {
        id: taskNodeId,
        type: 'taskInput',
        position: { x: 250, y: 50 },
        data: {
            task: task,
            timestamp: new Date().toISOString()
        }
    };
    nodes.push(taskNode);

    return { nodes, edges };
}

/**
 * Creates edges between nodes based on execution flow
 * @param {Array} nodes - VueFlow nodes
 * @returns {Array} edges
 */
export function createEdgesFromNodes(nodes) {
    const edges = [];
    const nodeMap = new Map(nodes.map(node => [node.id, node]));

    // Simple sequential connection for now
    for (let i = 0; i < nodes.length - 1; i++) {
        const sourceNode = nodes[i];
        const targetNode = nodes[i + 1];

        // Skip if nodes are already connected or shouldn't be connected
        if (sourceNode.type === 'result' && targetNode.type === 'actionComplete') {
            // Result nodes connect to completion nodes
        } else if (sourceNode.type === 'actionComplete') {
            // Completion nodes are end nodes
            continue;
        }

        const edgeColor = getNodeColor(getOutcomeFromNodeType(sourceNode.type));
        const isAnimated = targetNode.data?.status === 'running' ||
                          (sourceNode.data?.status === 'running' && targetNode.type === 'result');

        edges.push({
            id: `edge-${sourceNode.id}-${targetNode.id}`,
            source: sourceNode.id,
            target: targetNode.id,
            type: 'default',
            style: {
                stroke: edgeColor,
                strokeWidth: 2
            },
            animated: isAnimated
        });
    }

    return edges;
}

/**
 * Gets outcome type from node type
 * @param {string} nodeType
 * @returns {string} outcome
 */
function getOutcomeFromNodeType(nodeType) {
    const outcomeMap = {
        'taskInput': 'task_request',
        'actionProposal': 'action_proposal',
        'subAction': 'action_executing',
        'result': 'step_result',
        'actionComplete': 'action_complete'
    };
    return outcomeMap[nodeType] || 'unknown';
}

/**
 * Updates node positions to create a nice flow layout
 * @param {Array} nodes - VueFlow nodes
 * @returns {Array} nodes with updated positions
 */
export function layoutNodes(nodes) {
    return nodes.map((node, index) => ({
        ...node,
        position: {
            x: 250,
            y: 50 + (index * 150)
        }
    }));
}

/**
 * Validates that a response can be mapped to flow
 * @param {Object} response
 * @returns {boolean}
 */
export function validateResponseForMapping(response) {
    if (!response || typeof response !== 'object') return false;

    const requiredFields = ['outcome'];
    return requiredFields.every(field => response.hasOwnProperty(field));
}