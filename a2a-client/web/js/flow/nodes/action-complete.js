/**
 * VueFlow Custom Node - ActionCompleteNode
 * 
 * Final completion with summary stats
 * Green header
 */

import { Handle, Position } from '@vue-flow/core';

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
