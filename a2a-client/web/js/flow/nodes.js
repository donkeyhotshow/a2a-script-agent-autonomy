/**
 * Custom VueFlow nodes for A2A Protocol visualization
 *
 * Protocol message types:
 * - task_request → Input Node (green)
 * - action_proposal → Default Node (yellow)
 * - action_executing → Default Node (blue)
 * - step_result → Default Node (gray)
 * - action_complete → Output Node (green)
 *
 * Entity types (for graph visualization):
 * - AGENTS → Agent entities (purple)
 * - NODES → Node entities (blue)
 * - ACTIONS → Action entities (orange)
 * - SERVICES → Service entities (cyan)
 * - TASKS → Task entities (lime)
 * - TERMINATORS → Terminator entities (red)
 * - PACKAGES → Package entities (indigo)
 * - FEATURES → Feature entities (pink)
 * - SYSTEMS → System entities (teal)
 * - SCRIPTS → Script entities (amber)
 * - SOLUTIONS → Solution entities (emerald)
 *
 * Uses Vue 3 render functions for compatibility with vanilla JS
 */

import {h} from 'vue';
import {Handle, Position} from '@vue-flow/core';

/**
 * Element type constants
 */
export const ELEMENT_TYPES = {
    // Protocol types
    TASK_REQUEST: 'task_request',
    ACTION_PROPOSAL: 'action_proposal',
    ACTION_EXECUTING: 'action_executing',
    STEP_RESULT: 'step_result',
    ACTION_COMPLETE: 'action_complete',

    // Entity types
    AGENTS: 'agents',
    NODES: 'nodes',
    ACTIONS: 'actions',
    SERVICES: 'services',
    TASKS: 'tasks',
    TERMINATORS: 'terminators',
    PACKAGES: 'packages',
    FEATURES: 'features',
    SYSTEMS: 'systems',
    SCRIPTS: 'scripts',
    SOLUTIONS: 'solutions'
};

/**
 * Create a node wrapper with common structure
 */
function createNodeWrapper(props, children, headerColor, headerIcon, headerTitle) {
    const headerStyle = {
        backgroundColor: headerColor,
        padding: '8px 12px',
        color: 'white',
        fontWeight: '600',
        fontSize: '13px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    };

    return h('div', {
        class: 'custom-node',
        style: {
            backgroundColor: '#fff',
            border: `2px solid ${headerColor}`,
            borderRadius: '8px',
            overflow: 'hidden',
            minWidth: '200px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }
    }, [
        // Target handle (top)
        h(Handle, {
            type: 'target',
            position: Position.Top,
            style: {background: '#64748b', width: '8px', height: '8px'}
        }),

        // Header
        h('div', {style: headerStyle}, [
            h('span', {style: {fontSize: '14px'}}, headerIcon),
            h('span', {}, headerTitle)
        ]),

        // Content
        h('div', {
            style: {
                padding: '12px',
                backgroundColor: 'white',
                fontSize: '12px'
            }
        }, children),

        // Source handle (bottom)
        h(Handle, {
            type: 'source',
            position: Position.Bottom,
            style: {background: '#64748b', width: '8px', height: '8px'}
        })
    ]);
}

// ============================================
// Protocol Node Types
// ============================================

/**
 * TaskInputNode - displays task_request message
 * Green color (#22c55e) - represents input/start of flow
 */
export const TaskInputNode = {
    name: 'TaskInputNode',
    type: 'taskInput',
    nodeType: 'input',
    props: ['id', 'type', 'data', 'selected'],
    setup(props) {
        return () => {
            const data = props.data || {};
            return createNodeWrapper(
                props,
                [
                    h('div', {
                        style: {
                            fontWeight: '600',
                            color: '#64748b',
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            marginBottom: '4px'
                        }
                    }, 'Task:'),
                    h('div', {
                        style: {
                            color: '#1e293b',
                            fontSize: '13px',
                            marginBottom: '8px',
                            wordBreak: 'break-word'
                        }
                    }, data.task || 'No task'),
                    h('div', {
                        style: {fontSize: '11px', color: '#94a3b8'}
                    }, data.timestamp ? new Date(data.timestamp).toLocaleString() : '')
                ],
                '#22c55e',
                '📥',
                'Task Request'
            );
        };
    }
};

/**
 * ActionProposalNode - displays action_proposal message
 * Yellow color (#eab308) - represents proposed action
 */
export const ActionProposalNode = {
    name: 'ActionProposalNode',
    type: 'actionProposal',
    props: ['id', 'type', 'data', 'selected'],
    setup(props) {
        return () => {
            const data = props.data || {};
            const subActions = data.subActions || [];

            return createNodeWrapper(
                props,
                [
                    h('div', {
                        style: {
                            fontWeight: '600',
                            color: '#64748b',
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            marginBottom: '4px'
                        }
                    }, 'Action:'),
                    h('div', {
                        style: {
                            color: '#1e293b',
                            fontSize: '13px',
                            marginBottom: '4px',
                            fontWeight: '500'
                        }
                    }, data.actionName || 'Unknown action'),
                    h('div', {
                        style: {
                            fontSize: '12px',
                            color: '#64748b',
                            marginBottom: '8px'
                        }
                    }, data.description || ''),
                    h('div', {
                        style: {fontSize: '11px', color: '#94a3b8'}
                    }, `${subActions.length} steps`),
                    data.matchScore ? h('div', {
                        style: {
                            marginTop: '8px',
                            padding: '4px 8px',
                            backgroundColor: '#fef3c7',
                            borderRadius: '4px',
                            fontSize: '11px',
                            color: '#b45309'
                        }
                    }, `Match: ${Math.round(data.matchScore * 100)}%`) : null,
                    subActions.length > 0 ? h('div', {
                        style: {
                            marginTop: '8px',
                            borderTop: '1px solid #e2e8f0',
                            paddingTop: '8px'
                        }
                    }, [
                        h('div', {
                            style: {
                                fontSize: '10px',
                                color: '#64748b',
                                marginBottom: '4px',
                                textTransform: 'uppercase'
                            }
                        }, 'Sub-actions:'),
                        ...subActions.slice(0, 3).map((sub, idx) =>
                            h('div', {
                                key: idx,
                                style: {
                                    fontSize: '11px',
                                    color: '#475569',
                                    padding: '2px 0'
                                }
                            }, `${idx + 1}. ${sub.title || sub.actionId}`)
                        ),
                        subActions.length > 3 ? h('div', {
                            style: {fontSize: '10px', color: '#94a3b8'}
                        }, `+${subActions.length - 3} more`) : null
                    ]) : null
                ],
                '#eab308',
                '💡',
                'Action Proposal'
            );
        };
    }
};

/**
 * SubActionNode - displays sub-action during execution
 * Blue color (#3b82f6) - represents active execution
 */
export const SubActionNode = {
    name: 'SubActionNode',
    type: 'subAction',
    props: ['id', 'type', 'data', 'selected'],
    setup(props) {
        return () => {
            const data = props.data || {};
            const status = data.status || 'running';

            const statusColors = {
                running: {bg: '#dbeafe', color: '#2563eb', text: 'Running...'},
                completed: {bg: '#dcfce7', color: '#16a34a', text: '✓ Completed'},
                failed: {bg: '#fee2e2', color: '#dc2626', text: '✗ Failed'},
                pending: {bg: '#f1f5f9', color: '#64748b', text: '○ Pending'}
            };
            const statusStyle = statusColors[status] || statusColors.pending;

            return createNodeWrapper(
                props,
                [
                    h('div', {
                        style: {
                            fontWeight: '600',
                            color: '#64748b',
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            marginBottom: '4px'
                        }
                    }, `Step ${data.stepIndex || 1}:`),
                    h('div', {
                        style: {
                            color: '#1e293b',
                            fontSize: '13px',
                            marginBottom: '4px',
                            fontWeight: '500'
                        }
                    }, data.subActionName || data.stepName || 'Sub Action'),
                    data.description ? h('div', {
                        style: {
                            fontSize: '12px',
                            color: '#64748b',
                            marginBottom: '8px'
                        }
                    }, data.description) : null,
                    data.dsl ? h('div', {
                        style: {
                            marginTop: '8px',
                            padding: '8px',
                            backgroundColor: '#1e293b',
                            borderRadius: '4px',
                            overflow: 'hidden'
                        }
                    }, [
                        h('div', {
                            style: {
                                fontSize: '10px',
                                color: '#94a3b8',
                                marginBottom: '4px'
                            }
                        }, 'DSL Script:'),
                        h('pre', {
                            style: {
                                margin: 0,
                                fontSize: '10px',
                                color: '#e2e8f0',
                                fontFamily: 'Consolas, Monaco, monospace',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                                maxHeight: '60px',
                                overflow: 'auto'
                            }
                        }, data.dsl.substring(0, 200) + (data.dsl.length > 200 ? '...' : ''))
                    ]) : null,
                    data.input ? h('div', {
                        style: {
                            marginTop: '8px',
                            fontSize: '11px',
                            color: '#64748b'
                        }
                    }, [`Input: ${JSON.stringify(data.input).substring(0, 50)}...`]) : null,
                    h('div', {
                        style: {
                            marginTop: '8px',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'center',
                            backgroundColor: statusStyle.bg,
                            color: statusStyle.color
                        }
                    }, statusStyle.text)
                ],
                '#3b82f6',
                '⚡',
                data.subActionName || 'Sub Action'
            );
        };
    }
};

/**
 * ResultNode - displays step_result message
 * Gray color (#6b7280) - represents result/completion
 */
export const ResultNode = {
    name: 'ResultNode',
    type: 'result',
    props: ['id', 'type', 'data', 'selected'],
    setup(props) {
        return () => {
            const data = props.data || {};
            const success = data.success !== false;

            return createNodeWrapper(
                props,
                [
                    h('div', {
                        style: {
                            fontWeight: '600',
                            color: '#64748b',
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            marginBottom: '4px'
                        }
                    }, 'Status:'),
                    h('div', {
                        style: {
                            fontSize: '13px',
                            marginBottom: '8px',
                            fontWeight: '600',
                            color: success ? '#22c55e' : '#ef4444'
                        }
                    }, success ? '✓ Success' : '✗ Failed'),
                    data.message ? h('div', {
                        style: {
                            fontSize: '12px',
                            color: '#64748b',
                            marginBottom: '8px'
                        }
                    }, data.message) : null,
                    data.result ? h('div', {
                        style: {
                            marginTop: '8px',
                            padding: '8px',
                            backgroundColor: '#f1f5f9',
                            borderRadius: '4px'
                        }
                    }, [
                        h('div', {
                            style: {
                                fontSize: '10px',
                                color: '#64748b',
                                marginBottom: '4px'
                            }
                        }, 'Result:'),
                        h('pre', {
                            style: {
                                margin: 0,
                                fontSize: '11px',
                                color: '#1e293b',
                                fontFamily: 'Consolas, Monaco, monospace',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all'
                            }
                        }, typeof data.result === 'object' ? JSON.stringify(data.result, null, 2) : String(data.result))
                    ]) : null,
                    data.changes && data.changes.length > 0 ? h('div', {
                        style: {
                            marginTop: '8px'
                        }
                    }, [
                        h('div', {
                            style: {
                                fontWeight: '600',
                                fontSize: '11px',
                                color: '#64748b',
                                marginBottom: '4px'
                            }
                        }, 'Changes:'),
                        ...data.changes.slice(0, 5).map((change, idx) =>
                            h('div', {
                                key: idx,
                                style: {
                                    fontSize: '11px',
                                    color: '#22c55e',
                                    padding: '2px 0'
                                }
                            }, `+ ${change}`)
                        ),
                        data.changes.length > 5 ? h('div', {
                            style: {fontSize: '10px', color: '#94a3b8'}
                        }, `+${data.changes.length - 5} more changes`) : null
                    ]) : null
                ],
                '#6b7280',
                '📊',
                'Result'
            );
        };
    }
};

/**
 * ActionCompleteNode - displays action_complete message
 * Green color (#22c55e) - represents output/end of flow
 */
export const ActionCompleteNode = {
    name: 'ActionCompleteNode',
    type: 'actionComplete',
    nodeType: 'output',
    props: ['id', 'type', 'data', 'selected'],
    setup(props) {
        return () => {
            const data = props.data || {};
            const summary = data.summary || {};

            return createNodeWrapper(
                props,
                [
                    h('div', {
                        style: {
                            fontWeight: '600',
                            color: '#64748b',
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            marginBottom: '4px'
                        }
                    }, 'Action:'),
                    h('div', {
                        style: {
                            color: '#1e293b',
                            fontSize: '13px',
                            marginBottom: '8px',
                            fontWeight: '500'
                        }
                    }, data.actionName || 'Unknown'),
                    Object.keys(summary).length > 0 ? h('div', {
                        style: {
                            marginTop: '8px',
                            borderTop: '1px solid #e2e8f0',
                            paddingTop: '8px'
                        }
                    }, [
                        h('div', {
                            style: {
                                fontSize: '10px',
                                color: '#64748b',
                                marginBottom: '4px',
                                textTransform: 'uppercase'
                            }
                        }, 'Summary:'),
                        ...Object.entries(summary).map(([key, value]) =>
                            h('div', {
                                key: key,
                                style: {
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '11px',
                                    padding: '2px 0',
                                    color: '#475569'
                                }
                            }, [
                                h('span', {style: {color: '#64748b'}}, key),
                                h('span', {style: {fontWeight: '500'}}, String(value))
                            ])
                        )
                    ]) : null,
                    h('div', {
                        style: {
                            marginTop: '8px',
                            display: 'flex',
                            gap: '12px',
                            fontSize: '11px',
                            color: '#94a3b8'
                        }
                    }, [
                        h('span', {}, `Steps: ${data.totalSteps || 0}`),
                        h('span', {}, `Duration: ${data.duration || '0s'}`)
                    ])
                ],
                '#22c55e',
                '✅',
                'Action Complete'
            );
        };
    }
};

// ============================================
// Entity Node Types (NEW)
// ============================================

/**
 * Factory function to create entity node components
 */
const createEntityNode = (type, color, icon, label) => ({
    name: `${type}Node`,
    type,
    props: ['id', 'type', 'data', 'selected'],
    setup(props) {
        return () => {
            const data = props.data || {};
            return createNodeWrapper(
                props,
                [
                    h('div', {
                        style: {
                            fontWeight: '600',
                            color: '#64748b',
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            marginBottom: '4px'
                        }
                    }, `${label}:`),
                    h('div', {
                        style: {
                            color: '#1e293b',
                            fontSize: '13px',
                            marginBottom: '4px',
                            fontWeight: '500'
                        }
                    }, data.name || data.label || `${label}`),
                    data.path ? h('div', {
                        style: {
                            fontSize: '11px',
                            color: '#64748b',
                            marginBottom: '8px',
                            wordBreak: 'break-all'
                        }
                    }, data.path) : null,
                    h('div', {
                        style: {fontSize: '11px', color: '#94a3b8'}
                    }, `ID: ${data.id || 'N/A'}`)
                ],
                color,
                icon,
                type.toUpperCase()
            );
        };
    }
});

// Entity node instances
const AgentsNode = createEntityNode('agents', '#a855f7', '🤖', 'Agent');
const NodesEntityNode = createEntityNode('nodesEntity', '#3b82f6', '🔵', 'Node');
const ActionsEntityNode = createEntityNode('actionsEntity', '#f97316', '⚡', 'Action');
const ServicesNode = createEntityNode('services', '#06b6d4', '🔧', 'Service');
const TasksNode = createEntityNode('tasks', '#84cc16', '📋', 'Task');
const TerminatorsNode = createEntityNode('terminators', '#ef4444', '🛑', 'Terminator');
const PackagesNode = createEntityNode('packages', '#6366f1', '📦', 'Package');
const FeaturesNode = createEntityNode('features', '#ec4899', '✨', 'Feature');
const SystemsNode = createEntityNode('systems', '#14b8a6', '⚙️', 'System');
const ScriptsNode = createEntityNode('scripts', '#f59e0b', '📜', 'Script');
const SolutionsNode = createEntityNode('solutions', '#10b981', '💡', 'Solution');

/**
 * SessionNode - displays session info on the graph
 * Purple color (#8b5cf6) - represents a confirmed session
 * NEW: Added for session tracking after action approval
 */
const SessionNode = {
    name: 'SessionNode',
    type: 'session',
    props: ['id', 'type', 'data', 'selected'],
    setup(props) {
        return () => {
            const data = props.data || {};
            const statusColors = {
                active: {bg: '#dbeafe', color: '#2563eb', text: 'Active'},
                completed: {bg: '#dcfce7', color: '#16a34a', text: 'Completed'},
                failed: {bg: '#fee2e2', color: '#dc2626', text: 'Failed'},
                waiting: {bg: '#fef3c7', color: '#b45309', text: 'Waiting'}
            };
            const statusStyle = statusColors[data.status] || statusColors.active;

            return createNodeWrapper(
                props,
                [
                    h('div', {
                        style: {
                            fontWeight: '600',
                            color: '#64748b',
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            marginBottom: '4px'
                        }
                    }, 'Session:'),
                    h('div', {
                        style: {
                            color: '#1e293b',
                            fontSize: '13px',
                            marginBottom: '8px',
                            fontFamily: 'monospace'
                        }
                    }, (data.sessionId || 'N/A').slice(0, 12)),
                    h('div', {
                        style: {
                            display: 'flex',
                            gap: '8px',
                            fontSize: '11px',
                            color: '#64748b',
                            marginBottom: '8px'
                        }
                    }, [
                        h('span', {}, `Messages: ${data.messageCount || 0}`)
                    ]),
                    h('div', {
                        style: {
                            marginTop: '8px',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                            backgroundColor: statusStyle.bg,
                            color: statusStyle.color,
                            textAlign: 'center'
                        }
                    }, statusStyle.text)
                ],
                '#8b5cf6', // Purple color for sessions
                '📋',
                'SESSION'
            );
        };
    }
};

/**
 * Register all custom node types
 */
export function registerCustomNodes() {
    return {
        // Protocol nodes
        taskInput: TaskInputNode,
        actionProposal: ActionProposalNode,
        subAction: SubActionNode,
        result: ResultNode,
        actionComplete: ActionCompleteNode,

        // Entity nodes
        agents: AgentsNode,
        nodesEntity: NodesEntityNode,
        actionsEntity: ActionsEntityNode,
        services: ServicesNode,
        tasks: TasksNode,
        terminators: TerminatorsNode,
        packages: PackagesNode,
        features: FeaturesNode,
        systems: SystemsNode,
        scripts: ScriptsNode,
        solutions: SolutionsNode,

        // Session node (NEW - for tracking confirmed sessions)
        session: SessionNode
    };
}

/**
 * Get node type by protocol message type or entity type
 */
export function getNodeType(protocolType) {
    const nodeTypeMap = {
        // Protocol types
        'task_request': 'taskInput',
        'action_proposal': 'actionProposal',
        'action_executing': 'subAction',
        'step_result': 'result',
        'action_complete': 'actionComplete',

        // Entity types
        'agents': 'agents',
        'nodes': 'nodesEntity',
        'actions': 'actionsEntity',
        'services': 'services',
        'tasks': 'tasks',
        'terminators': 'terminators',
        'packages': 'packages',
        'features': 'features',
        'systems': 'systems',
        'scripts': 'scripts',
        'solutions': 'solutions'
    };
    return nodeTypeMap[protocolType] || 'default';
}

/**
 * Get node color by protocol message type or entity type
 */
export function getNodeColor(protocolType) {
    const colorMap = {
        // Protocol types
        'task_request': '#22c55e',
        'action_proposal': '#eab308',
        'action_executing': '#3b82f6',
        'step_result': '#6b7280',
        'action_complete': '#22c55e',

        // Entity types
        'agents': '#a855f7',
        'nodes': '#3b82f6',
        'actions': '#f97316',
        'services': '#06b6d4',
        'tasks': '#84cc16',
        'terminators': '#ef4444',
        'packages': '#6366f1',
        'features': '#ec4899',
        'systems': '#14b8a6',
        'scripts': '#f59e0b',
        'solutions': '#10b981'
    };
    return colorMap[protocolType] || '#6b7280';
}
