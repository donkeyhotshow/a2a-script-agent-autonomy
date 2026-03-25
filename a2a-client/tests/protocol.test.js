/**
 * Protocol Mapping Tests
 * Tests for mapping A2A simulation responses to VueFlow nodes and edges
 */

import {describe, it, expect, beforeEach, vi} from 'vitest';
import {
    mapSimulationResponseToFlow,
    createEdgesFromNodes,
    layoutNodes,
    validateResponseForMapping
} from '../web/js/flow/protocol.js';

// Mock the nodes module
vi.mock('../web/js/flow/nodes.js', () => ({
    getNodeType: vi.fn((outcome) => {
        const typeMap = {
            'task_request': 'taskInput',
            'action_proposal': 'actionProposal',
            'action_executing': 'subAction',
            'step_result': 'result',
            'action_complete': 'actionComplete'
        };
        return typeMap[outcome] || 'default';
    }),
    getNodeColor: vi.fn((outcome) => {
        const colorMap = {
            'task_request': '#22c55e',
            'action_proposal': '#eab308',
            'action_executing': '#3b82f6',
            'step_result': '#6b7280',
            'action_complete': '#22c55e'
        };
        return colorMap[outcome] || '#6b7280';
    })
}));

describe('Protocol Mapping', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('mapSimulationResponseToFlow()', () => {
        it('should map action_proposal outcome to nodes', () => {
            const response = {
                outcome: 'action_proposal',
                context: {
                    execution: {
                        action: 'Fix imports',
                        description: 'Update import statements'
                    }
                },
                data: {
                    subActions: [
                        {title: 'Find incorrect imports', actionId: 'step1'},
                        {title: 'Update import paths', actionId: 'step2'}
                    ]
                }
            };

            const result = mapSimulationResponseToFlow(response);

            expect(result.nodes).toHaveLength(1);
            expect(result.nodes[0].type).toBe('actionProposal');
            expect(result.nodes[0].data.actionName).toBe('Fix imports');
            expect(result.nodes[0].data.subActions).toHaveLength(2);
            expect(result.edges).toHaveLength(0); // No previous nodes
        });

        it('should map action_executing outcome with executingAction', () => {
            const response = {
                outcome: 'action_executing',
                context: {
                    execution: {
                        action: 'Running steps'
                    }
                },
                data: {
                    executingAction: {
                        subActions: [
                            {
                                title: 'Update imports',
                                actionId: 'step1',
                                status: 'running',
                                dsl: 'import { Component } from "react";'
                            }
                        ]
                    }
                }
            };

            const result = mapSimulationResponseToFlow(response);

            expect(result.nodes).toHaveLength(1);
            expect(result.nodes[0].type).toBe('subAction');
            expect(result.nodes[0].data.status).toBe('running');
            expect(result.nodes[0].data.dsl).toBe('import { Component } from "react";');
        });

        it('should map action_complete outcome with completion result', () => {
            const response = {
                outcome: 'action_complete',
                context: {
                    execution: {
                        action: 'Import optimization'
                    }
                },
                data: {
                    result: {
                        completed: true,
                        summary: {
                            totalSteps: 5,
                            duration: '15s',
                            filesChanged: 12
                        },
                        error: null
                    }
                }
            };

            const result = mapSimulationResponseToFlow(response);

            expect(result.nodes).toHaveLength(2); // result node + actionComplete node
            expect(result.nodes[0].type).toBe('result');
            expect(result.nodes[0].data.success).toBe(true);
            expect(result.nodes[1].type).toBe('actionComplete');
            expect(result.nodes[1].data.summary.totalSteps).toBe(5);
        });

        it('should create edges between nodes', () => {
            const existingNodes = [
                {
                    id: 'task-1',
                    type: 'taskInput',
                    position: { x: 250, y: 50 },
                    data: { task: 'Test task' }
                }
            ];

            const response = {
                outcome: 'action_proposal',
                context: {
                    execution: {
                        action: 'Test action'
                    }
                }
            };

            const result = mapSimulationResponseToFlow(response, existingNodes);

            expect(result.nodes).toHaveLength(2);
            expect(result.edges).toHaveLength(1);
            expect(result.edges[0].source).toBe('task-1');
            expect(result.edges[0].target).toMatch(/^actionProposal-/);
            expect(result.edges[0].style.stroke).toBe('#eab308');
        });

        it('should animate running step edge', () => {
            const existingNodes = [
                {
                    id: 'proposal-1',
                    type: 'actionProposal',
                    position: { x: 250, y: 100 },
                    data: { actionName: 'Test' }
                }
            ];

            const response = {
                outcome: 'action_executing',
                data: {
                    executingAction: { actionId: 'test-action' },
                    subActions: [
                        { title: 'Step 1', status: 'running' }
                    ]
                }
            };

            const result = mapSimulationResponseToFlow(response, existingNodes);

            expect(result.edges).toHaveLength(1);
            expect(result.edges[0].animated).toBe(true);
        });
    });

    describe('createEdgesFromNodes()', () => {
        it('should create sequential edges between nodes', () => {
            const nodes = [
                { id: 'node1', type: 'taskInput', data: {} },
                { id: 'node2', type: 'actionProposal', data: {} },
                { id: 'node3', type: 'subAction', data: {} }
            ];

            const edges = createEdgesFromNodes(nodes);

            expect(edges).toHaveLength(2);
            expect(edges[0]).toEqual({
                id: 'edge-node1-node2',
                source: 'node1',
                target: 'node2',
                type: 'default',
                style: { stroke: '#22c55e', strokeWidth: 2 },
                animated: false
            });
            expect(edges[1]).toEqual({
                id: 'edge-node2-node3',
                source: 'node2',
                target: 'node3',
                type: 'default',
                style: { stroke: '#eab308', strokeWidth: 2 },
                animated: false
            });
        });

        it('should animate edges for running nodes', () => {
            const nodes = [
                { id: 'node1', type: 'actionProposal', data: {} },
                { id: 'node2', type: 'subAction', data: { status: 'running' } },
                { id: 'node3', type: 'result', data: {} }
            ];

            const edges = createEdgesFromNodes(nodes);

            expect(edges[0].animated).toBe(true); // edge to running node2 is animated
            expect(edges[1].animated).toBe(true); // edge from running node2 to result is animated
        });

        it('should handle empty node array', () => {
            const edges = createEdgesFromNodes([]);
            expect(edges).toHaveLength(0);
        });

        it('should handle single node', () => {
            const nodes = [{ id: 'node1', type: 'taskInput', data: {} }];
            const edges = createEdgesFromNodes(nodes);
            expect(edges).toHaveLength(0);
        });
    });

    describe('layoutNodes()', () => {
        it('should position nodes vertically', () => {
            const nodes = [
                { id: 'node1', type: 'taskInput', data: {} },
                { id: 'node2', type: 'actionProposal', data: {} },
                { id: 'node3', type: 'subAction', data: {} }
            ];

            const laidOutNodes = layoutNodes(nodes);

            expect(laidOutNodes[0].position).toEqual({ x: 250, y: 50 });
            expect(laidOutNodes[1].position).toEqual({ x: 250, y: 200 });
            expect(laidOutNodes[2].position).toEqual({ x: 250, y: 350 });
        });

        it('should preserve other node properties', () => {
            const node = {
                id: 'test',
                type: 'taskInput',
                data: { task: 'Test task' },
                extraProp: 'preserved'
            };

            const laidOutNodes = layoutNodes([node]);

            expect(laidOutNodes[0].id).toBe('test');
            expect(laidOutNodes[0].type).toBe('taskInput');
            expect(laidOutNodes[0].data.task).toBe('Test task');
            expect(laidOutNodes[0].extraProp).toBe('preserved');
        });
    });

    describe('validateResponseForMapping()', () => {
        it('should validate correct response structure', () => {
            const validResponse = {
                outcome: 'action_proposal',
                context: {},
                data: {}
            };

            expect(validateResponseForMapping(validResponse)).toBe(true);
        });

        it('should reject invalid response structures', () => {
            expect(validateResponseForMapping(null)).toBe(false);
            expect(validateResponseForMapping(undefined)).toBe(false);
            expect(validateResponseForMapping('string')).toBe(false);
            expect(validateResponseForMapping({})).toBe(false);
            expect(validateResponseForMapping({ context: {} })).toBe(false);
        });

        it('should accept minimal valid response', () => {
            const minimalResponse = { outcome: 'test' };
            expect(validateResponseForMapping(minimalResponse)).toBe(true);
        });
    });
});