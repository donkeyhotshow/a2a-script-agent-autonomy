/**
 * JSON Adapter - Bridge between @a2a/json package and VueFlow components
 *
 * This module provides utilities to adapt the @a2a/json package
 * for use with VueFlow in the browser.
 *
 * Since @a2a/json is a Node.js package, we provide browser-compatible
 * implementations of the core parsing and mapping functions.
 */

// ============================================
// Response Type Detection
// ============================================

/**
 * Detect the type of unified response
 * @param {Object} response - Response object
 * @returns {string|null} Response type
 */
export function detectResponseType(response) {
    if (!response || typeof response !== 'object') return null;

    const types = [
        'action_proposal',
        'action_executing',
        'action_progress',
        'action_completed',
        'action_error'
    ];

    for (const type of types) {
        if (response.type === type) return type;
    }

    return null;
}

/**
 * Check if response is action_proposal
 * @param {Object} response - Response object
 * @returns {boolean}
 */
export function isActionProposalResponse(response) {
    return response?.type === 'action_proposal';
}

/**
 * Check if response is action_executing
 * @param {Object} response - Response object
 * @returns {boolean}
 */
export function isActionExecutingResponse(response) {
    return response?.type === 'action_executing';
}

/**
 * Check if response is action_progress
 * @param {Object} response - Response object
 * @returns {boolean}
 */
export function isActionProgressResponse(response) {
    return response?.type === 'action_progress';
}

/**
 * Check if response is action_completed
 * @param {Object} response - Response object
 * @returns {boolean}
 */
export function isActionCompletedResponse(response) {
    return response?.type === 'action_completed';
}

/**
 * Check if response is action_error
 * @param {Object} response - Response object
 * @returns {boolean}
 */
export function isActionErrorResponse(response) {
    return response?.type === 'action_error';
}

// ============================================
// Validation (simplified browser version)
// ============================================

/**
 * Validate response structure
 * @param {Object} response - Response to validate
 * @returns {Object} Validation result
 */
export function validateResponse(response) {
    if (!response || typeof response !== 'object') {
        return {valid: false, errors: ['Response must be an object']};
    }

    const errors = [];

    // Check required fields
    if (!response.type) {
        errors.push('Missing required field: type');
    }

    if (response.success === undefined) {
        errors.push('Missing required field: success');
    }

    if (!response.timestamp) {
        errors.push('Missing required field: timestamp');
    }

    // Check type-specific fields
    if (response.type === 'action_proposal') {
        if (!response.result?.proposedActions) {
            errors.push('action_proposal requires result.proposedActions');
        }
    } else if (response.type === 'action_executing') {
        if (!response.result?.executingAction) {
            errors.push('action_executing requires result.executingAction');
        }
    } else if (response.type === 'action_progress') {
        if (!response.result?.actionId) {
            errors.push('action_progress requires result.actionId');
        }
    } else if (response.type === 'action_completed') {
        if (!response.result?.actionId) {
            errors.push('action_completed requires result.actionId');
        }
    } else if (response.type === 'action_error') {
        if (!response.result?.error) {
            errors.push('action_error requires result.error');
        }
    }

    return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
    };
}

// ============================================
// Node Counter for auto-layout
// ============================================

let nodeCounter = 0;

/**
 * Reset node counter
 */
export function resetNodeCounter() {
    nodeCounter = 0;
}

/**
 * Calculate position for auto-layout
 * @param {number} index - Node index
 * @returns {Object} Position {x, y}
 */
function calculatePosition(index) {
    return {
        x: 100,
        y: 100 + index * 120
    };
}

// ============================================
// VueFlow Node Conversion
// ============================================

/**
 * Get status color for node styling
 * @param {string} status - Node status
 * @returns {string} Color hex
 */
export function getStatusColor(status) {
    const colors = {
        proposed: '#3B82F6',
        pending: '#6B7280',
        executing: '#F59E0B',
        in_progress: '#F59E0B',
        completed: '#10B981',
        failed: '#EF4444',
        fallback: '#8B5CF6',
        error: '#EF4444',
    };
    return colors[status] || '#6B7280';
}

/**
 * Get icon for node type
 * @param {string} nodeType - Node type
 * @returns {string} Icon emoji
 */
export function getNodeTypeIcon(nodeType) {
    const icons = {
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

/**
 * Convert UnifiedResponse to VueFlow nodes
 * @param {Object} response - UnifiedResponse
 * @returns {Array} VueFlow nodes
 */
export function convertToVueFlowNodes(response) {
    const nodes = [];
    let index = nodeCounter;

    if (isActionProposalResponse(response)) {
        const result = response.result;

        // Context node
        nodes.push({
            id: `context_${result.context.session_id}`,
            type: 'context',
            position: calculatePosition(index++),
            data: {
                label: 'Context',
                sessionId: result.context.session_id,
                tasks: result.context.tasks?.length || 0,
                status: 'loaded',
                messageType: 'context',
            },
        });

        // Proposed actions
        result.proposedActions?.forEach((action) => {
            nodes.push({
                id: `action_${action.id}`,
                type: 'actionProposal',
                position: calculatePosition(index++),
                data: {
                    label: action.name,
                    description: action.description,
                    priority: action.priority,
                    actionId: action.id,
                    status: 'proposed',
                    dsl: action.dsl,
                    messageType: 'action_proposal',
                    matchScore: action.matchScore,
                    subActions: action.subActions || [],
                },
            });
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
                    messageType: 'action_proposal',
                },
            });
        });
    }

    if (isActionExecutingResponse(response)) {
        const result = response.result;

        nodes.push({
            id: `executing_${result.executingAction.id}`,
            type: 'actionProposal',
            position: calculatePosition(index++),
            data: {
                label: result.executingAction.name,
                description: result.executingAction.description,
                priority: result.executingAction.priority,
                actionId: result.executingAction.id,
                status: 'executing',
                dsl: result.executingAction.dsl,
                messageType: 'action_executing',
            },
        });

        result.nextSteps?.forEach((step, stepIndex) => {
            nodes.push({
                id: `next_${step.id}`,
                type: 'subAction',
                position: calculatePosition(index++),
                data: {
                    label: step.name,
                    description: step.description,
                    priority: step.priority,
                    actionId: step.id,
                    status: 'pending',
                    stepIndex: stepIndex,
                    messageType: 'action_executing',
                },
            });
        });
    }

    if (isActionProgressResponse(response)) {
        const result = response.result;

        nodes.push({
            id: `progress_${result.actionId}`,
            type: 'subAction',
            position: calculatePosition(index++),
            data: {
                label: result.currentStep.title,
                description: result.currentStep.code,
                progress: result.currentStep.progress,
                actionId: result.actionId,
                status: 'in_progress',
                message: result.message,
                completedSteps: result.completedSteps?.length || 0,
                remainingSteps: result.remainingSteps?.length || 0,
                messageType: 'action_progress',
                stepName: result.currentStep.title,
                input: result.currentStep,
            },
        });
    }

    if (isActionCompletedResponse(response)) {
        const result = response.result;

        nodes.push({
            id: `completed_${result.actionId}`,
            type: 'result',
            position: calculatePosition(index++),
            data: {
                label: 'Completed',
                description: result.summary,
                actionId: result.actionId,
                status: 'completed',
                output: result.output,
                filesModified: result.filesModified,
                executionTimeMs: result.executionTimeMs,
                messageType: 'action_complete',
                success: true,
                summary: {
                    actionId: result.actionId,
                    summary: result.summary,
                    filesModified: result.filesModified?.length || 0,
                    executionTime: result.executionTimeMs ? `${result.executionTimeMs}ms` : 'N/A',
                },
            },
        });
    }

    if (isActionErrorResponse(response)) {
        const result = response.result;

        nodes.push({
            id: `error_${result.actionId}`,
            type: 'result',
            position: calculatePosition(index++),
            data: {
                label: 'Error',
                description: result.error.message,
                actionId: result.actionId,
                status: 'failed',
                errorCode: result.error.code,
                canRetry: result.canRetry,
                failedStep: result.failedStep,
                messageType: 'action_error',
                success: false,
                message: result.error.message,
                changes: [],
            },
        });
    }

    nodeCounter = index;
    return nodes;
}

/**
 * Convert UnifiedResponse to VueFlow edges
 * @param {Object} response - UnifiedResponse
 * @param {Array} nodes - VueFlow nodes
 * @returns {Array} VueFlow edges
 */
export function convertToVueFlowEdges(response, nodes = []) {
    const edges = [];

    if (isActionProposalResponse(response)) {
        const result = response.result;
        const contextId = `context_${result.context.session_id}`;

        result.proposedActions?.forEach((action) => {
            edges.push({
                id: `edge_${contextId}_${action.id}`,
                source: contextId,
                target: `action_${action.id}`,
                type: 'smoothstep',
                animated: false,
                label: 'proposes',
            });
        });

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

        result.nextSteps?.forEach((step, index) => {
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

        if (result.completedSteps?.length > 0) {
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
 * Convert full UnifiedResponse to VueFlow graph
 * @param {Object} response - UnifiedResponse
 * @returns {Object} {nodes, edges}
 */
export function convertToVueFlowGraph(response) {
    resetNodeCounter();
    const nodes = convertToVueFlowNodes(response);
    const edges = convertToVueFlowEdges(response, nodes);
    return {nodes, edges};
}

// ============================================
// Extract data helpers
// ============================================

/**
 * Extract action ID from response
 * @param {Object} response - UnifiedResponse
 * @returns {string|null} Action ID
 */
export function extractActionId(response) {
    if (isActionProposalResponse(response)) {
        return response.result?.proposedActions?.[0]?.id || null;
    }
    if (isActionExecutingResponse(response)) {
        return response.result?.executingAction?.id || null;
    }
    if (isActionProgressResponse(response)) {
        return response.result?.actionId || null;
    }
    if (isActionCompletedResponse(response)) {
        return response.result?.actionId || null;
    }
    if (isActionErrorResponse(response)) {
        return response.result?.actionId || null;
    }
    return null;
}

/**
 * Extract summary from response
 * @param {Object} response - UnifiedResponse
 * @returns {Object|null} Summary object
 */
export function extractSummary(response) {
    if (isActionCompletedResponse(response)) {
        const result = response.result;
        return {
            actionId: result.actionId,
            summary: result.summary,
            filesModified: result.filesModified?.length || 0,
            executionTime: result.executionTimeMs ? `${result.executionTimeMs}ms` : 'N/A',
        };
    }
    return null;
}

/**
 * Get all proposed actions from response
 * @param {Object} response - UnifiedResponse
 * @returns {Array} Array of actions
 */
export function getProposedActions(response) {
    if (isActionProposalResponse(response)) {
        return response.result?.proposedActions || [];
    }
    return [];
}

/**
 * Get context from response
 * @param {Object} response - UnifiedResponse
 * @returns {Object|null} Context block
 */
export function getContext(response) {
    if (isActionProposalResponse(response)) {
        return response.result?.context || null;
    }
    return null;
}

// ============================================
// Parse Response
// ============================================

/**
 * Parse response string to object
 * @param {string} jsonString - JSON string
 * @returns {Object|null} Parsed object or null
 */
export function parseResponseString(jsonString) {
    try {
        return JSON.parse(jsonString);
    } catch (e) {
        console.error('Failed to parse JSON:', e);
        return null;
    }
}

/**
 * Parse and validate response
 * @param {Object|string} data - Response data
 * @returns {Object} Parsed response with metadata
 */
export function parseResponse(data) {
    const response = typeof data === 'string' ? parseResponseString(data) : data;

    if (!response) {
        return {
            type: null,
            success: false,
            timestamp: new Date().toISOString(),
            data: null,
            errors: ['Invalid JSON or empty response'],
        };
    }

    const validation = validateResponse(response);

    return {
        type: detectResponseType(response),
        success: response.success,
        timestamp: response.timestamp,
        data: response,
        errors: validation.valid ? undefined : validation.errors,
    };
}

// ============================================
// Export for browser
// ============================================

if (typeof window !== 'undefined') {
    window.JSONAdapter = {
        detectResponseType,
        isActionProposalResponse,
        isActionExecutingResponse,
        isActionProgressResponse,
        isActionCompletedResponse,
        isActionErrorResponse,
        validateResponse,
        resetNodeCounter,
        getStatusColor,
        getNodeTypeIcon,
        convertToVueFlowNodes,
        convertToVueFlowEdges,
        convertToVueFlowGraph,
        extractActionId,
        extractSummary,
        getProposedActions,
        getContext,
        parseResponseString,
        parseResponse,
    };
}
