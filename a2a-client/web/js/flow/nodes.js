/**
 * VueFlow Custom Nodes for A2A Script Agent
 *
 * Implements custom node types for visualizing task execution flows:
 * - TaskInputNode: Entry point for user tasks
 * - ActionProposalNode: Shows proposed actions with subActions
 * - SubActionNode: Individual execution steps with DSL/script
 * - ResultNode: Success/failure results
 * - ActionCompleteNode: Final completion with summary stats
 */

import { Handle, Position } from '@vue-flow/core';

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

// TaskInputNode - Green header, shows user task input
export const TaskInputNode = {
    name: 'TaskInputNode',
    type: 'taskInput',
    nodeType: 'input',
    props: ['id', 'type', 'data', 'selected'],

    setup(props) {
        return () => {
            const { data } = props;
            const task = data?.task || 'No task specified';
            const timestamp = data?.timestamp || '';

            return {
                tag: 'div',
                props: {
                    class: 'vue-flow__node-default',
                    style: {
                        backgroundColor: '#fff',
                        border: '2px solid #22c55e',
                        borderRadius: '8px',
                        padding: '0',
                        minWidth: '300px'
                    }
                },
                children: [
                    // Header
                    {
                        tag: 'div',
                        props: {
                            style: {
                                backgroundColor: '#22c55e',
                                color: 'white',
                                padding: '8px 12px',
                                fontWeight: 'bold',
                                borderTopLeftRadius: '6px',
                                borderTopRightRadius: '6px'
                            }
                        },
                        children: ['Task Input']
                    },
                    // Content
                    {
                        tag: 'div',
                        props: {
                            style: {
                                padding: '12px'
                            }
                        },
                        children: [
                            {
                                tag: 'div',
                                props: {
                                    style: {
                                        fontSize: '14px',
                                        marginBottom: '8px'
                                    }
                                },
                                children: [task]
                            },
                            timestamp && {
                                tag: 'div',
                                props: {
                                    style: {
                                        fontSize: '12px',
                                        color: '#666',
                                        marginTop: '4px'
                                    }
                                },
                                children: [`${timestamp}`]
                            }
                        ].filter(Boolean)
                    },
                    // Bottom handle
                    {
                        tag: Handle,
                        props: {
                            type: 'source',
                            position: Position.Bottom,
                            style: {
                                backgroundColor: '#22c55e'
                            }
                        }
                    }
                ]
            };
        };
    }
};

// ActionProposalNode - Yellow header, shows action proposal with subActions list
export const ActionProposalNode = {
    name: 'ActionProposalNode',
    type: 'actionProposal',
    props: ['id', 'type', 'data', 'selected'],

    setup(props) {
        return () => {
            const { data } = props;
            const actionName = data?.actionName || 'Unknown Action';
            const description = data?.description || '';
            const matchScore = data?.matchScore;
            const subActions = data?.subActions || [];

            return {
                tag: 'div',
                props: {
                    class: 'vue-flow__node-default',
                    style: {
                        backgroundColor: '#fff',
                        border: '2px solid #eab308',
                        borderRadius: '8px',
                        padding: '0',
                        minWidth: '350px'
                    }
                },
                children: [
                    // Header
                    {
                        tag: 'div',
                        props: {
                            style: {
                                backgroundColor: '#eab308',
                                color: 'black',
                                padding: '8px 12px',
                                fontWeight: 'bold',
                                borderTopLeftRadius: '6px',
                                borderTopRightRadius: '6px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }
                        },
                        children: [
                            'Action Proposal',
                            matchScore !== undefined && {
                                tag: 'span',
                                props: {
                                    style: {
                                        fontSize: '12px',
                                        fontWeight: 'normal'
                                    }
                                },
                                children: [`${(matchScore * 100).toFixed(0)}%`]
                            }
                        ].filter(Boolean)
                    },
                    // Content
                    {
                        tag: 'div',
                        props: {
                            style: {
                                padding: '12px'
                            }
                        },
                        children: [
                            // Action name
                            {
                                tag: 'div',
                                props: {
                                    style: {
                                        fontSize: '16px',
                                        fontWeight: 'bold',
                                        marginBottom: '8px'
                                    }
                                },
                                children: [actionName]
                            },
                            // Description
                            description && {
                                tag: 'div',
                                props: {
                                    style: {
                                        fontSize: '14px',
                                        marginBottom: '12px',
                                        color: '#666'
                                    }
                                },
                                children: [description]
                            },
                            // SubActions list
                            subActions.length > 0 && {
                                tag: 'div',
                                props: {
                                    style: {
                                        marginTop: '12px'
                                    }
                                },
                                children: [
                                    {
                                        tag: 'div',
                                        props: {
                                            style: {
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                marginBottom: '8px'
                                            }
                                        },
                                        children: ['Steps:']
                                    },
                                    {
                                        tag: 'ul',
                                        props: {
                                            style: {
                                                listStyle: 'none',
                                                padding: '0',
                                                margin: '0'
                                            }
                                        },
                                        children: subActions.map((subAction, index) => ({
                                            tag: 'li',
                                            props: {
                                                style: {
                                                    padding: '4px 0',
                                                    fontSize: '13px',
                                                    display: 'flex',
                                                    alignItems: 'center'
                                                }
                                            },
                                            children: [
                                                {
                                                    tag: 'span',
                                                    props: {
                                                        style: {
                                                            display: 'inline-block',
                                                            width: '20px',
                                                            height: '20px',
                                                            backgroundColor: '#eab308',
                                                            color: 'black',
                                                            borderRadius: '50%',
                                                            textAlign: 'center',
                                                            fontSize: '12px',
                                                            lineHeight: '20px',
                                                            marginRight: '8px',
                                                            flexShrink: 0
                                                        }
                                                    },
                                                    children: [`${index + 1}`]
                                                },
                                                subAction.title || subAction.actionId || `Step ${index + 1}`
                                            ]
                                        }))
                                    }
                                ]
                            }
                        ].filter(Boolean)
                    },
                    // Handles
                    {
                        tag: Handle,
                        props: {
                            type: 'target',
                            position: Position.Top,
                            style: {
                                backgroundColor: '#eab308'
                            }
                        }
                    },
                    {
                        tag: Handle,
                        props: {
                            type: 'source',
                            position: Position.Bottom,
                            style: {
                                backgroundColor: '#eab308'
                            }
                        }
                    }
                ]
            };
        };
    }
};

// SubActionNode - Blue header, shows individual execution step with DSL/script
export const SubActionNode = {
    name: 'SubActionNode',
    type: 'subAction',
    props: ['id', 'type', 'data', 'selected'],

    setup(props) {
        return () => {
            const { data } = props;
            const subActionName = data?.subActionName || 'Unknown Step';
            const stepIndex = data?.stepIndex;
            const dsl = data?.dsl || '';
            const input = data?.input || {};
            const output = data?.output || '';
            const status = data?.status || 'pending';

            const statusColors = {
                'pending': '#6b7280',
                'running': '#3b82f6',
                'completed': '#22c55e',
                'failed': '#ef4444'
            };

            const statusColor = statusColors[status] || '#6b7280';

            return {
                tag: 'div',
                props: {
                    class: 'vue-flow__node-default',
                    style: {
                        backgroundColor: '#fff',
                        border: `2px solid ${statusColor}`,
                        borderRadius: '8px',
                        padding: '0',
                        minWidth: '400px'
                    }
                },
                children: [
                    // Header with status
                    {
                        tag: 'div',
                        props: {
                            style: {
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                padding: '8px 12px',
                                fontWeight: 'bold',
                                borderTopLeftRadius: '6px',
                                borderTopRightRadius: '6px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }
                        },
                        children: [
                            {
                                tag: 'span',
                                children: [`Step ${stepIndex || '?'}`]
                            },
                            {
                                tag: 'span',
                                props: {
                                    style: {
                                        fontSize: '12px',
                                        fontWeight: 'normal',
                                        backgroundColor: statusColor,
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        textTransform: 'capitalize'
                                    }
                                },
                                children: [status]
                            }
                        ]
                    },
                    // Content
                    {
                        tag: 'div',
                        props: {
                            style: {
                                padding: '12px'
                            }
                        },
                        children: [
                            // Sub action name
                            {
                                tag: 'div',
                                props: {
                                    style: {
                                        fontSize: '16px',
                                        fontWeight: 'bold',
                                        marginBottom: '8px'
                                    }
                                },
                                children: [subActionName]
                            },
                            // DSL/Script section
                            dsl && {
                                tag: 'div',
                                props: {
                                    style: {
                                        marginBottom: '12px'
                                    }
                                },
                                children: [
                                    {
                                        tag: 'div',
                                        props: {
                                            style: {
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                marginBottom: '4px'
                                            }
                                        },
                                        children: ['Script:']
                                    },
                                    {
                                        tag: 'pre',
                                        props: {
                                            style: {
                                                backgroundColor: '#f8f9fa',
                                                padding: '8px',
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                fontFamily: 'monospace',
                                                margin: '0',
                                                overflow: 'auto',
                                                maxHeight: '100px'
                                            }
                                        },
                                        children: [dsl]
                                    }
                                ]
                            },
                            // Input section
                            Object.keys(input).length > 0 && {
                                tag: 'div',
                                props: {
                                    style: {
                                        marginBottom: '8px'
                                    }
                                },
                                children: [
                                    {
                                        tag: 'div',
                                        props: {
                                            style: {
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                marginBottom: '4px'
                                            }
                                        },
                                        children: ['Input:']
                                    },
                                    {
                                        tag: 'div',
                                        props: {
                                            style: {
                                                fontSize: '13px',
                                                color: '#666'
                                            }
                                        },
                                        children: [JSON.stringify(input, null, 2)]
                                    }
                                ]
                            },
                            // Output section
                            output && {
                                tag: 'div',
                                props: {
                                    style: {
                                        marginTop: '8px'
                                    }
                                },
                                children: [
                                    {
                                        tag: 'div',
                                        props: {
                                            style: {
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                marginBottom: '4px'
                                            }
                                        },
                                        children: ['Output:']
                                    },
                                    {
                                        tag: 'div',
                                        props: {
                                            style: {
                                                fontSize: '13px',
                                                color: '#22c55e'
                                            }
                                        },
                                        children: [output]
                                    }
                                ]
                            }
                        ].filter(Boolean)
                    },
                    // Handles
                    {
                        tag: Handle,
                        props: {
                            type: 'target',
                            position: Position.Top,
                            style: {
                                backgroundColor: '#3b82f6'
                            }
                        }
                    },
                    {
                        tag: Handle,
                        props: {
                            type: 'source',
                            position: Position.Bottom,
                            style: {
                                backgroundColor: '#3b82f6'
                            }
                        }
                    }
                ]
            };
        };
    }
};

// ResultNode - Gray header, shows success/error results
export const ResultNode = {
    name: 'ResultNode',
    type: 'result',
    props: ['id', 'type', 'data', 'selected'],

    setup(props) {
        return () => {
            const { data } = props;
            const success = data?.success;
            const message = data?.message || '';
            const result = data?.result || {};
            const changes = data?.changes || [];

            const borderColor = success ? '#22c55e' : '#ef4444';
            const headerColor = success ? '#22c55e' : '#ef4444';
            const statusText = success ? 'Success' : 'Failed';

            return {
                tag: 'div',
                props: {
                    class: 'vue-flow__node-default',
                    style: {
                        backgroundColor: '#fff',
                        border: `2px solid ${borderColor}`,
                        borderRadius: '8px',
                        padding: '0',
                        minWidth: '350px'
                    }
                },
                children: [
                    // Header with status
                    {
                        tag: 'div',
                        props: {
                            style: {
                                backgroundColor: headerColor,
                                color: 'white',
                                padding: '8px 12px',
                                fontWeight: 'bold',
                                borderTopLeftRadius: '6px',
                                borderTopRightRadius: '6px',
                                display: 'flex',
                                alignItems: 'center'
                            }
                        },
                        children: [
                            {
                                tag: 'span',
                                props: {
                                    style: {
                                        marginRight: '8px'
                                    }
                                },
                                children: [success ? '✓' : '✗']
                            },
                            statusText
                        ]
                    },
                    // Content
                    {
                        tag: 'div',
                        props: {
                            style: {
                                padding: '12px'
                            }
                        },
                        children: [
                            // Message
                            message && {
                                tag: 'div',
                                props: {
                                    style: {
                                        fontSize: '14px',
                                        marginBottom: '12px',
                                        color: success ? '#22c55e' : '#ef4444'
                                    }
                                },
                                children: [message]
                            },
                            // Changes list
                            changes.length > 0 && {
                                tag: 'div',
                                props: {
                                    style: {
                                        marginBottom: '12px'
                                    }
                                },
                                children: [
                                    {
                                        tag: 'div',
                                        props: {
                                            style: {
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                marginBottom: '8px'
                                            }
                                        },
                                        children: ['Changes:']
                                    },
                                    {
                                        tag: 'ul',
                                        props: {
                                            style: {
                                                listStyle: 'none',
                                                padding: '0',
                                                margin: '0'
                                            }
                                        },
                                        children: changes.map(change => ({
                                            tag: 'li',
                                            props: {
                                                style: {
                                                    padding: '4px 0',
                                                    fontSize: '13px',
                                                    display: 'flex',
                                                    alignItems: 'flex-start'
                                                }
                                            },
                                            children: [
                                                {
                                                    tag: 'span',
                                                    props: {
                                                        style: {
                                                            color: '#22c55e',
                                                            marginRight: '8px',
                                                            flexShrink: 0
                                                        }
                                                    },
                                                    children: ['•']
                                                },
                                                change
                                            ]
                                        }))
                                    }
                                ]
                            },
                            // Result data
                            Object.keys(result).length > 0 && {
                                tag: 'div',
                                props: {
                                    style: {
                                        fontSize: '13px',
                                        color: '#666'
                                    }
                                },
                                children: [
                                    {
                                        tag: 'div',
                                        props: {
                                            style: {
                                                fontWeight: 'bold',
                                                marginBottom: '4px'
                                            }
                                        },
                                        children: ['Details:']
                                    },
                                    {
                                        tag: 'pre',
                                        props: {
                                            style: {
                                                backgroundColor: '#f8f9fa',
                                                padding: '8px',
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                margin: '0',
                                                overflow: 'auto',
                                                maxHeight: '100px'
                                            }
                                        },
                                        children: [JSON.stringify(result, null, 2)]
                                    }
                                ]
                            }
                        ].filter(Boolean)
                    },
                    // Bottom handle
                    {
                        tag: Handle,
                        props: {
                            type: 'target',
                            position: Position.Top,
                            style: {
                                backgroundColor: borderColor
                            }
                        }
                    }
                ]
            };
        };
    }
};

// ActionCompleteNode - Green header, shows final completion with summary
export const ActionCompleteNode = {
    name: 'ActionCompleteNode',
    type: 'actionComplete',
    nodeType: 'output',
    props: ['id', 'type', 'data', 'selected'],

    setup(props) {
        return () => {
            const { data } = props;
            const actionName = data?.actionName || 'Unknown Action';
            const summary = data?.summary || {};
            const totalSteps = data?.totalSteps || summary.totalSteps || 0;
            const duration = data?.duration || summary.duration || '';
            const filesChanged = summary.filesChanged || 0;
            const errors = summary.errors || 0;

            return {
                tag: 'div',
                props: {
                    class: 'vue-flow__node-default',
                    style: {
                        backgroundColor: '#fff',
                        border: '2px solid #22c55e',
                        borderRadius: '8px',
                        padding: '0',
                        minWidth: '350px'
                    }
                },
                children: [
                    // Header
                    {
                        tag: 'div',
                        props: {
                            style: {
                                backgroundColor: '#22c55e',
                                color: 'white',
                                padding: '8px 12px',
                                fontWeight: 'bold',
                                borderTopLeftRadius: '6px',
                                borderTopRightRadius: '6px',
                                display: 'flex',
                                alignItems: 'center'
                            }
                        },
                        children: [
                            {
                                tag: 'span',
                                props: {
                                    style: {
                                        marginRight: '8px'
                                    }
                                },
                                children: ['✓']
                            },
                            'Completed'
                        ]
                    },
                    // Content
                    {
                        tag: 'div',
                        props: {
                            style: {
                                padding: '12px'
                            }
                        },
                        children: [
                            // Action name
                            {
                                tag: 'div',
                                props: {
                                    style: {
                                        fontSize: '16px',
                                        fontWeight: 'bold',
                                        marginBottom: '12px'
                                    }
                                },
                                children: [actionName]
                            },
                            // Summary stats
                            {
                                tag: 'div',
                                props: {
                                    style: {
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: '12px',
                                        marginBottom: '12px'
                                    }
                                },
                                children: [
                                    // Total steps
                                    {
                                        tag: 'div',
                                        props: {
                                            style: {
                                                textAlign: 'center'
                                            }
                                        },
                                        children: [
                                            {
                                                tag: 'div',
                                                props: {
                                                    style: {
                                                        fontSize: '24px',
                                                        fontWeight: 'bold',
                                                        color: '#3b82f6'
                                                    }
                                                },
                                                children: [totalSteps.toString()]
                                            },
                                            {
                                                tag: 'div',
                                                props: {
                                                    style: {
                                                        fontSize: '12px',
                                                        color: '#666'
                                                    }
                                                },
                                                children: ['Steps']
                                            }
                                        ]
                                    },
                                    // Duration
                                    {
                                        tag: 'div',
                                        props: {
                                                    style: {
                                                        textAlign: 'center'
                                                    }
                                                },
                                        children: [
                                            {
                                                tag: 'div',
                                                props: {
                                                    style: {
                                                        fontSize: '24px',
                                                        fontWeight: 'bold',
                                                        color: '#22c55e'
                                                    }
                                                },
                                                children: [duration]
                                            },
                                            {
                                                tag: 'div',
                                                props: {
                                                    style: {
                                                        fontSize: '12px',
                                                        color: '#666'
                                                    }
                                                },
                                                children: ['Duration']
                                            }
                                        ]
                                    }
                                ]
                            },
                            // Additional stats
                            (filesChanged > 0 || errors > 0) && {
                                tag: 'div',
                                props: {
                                    style: {
                                        display: 'flex',
                                        justifyContent: 'space-around',
                                        marginTop: '8px'
                                    }
                                },
                                children: [
                                    filesChanged > 0 && {
                                        tag: 'div',
                                        props: {
                                            style: {
                                                textAlign: 'center'
                                            }
                                        },
                                        children: [
                                            {
                                                tag: 'div',
                                                props: {
                                                    style: {
                                                        fontSize: '18px',
                                                        fontWeight: 'bold',
                                                        color: '#eab308'
                                                    }
                                                },
                                                children: [filesChanged.toString()]
                                            },
                                            {
                                                tag: 'div',
                                                props: {
                                                    style: {
                                                        fontSize: '11px',
                                                        color: '#666'
                                                    }
                                                },
                                                children: ['Files Changed']
                                            }
                                        ]
                                    },
                                    errors > 0 && {
                                        tag: 'div',
                                        props: {
                                            style: {
                                                textAlign: 'center'
                                            }
                                        },
                                        children: [
                                            {
                                                tag: 'div',
                                                props: {
                                                    style: {
                                                        fontSize: '18px',
                                                        fontWeight: 'bold',
                                                        color: '#ef4444'
                                                    }
                                                },
                                                children: [errors.toString()]
                                            },
                                            {
                                                tag: 'div',
                                                props: {
                                                    style: {
                                                        fontSize: '11px',
                                                        color: '#666'
                                                    }
                                                },
                                                children: ['Errors']
                                            }
                                        ]
                                    }
                                ].filter(Boolean)
                            }
                        ].filter(Boolean)
                    },
                    // Top handle
                    {
                        tag: Handle,
                        props: {
                            type: 'target',
                            position: Position.Top,
                            style: {
                                backgroundColor: '#22c55e'
                            }
                        }
                    }
                ]
            };
        };
    }
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