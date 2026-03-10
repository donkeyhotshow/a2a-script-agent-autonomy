/**
 * A2AFlowManager Tests
 * Tests for VueFlow flow manager integration
 */

import {describe, it, expect, beforeEach, vi, afterEach} from 'vitest';
import { A2AFlowManager, flowManager } from '../web/js/flow/flow-manager.js';

// Mock Vue and VueFlow
const mockVue = {
    createApp: vi.fn(() => ({
        mount: vi.fn(() => ({
            $el: {
                querySelector: vi.fn(() => ({
                    __vue__: {
                        zoomIn: vi.fn(),
                        zoomOut: vi.fn(),
                        fitView: vi.fn()
                    }
                }))
            },
            $destroy: vi.fn(),
            nodes: [],
            edges: []
        }))
    }))
};

const mockVueFlow = {
    VueFlow: vi.fn()
};

vi.mock('vue', () => mockVue);
vi.mock('@vue-flow/core', () => mockVueFlow);

// Mock DOM elements
const mockContainer = {
    style: {}
};

const mockDocument = {
    getElementById: vi.fn((id) => {
        if (id === 'flow-container') return mockContainer;
        return null;
    }),
    createElement: vi.fn(() => mockContainer)
};

global.document = mockDocument;
global.window = {};

// Mock protocol functions
vi.mock('../web/js/flow/protocol.js', () => ({
    mapSimulationResponseToFlow: vi.fn(() => ({ nodes: [], edges: [] })),
    createEdgesFromNodes: vi.fn(() => []),
    layoutNodes: vi.fn((nodes) => nodes)
}));

// Mock nodes
vi.mock('../web/js/flow/nodes.js', () => ({
    registerCustomNodes: vi.fn(() => ({
        taskInput: {},
        actionProposal: {},
        subAction: {},
        result: {},
        actionComplete: {}
    }))
}));

describe('A2AFlowManager', () => {
    let manager;

    beforeEach(() => {
        vi.clearAllMocks();
        manager = new A2AFlowManager();
        global.window.Sessions = null;
    });

    afterEach(() => {
        if (manager.isInitialized) {
            manager.destroy();
        }
    });

    describe('init()', () => {
        it('should initialize VueFlow instance', async () => {
            global.Vue = mockVue;
            global.VueFlow = mockVueFlow;

            const result = await manager.init();

            expect(result).toBe(true);
            expect(manager.isInitialized).toBe(true);
            expect(mockVue.createApp).toHaveBeenCalled();
        });

        it('should throw error if Vue not available', async () => {
            global.Vue = undefined;

            await expect(manager.init()).rejects.toThrow('Vue and VueFlow must be loaded');
        });

        it('should throw error if container not found', async () => {
            global.Vue = mockVue;
            global.VueFlow = mockVueFlow;
            mockDocument.getElementById.mockReturnValueOnce(null);

            await expect(manager.init()).rejects.toThrow('Container element with id \'flow-container\' not found');
        });
    });

    describe('addTask()', () => {
        beforeEach(async () => {
            global.Vue = mockVue;
            global.VueFlow = mockVueFlow;
            await manager.init();
        });

        it('should add task node to flow', () => {
            const taskNode = manager.addTask('Test task', 'project-1');

            expect(manager.nodes).toHaveLength(1);
            expect(manager.nodes[0].type).toBe('taskInput');
            expect(manager.nodes[0].data.task).toBe('Test task');
            expect(manager.nodes[0].data.projectId).toBe('project-1');
            expect(taskNode).toBe(manager.nodes[0]);
        });

        it('should throw error if not initialized', () => {
            const uninitializedManager = new A2AFlowManager();

            expect(() => uninitializedManager.addTask('Test')).toThrow('FlowManager not initialized');
        });
    });

    describe('loadContext()', () => {
        beforeEach(async () => {
            global.Vue = mockVue;
            global.VueFlow = mockVueFlow;
            await manager.init();
        });

        it('should load context from simulation response', () => {
            const response = {
                outcome: 'action_proposal',
                context: { execution: { action: 'Test' } }
            };

            manager.loadContext(response);

            expect(manager.nodes).toHaveLength(0); // Mock returns empty arrays
            expect(manager.edges).toHaveLength(0);
        });

        it('should do nothing if not initialized', () => {
            const uninitializedManager = new A2AFlowManager();
            const response = { outcome: 'test' };

            // Should not throw
            uninitializedManager.loadContext(response);
        });

        it('should handle errors gracefully', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const mockMapFunction = vi.fn(() => {
                throw new Error('Mapping failed');
            });

            // Mock the protocol function to throw
            const protocolMock = require('../web/js/flow/protocol.js');
            protocolMock.mapSimulationResponseToFlow.mockImplementationOnce(mockMapFunction);

            manager.loadContext({ outcome: 'test' });

            expect(consoleSpy).toHaveBeenCalledWith('Failed to load context:', expect.any(Error));
            consoleSpy.mockRestore();
        });
    });

    describe('updateExecutionStep()', () => {
        beforeEach(async () => {
            global.Vue = mockVue;
            global.VueFlow = mockVueFlow;
            await manager.init();
        });

        it('should update execution step status', () => {
            // Add a node with step data
            manager.nodes = [{
                id: 'step1',
                type: 'subAction',
                data: { stepIndex: 1, status: 'pending' }
            }];

            manager.updateExecutionStep({ step: 1, action: 'test' });

            expect(manager.nodes[0].data.status).toBe('running');
        });

        it('should do nothing if not initialized', () => {
            const uninitializedManager = new A2AFlowManager();

            // Should not throw
            uninitializedManager.updateExecutionStep({ step: 1 });
        });
    });

    describe('updateExecutionProgress()', () => {
        beforeEach(async () => {
            global.Vue = mockVue;
            global.VueFlow = mockVueFlow;
            await manager.init();
        });

        it('should update execution progress', () => {
            // Add a node with step data
            manager.nodes = [{
                id: 'step1',
                type: 'subAction',
                data: { stepIndex: 1, progress: 0 }
            }];

            manager.updateExecutionProgress({ step: 1, progress: 75 });

            expect(manager.nodes[0].data.progress).toBe(75);
        });

        it('should do nothing if not initialized', () => {
            const uninitializedManager = new A2AFlowManager();

            // Should not throw
            uninitializedManager.updateExecutionProgress({ step: 1, progress: 50 });
        });
    });

    describe('clear()', () => {
        beforeEach(async () => {
            global.Vue = mockVue;
            global.VueFlow = mockVueFlow;
            await manager.init();
        });

        it('should clear all nodes and edges', () => {
            manager.nodes = [{ id: 'test' }];
            manager.edges = [{ id: 'edge1' }];

            manager.clear();

            expect(manager.nodes).toHaveLength(0);
            expect(manager.edges).toHaveLength(0);
        });
    });

    describe('zoom controls', () => {
        beforeEach(async () => {
            global.Vue = mockVue;
            global.VueFlow = mockVueFlow;
            await manager.init();
        });

        it('should call zoomIn on VueFlow instance', () => {
            manager.zoomIn();

            // Verify the zoom method was called through the mock chain
            expect(mockContainer.querySelector).toHaveBeenCalledWith('.vue-flow__viewport');
        });

        it('should call zoomOut on VueFlow instance', () => {
            manager.zoomOut();

            expect(mockContainer.querySelector).toHaveBeenCalledWith('.vue-flow__viewport');
        });

        it('should call fitView on VueFlow instance', () => {
            manager.fitView();

            expect(mockContainer.querySelector).toHaveBeenCalledWith('.vue-flow__viewport');
        });
    });

    describe('event listeners', () => {
        beforeEach(async () => {
            global.Vue = mockVue;
            global.VueFlow = mockVueFlow;
            await manager.init();
        });

        it('should set up Sessions event listeners', () => {
            const mockSessions = {
                on: vi.fn(),
                off: vi.fn()
            };
            global.window.Sessions = mockSessions;

            // Re-initialize to trigger setup
            manager.setupEventListeners();

            expect(mockSessions.on).toHaveBeenCalledWith('responseReceived', expect.any(Function));
            expect(mockSessions.on).toHaveBeenCalledWith('executionStep', expect.any(Function));
            expect(mockSessions.on).toHaveBeenCalledWith('executionProgress', expect.any(Function));
        });

        it('should clean up event listeners on destroy', () => {
            const mockTarget = {
                on: vi.fn(),
                off: vi.fn()
            };
            manager.addEventListener(mockTarget, 'test', () => {});

            manager.destroy();

            expect(mockTarget.off).toHaveBeenCalled();
        });
    });

    describe('getState()', () => {
        beforeEach(async () => {
            global.Vue = mockVue;
            global.VueFlow = mockVueFlow;
            await manager.init();
        });

        it('should return current state', () => {
            manager.nodes = [{ id: 'test' }];
            manager.edges = [{ id: 'edge1' }];

            const state = manager.getState();

            expect(state.isInitialized).toBe(true);
            expect(state.nodeCount).toBe(1);
            expect(state.edgeCount).toBe(1);
            expect(state.nodes).toEqual([{ id: 'test' }]);
            expect(state.edges).toEqual([{ id: 'edge1' }]);
        });
    });

    describe('destroy()', () => {
        beforeEach(async () => {
            global.Vue = mockVue;
            global.VueFlow = mockVueFlow;
            await manager.init();
        });

        it('should destroy VueFlow instance and clean up', () => {
            manager.destroy();

            expect(manager.isInitialized).toBe(false);
            expect(manager.vueFlow).toBeNull();
            expect(manager.nodes).toHaveLength(0);
            expect(manager.edges).toHaveLength(0);
        });
    });

    describe('global functions', () => {
        it('should expose global initFlow function', () => {
            expect(typeof global.window.initFlow).toBe('function');
        });

        it('should expose global loadContext function', () => {
            expect(typeof global.window.loadContext).toBe('function');
        });
    });
});