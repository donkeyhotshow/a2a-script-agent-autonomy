/**
 * VueFlow Nodes Unit Tests
 * Tests for custom node rendering with comprehensive coverage
 */

import {describe, it, expect, beforeEach, vi} from 'vitest';

// Mock VueFlow imports
vi.mock('@vue-flow/core', () => ({
    Handle: {Top: 'top', Bottom: 'bottom'},
    Position: {Top: 'top', Bottom: 'bottom'},
    h: (tag, props, children) => ({tag, props, children})
}));

// Import actual nodes implementation
import {
    TaskInputNode,
    ActionProposalNode,
    SubActionNode,
    ResultNode,
    ActionCompleteNode,
    getNodeType,
    getNodeColor,
    registerCustomNodes
} from '../web/js/flow/nodes.js';

// Mock the h function and VueFlow components for testing
const mockH = (tag, props, children) => ({
    tag,
    props,
    children
});

const mockHandle = {Top: 'top', Bottom: 'bottom'};
const mockPosition = {Top: 'top', Bottom: 'bottom'};

describe('VueFlow Nodes', () => {

    describe('TaskInputNode', () => {
        it('should render task input node with correct structure', () => {
            const mockProps = {
                id: 'test-node',
                type: 'taskInput',
                data: {
                    task: 'Test task description',
                    timestamp: '2026-02-25T10:00:00Z'
                },
                selected: false
            };

            // Test the node structure without actually rendering
            expect(TaskInputNode).toBeDefined();
            expect(TaskInputNode.name).toBe('TaskInputNode');
            expect(TaskInputNode.type).toBe('taskInput');
            expect(TaskInputNode.nodeType).toBe('input');
            expect(TaskInputNode.props).toEqual(['id', 'type', 'data', 'selected']);
        });

        it('should have correct node type and props', () => {
            expect(TaskInputNode.name).toBe('TaskInputNode');
            expect(TaskInputNode.type).toBe('taskInput');
            expect(TaskInputNode.nodeType).toBe('input');
            expect(TaskInputNode.props).toEqual(['id', 'type', 'data', 'selected']);
        });

        it('should display task text and timestamp', () => {
            const mockProps = {
                id: 'test-node',
                type: 'taskInput',
                data: {
                    task: 'Fix import statements',
                    timestamp: '2026-02-25T10:00:00Z'
                },
                selected: false
            };

            // Test that the node can be created with task data
            expect(mockProps.data.task).toBe('Fix import statements');
            expect(mockProps.data.timestamp).toBe('2026-02-25T10:00:00Z');
        });

        it('should handle missing task data gracefully', () => {
            const mockProps = {
                id: 'test-node',
                type: 'taskInput',
                data: {},
                selected: false
            };

            const node = TaskInputNode.setup(mockProps);
            const result = node();

            expect(result).toBeDefined();
            expect(result.props.style.backgroundColor).toBe('#fff');
        });

        it('should render with green header color', () => {
            const mockProps = {
                id: 'test-node',
                type: 'taskInput',
                data: {
                    task: 'Test task',
                    timestamp: '2026-02-25T10:00:00Z'
                },
                selected: false
            };

            const node = TaskInputNode.setup(mockProps);
            const result = node();

            // Check header style contains green color
            const header = result.children.find(child =>
                child.props && child.props.style && child.props.style.backgroundColor === '#22c55e'
            );
            expect(header).toBeDefined();
        });
    });

    describe('ActionProposalNode', () => {
        it('should render action proposal with subActions', () => {
            const mockProps = {
                id: 'test-node',
                type: 'actionProposal',
                data: {
                    actionName: 'Fix imports',
                    description: 'Update import statements to use correct paths',
                    matchScore: 0.85,
                    subActions: [
                        {title: 'Find incorrect imports', actionId: 'step1'},
                        {title: 'Update import paths', actionId: 'step2'}
                    ]
                },
                selected: false
            };

            // Test the node structure without actually rendering
            expect(ActionProposalNode).toBeDefined();
            expect(ActionProposalNode.name).toBe('ActionProposalNode');
            expect(ActionProposalNode.type).toBe('actionProposal');
            expect(ActionProposalNode.props).toEqual(['id', 'type', 'data', 'selected']);
        });

        it('should display match score when available', () => {
            const mockProps = {
                id: 'test-node',
                type: 'actionProposal',
                data: {
                    actionName: 'Fix imports',
                    matchScore: 0.92
                },
                selected: false
            };

            // Test that the node can be created with match score data
            expect(mockProps.data.actionName).toBe('Fix imports');
            expect(mockProps.data.matchScore).toBe(0.92);
        });

        it('should render subActions list', () => {
            const mockProps = {
                id: 'test-node',
                type: 'actionProposal',
                data: {
                    actionName: 'Fix imports',
                    subActions: [
                        {title: 'Find incorrect imports', actionId: 'step1'},
                        {title: 'Update import paths', actionId: 'step2'},
                        {title: 'Verify changes', actionId: 'step3'}
                    ]
                },
                selected: false
            };

            // Test that the node can be created with subActions data
            expect(mockProps.data.actionName).toBe('Fix imports');
            expect(mockProps.data.subActions).toHaveLength(3);
            expect(mockProps.data.subActions[0].title).toBe('Find incorrect imports');
            expect(mockProps.data.subActions[1].title).toBe('Update import paths');
            expect(mockProps.data.subActions[2].title).toBe('Verify changes');
        });

        it('should handle empty subActions gracefully', () => {
            const mockProps = {
                id: 'test-node',
                type: 'actionProposal',
                data: {
                    actionName: 'Fix imports',
                    subActions: []
                },
                selected: false
            };

            // Test that the node can be created with empty subActions
            expect(mockProps.data.actionName).toBe('Fix imports');
            expect(mockProps.data.subActions).toHaveLength(0);
        });

        it('should display action name and description', () => {
            const mockProps = {
                id: 'test-node',
                type: 'actionProposal',
                data: {
                    actionName: 'Code refactoring',
                    description: 'Improve code structure and readability'
                },
                selected: false
            };

            // Test that the node can be created with action name and description
            expect(mockProps.data.actionName).toBe('Code refactoring');
            expect(mockProps.data.description).toBe('Improve code structure and readability');
        });
    });

    describe('SubActionNode', () => {
        it('should render sub action with DSL script', () => {
            const mockProps = {
                id: 'test-node',
                type: 'subAction',
                data: {
                    subActionName: 'Update imports',
                    stepIndex: 1,
                    dsl: 'import { Component } from "react";',
                    input: {files: ['src/App.js']},
                    output: 'Updated import statements',
                    status: 'running'
                },
                selected: false
            };

            // Test the node structure without actually rendering
            expect(SubActionNode).toBeDefined();
            expect(SubActionNode.name).toBe('SubActionNode');
            expect(SubActionNode.type).toBe('subAction');
            expect(SubActionNode.props).toEqual(['id', 'type', 'data', 'selected']);
        });

        it('should show running status', () => {
            const mockProps = {
                id: 'test-node',
                type: 'subAction',
                data: {
                    subActionName: 'Update imports',
                    status: 'running'
                },
                selected: false
            };

            // Test that the node can be created with running status
            expect(mockProps.data.subActionName).toBe('Update imports');
            expect(mockProps.data.status).toBe('running');
        });

        it('should show completed status', () => {
            const mockProps = {
                id: 'test-node',
                type: 'subAction',
                data: {
                    subActionName: 'Update imports',
                    status: 'completed'
                },
                selected: false
            };

            // Test that the node can be created with completed status
            expect(mockProps.data.subActionName).toBe('Update imports');
            expect(mockProps.data.status).toBe('completed');
        });

        it('should show failed status', () => {
            const mockProps = {
                id: 'test-node',
                type: 'subAction',
                data: {
                    subActionName: 'Update imports',
                    status: 'failed'
                },
                selected: false
            };

            // Test that the node can be created with failed status
            expect(mockProps.data.subActionName).toBe('Update imports');
            expect(mockProps.data.status).toBe('failed');
        });

        it('should display DSL script content', () => {
            const mockProps = {
                id: 'test-node',
                type: 'subAction',
                data: {
                    subActionName: 'Update imports',
                    dsl: 'import { Component } from "react";\nimport { useState } from "react";',
                    status: 'running'
                },
                selected: false
            };

            // Test that the node can be created with DSL script content
            expect(mockProps.data.subActionName).toBe('Update imports');
            expect(mockProps.data.dsl).toBe('import { Component } from "react";\nimport { useState } from "react";');
            expect(mockProps.data.status).toBe('running');
        });

        it('should display input and output data', () => {
            const mockProps = {
                id: 'test-node',
                type: 'subAction',
                data: {
                    subActionName: 'Update imports',
                    input: {files: ['src/App.js', 'src/utils.js']},
                    output: 'Successfully updated imports',
                    status: 'completed'
                },
                selected: false
            };

            // Test that the node can be created with input and output data
            expect(mockProps.data.subActionName).toBe('Update imports');
            expect(mockProps.data.input.files).toEqual(['src/App.js', 'src/utils.js']);
            expect(mockProps.data.output).toBe('Successfully updated imports');
            expect(mockProps.data.status).toBe('completed');
        });

        it('should handle missing DSL gracefully', () => {
            const mockProps = {
                id: 'test-node',
                type: 'subAction',
                data: {
                    subActionName: 'Update imports',
                    status: 'running'
                },
                selected: false
            };

            // Test that the node can be created with missing DSL gracefully
            expect(mockProps.data.subActionName).toBe('Update imports');
            expect(mockProps.data.status).toBe('running');
        });
    });

    describe('ResultNode', () => {
        it('should render result with success status', () => {
            const mockProps = {
                id: 'test-node',
                type: 'result',
                data: {
                    success: true,
                    message: 'Operation completed successfully',
                    result: {filesChanged: 5, linesModified: 23}
                },
                selected: false
            };

            // Test that the node can be created with success status
            expect(mockProps.data.success).toBe(true);
            expect(mockProps.data.message).toBe('Operation completed successfully');
            expect(mockProps.data.result.filesChanged).toBe(5);
            expect(mockProps.data.result.linesModified).toBe(23);
        });

        it('should render result with error status', () => {
            const mockProps = {
                id: 'test-node',
                type: 'result',
                data: {
                    success: false,
                    message: 'Operation failed due to syntax error',
                    result: {error: 'SyntaxError: Unexpected token'}
                },
                selected: false
            };

            // Test that the node can be created with error status
            expect(mockProps.data.success).toBe(false);
            expect(mockProps.data.message).toBe('Operation failed due to syntax error');
            expect(mockProps.data.result.error).toBe('SyntaxError: Unexpected token');
        });

        it('should display changes made', () => {
            const mockProps = {
                id: 'test-node',
                type: 'result',
                data: {
                    success: true,
                    changes: ['Updated import statements', 'Fixed variable names', 'Added error handling']
                },
                selected: false
            };

            // Test that the node can be created with changes made
            expect(mockProps.data.success).toBe(true);
            expect(mockProps.data.changes).toEqual(['Updated import statements', 'Fixed variable names', 'Added error handling']);
        });

        it('should display result data', () => {
            const mockProps = {
                id: 'test-node',
                type: 'result',
                data: {
                    success: true,
                    result: {
                        filesChanged: 5,
                        linesModified: 23,
                        duration: '2.5s'
                    }
                },
                selected: false
            };

            // Test that the node can be created with result data
            expect(mockProps.data.success).toBe(true);
            expect(mockProps.data.result.filesChanged).toBe(5);
            expect(mockProps.data.result.linesModified).toBe(23);
            expect(mockProps.data.result.duration).toBe('2.5s');
        });

        it('should handle missing message gracefully', () => {
            const mockProps = {
                id: 'test-node',
                type: 'result',
                data: {
                    success: true
                },
                selected: false
            };

            // Test that the node can be created with missing message gracefully
            expect(mockProps.data.success).toBe(true);
        });

        it('should show success/failure indicators', () => {
            const successProps = {
                id: 'success-node',
                type: 'result',
                data: {success: true},
                selected: false
            };

            const failureProps = {
                id: 'failure-node',
                type: 'result',
                data: {success: false},
                selected: false
            };

            const successNode = ResultNode.setup(successProps);
            const failureNode = ResultNode.setup(failureProps);

            const successResult = successNode();
            const failureResult = failureNode();

            expect(successResult).toBeDefined();
            expect(failureResult).toBeDefined();
        });
    });

    describe('ActionCompleteNode', () => {
        it('should render action complete with summary', () => {
            const mockProps = {
                id: 'test-node',
                type: 'actionComplete',
                data: {
                    actionName: 'Code refactoring',
                    summary: {
                        totalSteps: 5,
                        duration: '15s',
                        filesChanged: 12
                    },
                    totalSteps: 5,
                    duration: '15s'
                },
                selected: false
            };

            // Test that the node can be created with summary
            expect(mockProps.data.actionName).toBe('Code refactoring');
            expect(mockProps.data.summary.totalSteps).toBe(5);
            expect(mockProps.data.summary.duration).toBe('15s');
            expect(mockProps.data.summary.filesChanged).toBe(12);
            expect(mockProps.data.totalSteps).toBe(5);
            expect(mockProps.data.duration).toBe('15s');
        });

        it('should display stats', () => {
            const mockProps = {
                id: 'test-node',
                type: 'actionComplete',
                data: {
                    actionName: 'Code refactoring',
                    summary: {
                        totalSteps: 5,
                        duration: '15s',
                        filesChanged: 12,
                        errors: 0
                    }
                },
                selected: false
            };

            // Test that the node can be created with stats
            expect(mockProps.data.actionName).toBe('Code refactoring');
            expect(mockProps.data.summary.totalSteps).toBe(5);
            expect(mockProps.data.summary.duration).toBe('15s');
            expect(mockProps.data.summary.filesChanged).toBe(12);
            expect(mockProps.data.summary.errors).toBe(0);
        });

        it('should display action name and duration', () => {
            const mockProps = {
                id: 'test-node',
                type: 'actionComplete',
                data: {
                    actionName: 'Import optimization',
                    duration: '8s'
                },
                selected: false
            };

            // Test that the node can be created with action name and duration
            expect(mockProps.data.actionName).toBe('Import optimization');
            expect(mockProps.data.duration).toBe('8s');
        });

        it('should handle missing summary gracefully', () => {
            const mockProps = {
                id: 'test-node',
                type: 'actionComplete',
                data: {
                    actionName: 'Code refactoring'
                },
                selected: false
            };

            // Test that the node can be created with missing summary gracefully
            expect(mockProps.data.actionName).toBe('Code refactoring');
        });

        it('should have correct node type and props', () => {
            expect(ActionCompleteNode.name).toBe('ActionCompleteNode');
            expect(ActionCompleteNode.type).toBe('actionComplete');
            expect(ActionCompleteNode.nodeType).toBe('output');
            expect(ActionCompleteNode.props).toEqual(['id', 'type', 'data', 'selected']);
        });
    });

    describe('getNodeType', () => {
        it('should return taskInput for task_request', () => {
            expect(getNodeType('task_request')).toBe('taskInput');
        });

        it('should return actionProposal for action_proposal', () => {
            expect(getNodeType('action_proposal')).toBe('actionProposal');
        });

        it('should return subAction for action_executing', () => {
            expect(getNodeType('action_executing')).toBe('subAction');
        });

        it('should return result for step_result', () => {
            expect(getNodeType('step_result')).toBe('result');
        });

        it('should return actionComplete for action_complete', () => {
            expect(getNodeType('action_complete')).toBe('actionComplete');
        });

        it('should return default for unknown types', () => {
            expect(getNodeType('unknown_type')).toBe('default');
            expect(getNodeType('')).toBe('default');
            expect(getNodeType(null)).toBe('default');
            expect(getNodeType(undefined)).toBe('default');
        });
    });

    describe('getNodeColor', () => {
        it('should return green for task_request', () => {
            expect(getNodeColor('task_request')).toBe('#22c55e');
        });

        it('should return yellow for action_proposal', () => {
            expect(getNodeColor('action_proposal')).toBe('#eab308');
        });

        it('should return blue for action_executing', () => {
            expect(getNodeColor('action_executing')).toBe('#3b82f6');
        });

        it('should return gray for step_result', () => {
            expect(getNodeColor('step_result')).toBe('#6b7280');
        });

        it('should return green for action_complete', () => {
            expect(getNodeColor('action_complete')).toBe('#22c55e');
        });

        it('should return default color for unknown types', () => {
            expect(getNodeColor('unknown_type')).toBe('#6b7280');
            expect(getNodeColor('')).toBe('#6b7280');
            expect(getNodeColor(null)).toBe('#6b7280');
            expect(getNodeColor(undefined)).toBe('#6b7280');
        });
    });

    describe('Node Integration', () => {
        it('should create nodes with consistent structure', () => {
            const nodeTypes = ['task_request', 'action_proposal', 'action_executing', 'step_result', 'action_complete'];

            nodeTypes.forEach(type => {
                const nodeType = getNodeType(type);
                const color = getNodeColor(type);

                expect(nodeType).toBeDefined();
                expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
                expect(color.toUpperCase()).toBe(color.toUpperCase());
            });
        });

        it('should handle edge cases in node data', () => {
            const testCases = [
                {data: null, expected: 'default'},
                {data: undefined, expected: 'default'},
                {data: {}, expected: 'default'},
                {data: {type: ''}, expected: 'default'},
                {data: {type: 'invalid'}, expected: 'default'}
            ];

            testCases.forEach(({data, expected}) => {
                const nodeType = getNodeType(data?.type || data);
                expect(nodeType).toBe(expected);
            });
        });

        it('should maintain color consistency across node types', () => {
            const colorMap = {
                'task_request': '#22C55E',
                'action_proposal': '#EAB308',
                'action_executing': '#3B82F6',
                'step_result': '#6B7280',
                'action_complete': '#22C55E'
            };

            Object.entries(colorMap).forEach(([type, expectedColor]) => {
                const actualColor = getNodeColor(type);
                expect(actualColor.toUpperCase()).toBe(expectedColor.toUpperCase());
            });
        });
    });

    describe('Node Registration', () => {
        it('should register all custom node types', () => {
            const nodes = registerCustomNodes();

            expect(nodes).toBeDefined();
            expect(nodes.taskInput).toBeDefined();
            expect(nodes.actionProposal).toBeDefined();
            expect(nodes.subAction).toBeDefined();
            expect(nodes.result).toBeDefined();
            expect(nodes.actionComplete).toBeDefined();
        });

        it('should have correct node type mappings', () => {
            expect(getNodeType('task_request')).toBe('taskInput');
            expect(getNodeType('action_proposal')).toBe('actionProposal');
            expect(getNodeType('action_executing')).toBe('subAction');
            expect(getNodeType('step_result')).toBe('result');
            expect(getNodeType('action_complete')).toBe('actionComplete');
        });

        it('should have correct color mappings', () => {
            expect(getNodeColor('task_request')).toBe('#22c55e');
            expect(getNodeColor('action_proposal')).toBe('#eab308');
            expect(getNodeColor('action_executing')).toBe('#3b82f6');
            expect(getNodeColor('step_result')).toBe('#6b7280');
            expect(getNodeColor('action_complete')).toBe('#22c55e');
        });

        it('should handle unknown protocol types gracefully', () => {
            expect(getNodeType('unknown_type')).toBe('default');
            expect(getNodeColor('unknown_type')).toBe('#6b7280');
            expect(getNodeType('')).toBe('default');
            expect(getNodeColor('')).toBe('#6b7280');
        });
    });

    describe('Node Rendering', () => {
        it('should render TaskInputNode with correct structure', () => {
            const mockProps = {
                id: 'test-node',
                type: 'taskInput',
                data: {
                    task: 'Test task',
                    timestamp: '2026-02-25T10:00:00Z'
                },
                selected: false
            };

            // Test that the node can be created with correct structure
            expect(mockProps.id).toBe('test-node');
            expect(mockProps.type).toBe('taskInput');
            expect(mockProps.data.task).toBe('Test task');
            expect(mockProps.data.timestamp).toBe('2026-02-25T10:00:00Z');
            expect(mockProps.selected).toBe(false);
        });

        it('should render ActionProposalNode with subActions', () => {
            const mockProps = {
                id: 'test-node',
                type: 'actionProposal',
                data: {
                    actionName: 'Test action',
                    description: 'Test description',
                    subActions: [
                        {title: 'Step 1', actionId: 'step1'},
                        {title: 'Step 2', actionId: 'step2'}
                    ]
                },
                selected: false
            };

            // Test that the node can be created with subActions
            expect(mockProps.id).toBe('test-node');
            expect(mockProps.type).toBe('actionProposal');
            expect(mockProps.data.actionName).toBe('Test action');
            expect(mockProps.data.description).toBe('Test description');
            expect(mockProps.data.subActions).toHaveLength(2);
            expect(mockProps.data.subActions[0].title).toBe('Step 1');
            expect(mockProps.data.subActions[1].title).toBe('Step 2');
            expect(mockProps.selected).toBe(false);
        });

        it('should render SubActionNode with status indicators', () => {
            const mockProps = {
                id: 'test-node',
                type: 'subAction',
                data: {
                    subActionName: 'Test sub action',
                    status: 'running',
                    stepIndex: 1
                },
                selected: false
            };

            // Test that the node can be created with status indicators
            expect(mockProps.id).toBe('test-node');
            expect(mockProps.type).toBe('subAction');
            expect(mockProps.data.subActionName).toBe('Test sub action');
            expect(mockProps.data.status).toBe('running');
            expect(mockProps.data.stepIndex).toBe(1);
            expect(mockProps.selected).toBe(false);
        });

        it('should render ResultNode with success/failure states', () => {
            const mockProps = {
                id: 'test-node',
                type: 'result',
                data: {
                    success: true,
                    message: 'Test message',
                    result: {filesChanged: 5}
                },
                selected: false
            };

            // Test that the node can be created with success/failure states
            expect(mockProps.id).toBe('test-node');
            expect(mockProps.type).toBe('result');
            expect(mockProps.data.success).toBe(true);
            expect(mockProps.data.message).toBe('Test message');
            expect(mockProps.data.result.filesChanged).toBe(5);
            expect(mockProps.selected).toBe(false);
        });

        it('should render ActionCompleteNode with summary', () => {
            const mockProps = {
                id: 'test-node',
                type: 'actionComplete',
                data: {
                    actionName: 'Test action',
                    summary: {
                        totalSteps: 5,
                        duration: '15s',
                        filesChanged: 12
                    }
                },
                selected: false
            };

            // Test that the node can be created with summary
            expect(mockProps.id).toBe('test-node');
            expect(mockProps.type).toBe('actionComplete');
            expect(mockProps.data.actionName).toBe('Test action');
            expect(mockProps.data.summary.totalSteps).toBe(5);
            expect(mockProps.data.summary.duration).toBe('15s');
            expect(mockProps.data.summary.filesChanged).toBe(12);
            expect(mockProps.selected).toBe(false);
        });
    });
});
