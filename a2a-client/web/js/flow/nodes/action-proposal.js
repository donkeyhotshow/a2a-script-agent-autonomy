/**
 * VueFlow Custom Node - ActionProposalNode
 * 
 * Shows proposed actions with subActions list
 * Yellow header
 */

import { Handle, Position } from '@vue-flow/core';

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
