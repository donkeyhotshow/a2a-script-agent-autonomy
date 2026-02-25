/**
 * VueFlow Flow Manager Unit Tests
 * Tests for A2AFlowManager class
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  A2AFlowManager,
  initFlow,
  loadContext,
  addTask,
  addContextBlock,
  updateNode,
  clearFlowView,
  zoomIn,
  zoomOut,
  fitView,
  configureClient,
  sendTask,
  approveAction,
  sendStepResult,
  cancelRequest,
  onTaskResponse,
  onProposal,
  onActionApproved,
  onResult,
  onComplete,
  onError
} from '../web/js/flow/index.js';

// Mock VueFlow imports
vi.mock('@vue-flow/core', () => ({
  VueFlow: vi.fn(),
  useVueFlow: vi.fn(() => ({
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    fitView: vi.fn(),
    setNodes: vi.fn(),
    setEdges: vi.fn(),
    addNodes: vi.fn(),
    removeNodes: vi.fn(),
    addEdges: vi.fn(),
    removeEdges: vi.fn(),
    getNodes: vi.fn(() => []),
    getEdges: vi.fn(() => []),
  })),
}));

vi.mock('@vue-flow/background', () => ({
  Background: vi.fn(),
}));

vi.mock('@vue-flow/controls', () => ({
  Controls: vi.fn(),
}));

vi.mock('@vue-flow/minimap', () => ({
  MiniMap: vi.fn(),
}));

// Mock protocol functions
vi.mock('../web/js/flow/protocol.js', () => ({
  mapContextToFlow: vi.fn(),
  mapSimulationResponseToFlow: vi.fn(),
  createTaskRequestNode: vi.fn(),
  addNodeToFlow: vi.fn(),
  updateNodeInFlow: vi.fn(),
  clearFlow: vi.fn(),
  addEdgeToFlow: vi.fn(),
  getLastTaskNode: vi.fn(),
  getLastProposalNode: vi.fn(),
  A2AClient: vi.fn(),
  getA2AClient: vi.fn(),
  setA2AClient: vi.fn(),
  responseToFlow: vi.fn(),
  createTaskContextBlock: vi.fn(),
  createProposalContextBlock: vi.fn(),
  createResultContextBlock: vi.fn(),
  createCompleteContextBlock: vi.fn(),
}));

// Mock VueFlow globally
global.VueFlow = vi.fn();

describe('A2AFlowManager', () => {
  let manager;
  let mockVueFlow;

  beforeEach(() => {
    // Mock VueFlow constructor
    mockVueFlow = {
      mount: vi.fn(),
      unmount: vi.fn(),
      setNodes: vi.fn(),
      setEdges: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      fitView: vi.fn(),
      addComponent: vi.fn()
    };
    vi.mocked(VueFlow).mockReturnValue(mockVueFlow);
    
    manager = new A2AFlowManager('test-container');
  });

  describe('constructor', () => {
    it('should create instance with default container', () => {
      const defaultManager = new A2AFlowManager();
      expect(defaultManager.containerId).toBe('vueflow-graph');
      expect(defaultManager.isInitialized).toBe(false);
      expect(defaultManager.currentFlow).toEqual({ nodes: [], edges: [] });
    });

    it('should create instance with custom container', () => {
      expect(manager.containerId).toBe('test-container');
    });

    it('should initialize with empty flow', () => {
      expect(manager.currentFlow).toEqual({ nodes: [], edges: [] });
      expect(manager.isInitialized).toBe(false);
    });
  });

  describe('configureClient()', () => {
    it('should configure A2A client', () => {
      const config = {
        serverUrl: 'http://test/api/v1',
        token: 'test-token',
        clientId: 'test-client'
      };

      manager.configureClient(config);

      expect(manager.a2aClient).toBeDefined();
      expect(manager.a2aClient.serverUrl).toBe('http://test/api/v1');
      expect(manager.a2aClient.token).toBe('test-token');
      expect(manager.a2aClient.clientId).toBe('test-client');
    });
  });

  describe('init()', () => {
    it('should initialize VueFlow instance', () => {
      document.getElementById = vi.fn().mockReturnValue(document.createElement('div'));
      
      manager.init();

      expect(VueFlow).toHaveBeenCalledWith({
        nodes: [],
        edges: [],
        nodeTypes: expect.any(Object),
        fitViewOnInit: true,
        defaultEdgeOptions: expect.any(Object),
        connectionLineStyle: expect.any(Object)
      });
      expect(mockVueFlow.mount).toHaveBeenCalled();
      expect(manager.isInitialized).toBe(true);
    });

    it('should register custom nodes', () => {
      document.getElementById = vi.fn().mockReturnValue(document.createElement('div'));
      
      manager.init();

      const vueflowCall = vi.mocked(VueFlow).mock.calls[0][0];
      expect(vueflowCall.nodeTypes).toBeDefined();
      expect(typeof vueflowCall.nodeTypes).toBe('object');
    });

    it('should set isInitialized flag', () => {
      document.getElementById = vi.fn().mockReturnValue(document.createElement('div'));
      
      manager.init();

      expect(manager.isInitialized).toBe(true);
    });

    it('should not reinitialize if already initialized', () => {
      document.getElementById = vi.fn().mockReturnValue(document.createElement('div'));
      
      manager.init();
      const callCount = vi.mocked(VueFlow).mock.calls.length;
      manager.init();

      expect(vi.mocked(VueFlow).mock.calls.length).toBe(callCount);
    });

    it('should handle missing container', () => {
      document.getElementById = vi.fn().mockReturnValue(null);
      
      expect(() => manager.init()).not.toThrow();
      expect(manager.isInitialized).toBe(false);
    });
  });

  describe('loadContext()', () => {
    it('should load context blocks into flow', () => {
      const context = [
        { type: 'task_request', task: 'Test task' },
        { type: 'action_proposal', actionName: 'Test action' }
      ];

      vi.mocked(mapContextToFlow).mockReturnValue({
        nodes: [{ id: 'node1' }, { id: 'node2' }],
        edges: [{ id: 'edge1' }]
      });

      manager.loadContext(context);

      expect(mapContextToFlow).toHaveBeenCalledWith(context);
      expect(manager.currentFlow).toEqual({
        nodes: [{ id: 'node1' }, { id: 'node2' }],
        edges: [{ id: 'edge1' }]
      });
    });

    it('should handle multiple context blocks', () => {
      const context = [
        { type: 'task_request', task: 'Task 1' },
        { type: 'task_request', task: 'Task 2' },
        { type: 'action_proposal', actionName: 'Action 1' }
      ];

      vi.mocked(mapContextToFlow).mockReturnValue({
        nodes: [{ id: 'node1' }, { id: 'node2' }, { id: 'node3' }],
        edges: [{ id: 'edge1' }, { id: 'edge2' }]
      });

      manager.loadContext(context);

      expect(mapContextToFlow).toHaveBeenCalledWith(context);
      expect(manager.currentFlow.nodes).toHaveLength(3);
      expect(manager.currentFlow.edges).toHaveLength(2);
    });

    it('should initialize VueFlow if not initialized', () => {
      document.getElementById = vi.fn().mockReturnValue(document.createElement('div'));
      vi.mocked(mapContextToFlow).mockReturnValue({ nodes: [], edges: [] });

      manager.loadContext([]);

      expect(VueFlow).toHaveBeenCalled();
      expect(manager.isInitialized).toBe(true);
    });
  });

  describe('addTask()', () => {
    it('should add task input node', () => {
      vi.mocked(createTaskRequestNode).mockReturnValue({
        id: 'task-node',
        type: 'taskInput',
        data: { task: 'Test task' }
      });

      vi.mocked(addNodeToFlow).mockReturnValue({
        nodes: [{ id: 'task-node' }],
        edges: []
      });

      manager.addTask('Test task');

      expect(createTaskRequestNode).toHaveBeenCalledWith('Test task');
      expect(addNodeToFlow).toHaveBeenCalled();
      expect(manager.currentFlow.nodes).toHaveLength(1);
      expect(manager.currentFlow.nodes[0].type).toBe('taskInput');
    });

    it('should position node at top', () => {
      vi.mocked(createTaskRequestNode).mockReturnValue({
        id: 'task-node',
        type: 'taskInput',
        position: { x: 100, y: 50 }
      });

      vi.mocked(addNodeToFlow).mockReturnValue({
        nodes: [{ id: 'task-node', position: { x: 100, y: 50 } }],
        edges: []
      });

      manager.addTask('Test task');

      const taskNode = manager.currentFlow.nodes[0];
      expect(taskNode.position.x).toBe(100);
      expect(taskNode.position.y).toBe(50);
    });

    it('should initialize VueFlow if not initialized', () => {
      document.getElementById = vi.fn().mockReturnValue(document.createElement('div'));
      vi.mocked(createTaskRequestNode).mockReturnValue({ id: 'task-node' });
      vi.mocked(addNodeToFlow).mockReturnValue({ nodes: [], edges: [] });

      manager.addTask('Test task');

      expect(VueFlow).toHaveBeenCalled();
    });
  });

  describe('addContextBlock()', () => {
    it('should add context block node', () => {
      const contextBlock = {
        id: 'block1',
        type: 'action_proposal',
        actionName: 'Test action'
      };

      vi.mocked(addNodeToFlow).mockReturnValue({
        nodes: [{ id: 'block1' }],
        edges: []
      });

      manager.addContextBlock(contextBlock);

      expect(addNodeToFlow).toHaveBeenCalledWith(
        manager.currentFlow,
        contextBlock
      );
      expect(manager.currentFlow.nodes).toHaveLength(1);
    });
  });

  describe('updateNode()', () => {
    it('should update node data', () => {
      manager.currentFlow = {
        nodes: [{ id: 'node1', data: { task: 'Old task' } }],
        edges: []
      };

      vi.mocked(updateNodeInFlow).mockReturnValue({
        nodes: [{ id: 'node1', data: { task: 'New task' } }],
        edges: []
      });

      manager.updateNode('node1', { task: 'New task' });

      expect(updateNodeInFlow).toHaveBeenCalledWith(
        manager.currentFlow,
        'node1',
        { task: 'New task' }
      );
      expect(manager.currentFlow.nodes[0].data.task).toBe('New task');
    });
  });

  describe('render()', () => {
    it('should render nodes and edges', () => {
      manager.vueflow = mockVueFlow;
      manager.isInitialized = true;
      manager.currentFlow = {
        nodes: [{ id: 'node1' }],
        edges: [{ id: 'edge1' }]
      };

      manager.render();

      expect(mockVueFlow.setNodes).toHaveBeenCalledWith([{ id: 'node1' }]);
      expect(mockVueFlow.setEdges).toHaveBeenCalledWith([{ id: 'edge1' }]);
    });

    it('should not render if not initialized', () => {
      manager.render();

      expect(mockVueFlow.setNodes).not.toHaveBeenCalled();
      expect(mockVueFlow.setEdges).not.toHaveBeenCalled();
    });
  });

  describe('clear()', () => {
    it('should clear all nodes and edges', () => {
      vi.mocked(clearFlow).mockReturnValue({ nodes: [], edges: [] });

      manager.clear();

      expect(clearFlow).toHaveBeenCalled();
      expect(manager.currentFlow).toEqual({ nodes: [], edges: [] });
    });
  });

  describe('zoomIn()', () => {
    it('should zoom in', () => {
      manager.vueflow = mockVueFlow;
      manager.isInitialized = true;

      manager.zoomIn();

      expect(mockVueFlow.zoomIn).toHaveBeenCalled();
    });

    it('should not zoom if not initialized', () => {
      manager.zoomIn();

      expect(mockVueFlow.zoomIn).not.toHaveBeenCalled();
    });
  });

  describe('zoomOut()', () => {
    it('should zoom out', () => {
      manager.vueflow = mockVueFlow;
      manager.isInitialized = true;

      manager.zoomOut();

      expect(mockVueFlow.zoomOut).toHaveBeenCalled();
    });
  });

  describe('fitView()', () => {
    it('should fit view with padding', () => {
      manager.vueflow = mockVueFlow;
      manager.isInitialized = true;

      manager.fitView();

      expect(mockVueFlow.fitView).toHaveBeenCalledWith({ padding: 0.2 });
    });
  });

  describe('destroy()', () => {
    it('should unmount VueFlow', () => {
      manager.vueflow = mockVueFlow;
      manager.isInitialized = true;

      manager.destroy();

      expect(mockVueFlow.unmount).toHaveBeenCalled();
      expect(manager.isInitialized).toBe(false);
    });

    it('should reset isInitialized', () => {
      manager.vueflow = mockVueFlow;
      manager.isInitialized = true;

      manager.destroy();

      expect(manager.isInitialized).toBe(false);
    });
  });

  describe('Callbacks', () => {
    it('should set task response callback', () => {
      const callback = vi.fn();
      manager.onTaskResponse(callback);
      expect(manager.onTaskResponse).toBe(callback);
    });

    it('should set proposal callback', () => {
      const callback = vi.fn();
      manager.onProposal(callback);
      expect(manager.onProposalReceived).toBe(callback);
    });

    it('should set action approved callback', () => {
      const callback = vi.fn();
      manager.onActionApproved(callback);
      expect(manager.onActionApproved).toBe(callback);
    });

    it('should set result callback', () => {
      const callback = vi.fn();
      manager.onResult(callback);
      expect(manager.onResultReceived).toBe(callback);
    });

    it('should set complete callback', () => {
      const callback = vi.fn();
      manager.onComplete(callback);
      expect(manager.onComplete).toBe(callback);
    });

    it('should set error callback', () => {
      const callback = vi.fn();
      manager.onError(callback);
      expect(manager.onError).toBe(callback);
    });
  });
});

describe('Exported Functions', () => {
  let mockManager;

  beforeEach(() => {
    mockManager = {
      init: vi.fn(),
      loadContext: vi.fn(),
      addTask: vi.fn(),
      addContextBlock: vi.fn(),
      updateNode: vi.fn(),
      clear: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      fitView: vi.fn(),
      configureClient: vi.fn(),
      sendTask: vi.fn(),
      approveAction: vi.fn(),
      sendStepResult: vi.fn(),
      cancelRequest: vi.fn(),
      onTaskResponse: vi.fn(),
      onProposal: vi.fn(),
      onActionApproved: vi.fn(),
      onResult: vi.fn(),
      onComplete: vi.fn(),
      onError: vi.fn()
    };

    vi.mock('../web/js/flow/flow-manager.js', () => ({
      flowManager: mockManager,
      initFlow: () => mockManager.init(),
      loadContext: (context) => mockManager.loadContext(context),
      addTask: (taskText) => mockManager.addTask(taskText),
      addContextBlock: (contextBlock) => mockManager.addContextBlock(contextBlock),
      updateNode: (nodeId, updates) => mockManager.updateNode(nodeId, updates),
      clearFlowView: () => mockManager.clear(),
      zoomIn: () => mockManager.zoomIn(),
      zoomOut: () => mockManager.zoomOut(),
      fitView: () => mockManager.fitView(),
      configureClient: (config) => mockManager.configureClient(config),
      sendTask: (taskText, options) => mockManager.sendTask(taskText, options),
      approveAction: (proposalId) => mockManager.approveAction(proposalId),
      sendStepResult: (stepResult) => mockManager.sendStepResult(stepResult),
      cancelRequest: () => mockManager.cancelRequest(),
      onTaskResponse: (callback) => mockManager.onTaskResponse(callback),
      onProposal: (callback) => mockManager.onProposal(callback),
      onActionApproved: (callback) => mockManager.onActionApproved(callback),
      onResult: (callback) => mockManager.onResult(callback),
      onComplete: (callback) => mockManager.onComplete(callback),
      onError: (callback) => mockManager.onError(callback)
    }));
  });

  describe('initFlow', () => {
    it('should initialize flow manager', () => {
      initFlow();
      expect(mockManager.init).toHaveBeenCalled();
    });
  });

  describe('loadContext', () => {
    it('should load context via flow manager', () => {
      const context = [{ type: 'task_request', task: 'Test' }];
      loadContext(context);
      expect(mockManager.loadContext).toHaveBeenCalledWith(context);
    });
  });

  describe('addTask', () => {
    it('should add task via flow manager', () => {
      addTask('Test task');
      expect(mockManager.addTask).toHaveBeenCalledWith('Test task');
    });
  });

  describe('clearFlowView', () => {
    it('should clear flow via flow manager', () => {
      clearFlowView();
      expect(mockManager.clear).toHaveBeenCalled();
    });
  });

  describe('zoomIn, zoomOut, fitView', () => {
    it('should call flow manager zoom methods', () => {
      zoomIn();
      zoomOut();
      fitView();

      expect(mockManager.zoomIn).toHaveBeenCalled();
      expect(mockManager.zoomOut).toHaveBeenCalled();
      expect(mockManager.fitView).toHaveBeenCalled();
    });
  });

  describe('configureClient', () => {
    it('should configure client via flow manager', () => {
      const config = { serverUrl: 'http://test/api/v1' };
      configureClient(config);
      expect(mockManager.configureClient).toHaveBeenCalledWith(config);
    });
  });

  describe('sendTask', () => {
    it('should send task via flow manager', () => {
      const result = sendTask('Test task', { projectPath: '/test' });
      expect(mockManager.sendTask).toHaveBeenCalledWith('Test task', { projectPath: '/test' });
    });
  });

  describe('approveAction', () => {
    it('should approve action via flow manager', () => {
      approveAction('proposal-1');
      expect(mockManager.approveAction).toHaveBeenCalledWith('proposal-1');
    });
  });

  describe('sendStepResult', () => {
    it('should send step result via flow manager', () => {
      const result = sendStepResult({ success: true });
      expect(mockManager.sendStepResult).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('cancelRequest', () => {
    it('should cancel request via flow manager', () => {
      cancelRequest();
      expect(mockManager.cancelRequest).toHaveBeenCalled();
    });
  });

  describe('Callback setters', () => {
    it('should set task response callback', () => {
      const callback = vi.fn();
      onTaskResponse(callback);
      expect(mockManager.onTaskResponse).toHaveBeenCalledWith(callback);
    });

    it('should set proposal callback', () => {
      const callback = vi.fn();
      onProposal(callback);
      expect(mockManager.onProposal).toHaveBeenCalledWith(callback);
    });

    it('should set action approved callback', () => {
      const callback = vi.fn();
      onActionApproved(callback);
      expect(mockManager.onActionApproved).toHaveBeenCalledWith(callback);
    });

    it('should set result callback', () => {
      const callback = vi.fn();
      onResult(callback);
      expect(mockManager.onResult).toHaveBeenCalledWith(callback);
    });

    it('should set complete callback', () => {
      const callback = vi.fn();
      onComplete(callback);
      expect(mockManager.onComplete).toHaveBeenCalledWith(callback);
    });

    it('should set error callback', () => {
      const callback = vi.fn();
      onError(callback);
      expect(mockManager.onError).toHaveBeenCalledWith(callback);
    });
  });
});
