/**
 * VueFlow Custom Node - SubActionNode
 * 
 * Individual execution steps with DSL/script
 * Blue header
 */

import { Handle, Position } from '@vue-flow/core';

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
