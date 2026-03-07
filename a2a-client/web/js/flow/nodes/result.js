/**
 * VueFlow Custom Node - ResultNode
 * 
 * Shows success/error results
 * Gray header (green for success, red for failure)
 */

import { Handle, Position } from '@vue-flow/core';

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
