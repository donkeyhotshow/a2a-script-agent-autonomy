/**
 * VueFlow Custom Node - TaskInputNode
 * 
 * Entry point for user tasks
 * Green header, shows user task input
 */

import { Handle, Position } from '@vue-flow/core';

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
