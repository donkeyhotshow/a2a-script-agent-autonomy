/**
 * VueFlow Protocol Mapping Unit Tests
 * Tests for protocol to VueFlow node mapping
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  mapSimulationResponseToFlow,
  mapContextToFlow,
  createTaskRequestNode,
  createTaskContextBlock,
  createProposalContextBlock,
  createResultContextBlock,
  createCompleteContextBlock,
  addEdgeToFlow,
  findNodesByType,
  getLastTaskNode,
  getLastProposalNode,
  A2AClient
} from '../web/js/flow/protocol.js';

describe('Protocol Mapping', () => {
  
  describe('mapSimulationResponseToFlow', () => {
    it('should map action_proposal response', () => {
      const response = {
        outcome: 'action_proposal',
        proposedActions: [
          {
            title: 'Fix imports',
            description: 'Update import statements',
            matchScore: 0.85,
            subActions: [
              { title: 'Find incorrect imports', actionId: 'step1' },
              { title: 'Update import paths', actionId: 'step2' }
            ]
          }
        ],
        context: {
          task: 'Fix import statements in project'
        }
      };

      const result = mapSimulationResponseToFlow(response);
      
      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);
      
      // Check task node
      const taskNode = result.nodes[0];
      expect(taskNode.type).toBe('taskInput');
      expect(taskNode.data.task).toBe('Fix import statements in project');
      expect(taskNode.data.messageType).toBe('task_request');
      
      // Check proposal node
      const proposalNode = result.nodes[1];
      expect(proposalNode.type).toBe('actionProposal');
      expect(proposalNode.data.actionName).toBe('Fix imports');
      expect(proposalNode.data.subActions).toHaveLength(2);
      expect(proposalNode.data.matchScore).toBe(0.85);
    });

    it('should map action_executing response', () => {
      const response = {
        outcome: 'action_executing',
        executingAction: {
          actionId: 'fix-imports',
          title: 'Update imports',
          description: 'Update import statements to use correct paths'
        },
        context: {
          execution: {
            history: [
              { actionId: 'step1', status: 'completed' },
              { actionId: 'step2', status: 'completed' }
            ],
            actionId: 'fix-imports'
          }
        },
        previousStep: { result: 'Step 2 completed' }
      };

      const result = mapSimulationResponseToFlow(response);
      
      expect(result.nodes).toHaveLength(5); // task + proposal + 2 history steps + current step
      expect(result.edges).toHaveLength(4);
      
      // Check current step node
      const currentStepNode = result.nodes[4];
      expect(currentStepNode.type).toBe('subAction');
      expect(currentStepNode.data.subActionName).toBe('Update imports');
      expect(currentStepNode.data.status).toBe('running');
      expect(currentStepNode.data.stepIndex).toBe(3);
    });

    it('should map action_complete response', () => {
      const response = {
        outcome: 'action_complete',
        finalResult: {
          actionId: 'fix-imports',
          summary: {
            totalSteps: 5,
            duration: '15s',
            filesChanged: 12
          }
        },
        context: {
          execution: {
            history: [
              { actionId: 'step1', status: 'completed' },
              { actionId: 'step2', status: 'completed' },
              { actionId: 'step3', status: 'completed' },
              { actionId: 'step4', status: 'completed' },
              { actionId: 'step5', status: 'completed' }
            ],
            actionId: 'fix-imports'
          }
        }
      };

      const result = mapSimulationResponseToFlow(response);
      
      expect(result.nodes).toHaveLength(8); // task + proposal + 5 steps + complete
      expect(result.edges).toHaveLength(7);
      
      // Check complete node
      const completeNode = result.nodes[7];
      expect(completeNode.type).toBe('actionComplete');
      expect(completeNode.data.actionName).toBe('fix-imports');
      expect(completeNode.data.summary.totalSteps).toBe(5);
    });

    it('should handle multiple sub-actions', () => {
      const response = {
        outcome: 'action_proposal',
        proposedActions: [
          {
            title: 'Complex action',
            subActions: [
              { title: 'Step 1', actionId: 's1' },
              { title: 'Step 2', actionId: 's2' },
              { title: 'Step 3', actionId: 's3' },
              { title: 'Step 4', actionId: 's4' },
              { title: 'Step 5', actionId: 's5' }
            ]
          }
        ]
      };

      const result = mapSimulationResponseToFlow(response);
      const proposalNode = result.nodes[1];
      expect(proposalNode.data.subActions).toHaveLength(5);
      expect(proposalNode.data.stepsCount).toBe(5);
    });
  });

  describe('mapContextToFlow', () => {
    it('should map context blocks array', () => {
      const context = [
        {
          type: 'task_request',
          task: 'Test task',
          timestamp: '2026-02-25T10:00:00Z'
        },
        {
          type: 'action_proposal',
          actionName: 'Test action',
          description: 'Test description'
        }
      ];

      const result = mapContextToFlow(context);
      
      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);
      expect(result.nodes[0].type).toBe('taskInput');
      expect(result.nodes[1].type).toBe('actionProposal');
    });

    it('should handle single context block', () => {
      const context = {
        type: 'task_request',
        task: 'Single task'
      };

      const result = mapContextToFlow(context);
      
      expect(result.nodes).toHaveLength(1);
      expect(result.edges).toHaveLength(0);
      expect(result.nodes[0].type).toBe('taskInput');
    });

    it('should handle empty context', () => {
      const result = mapContextToFlow(null);
      expect(result.nodes).toHaveLength(0);
      expect(result.edges).toHaveLength(0);
    });
  });

  describe('createTaskRequestNode', () => {
    it('should create task input node', () => {
      const node = createTaskRequestNode('Test task');
      
      expect(node.type).toBe('taskInput');
      expect(node.data.task).toBe('Test task');
      expect(node.data.messageType).toBe('task_request');
      expect(node.position.x).toBe(100);
      expect(node.position.y).toBe(50);
    });

    it('should set correct position', () => {
      const node = createTaskRequestNode('Test task');
      expect(node.position).toEqual({ x: 100, y: 50 });
    });
  });

  describe('createTaskContextBlock', () => {
    it('should create task context block', () => {
      const block = createTaskContextBlock('Test task');
      
      expect(block.type).toBe('task_request');
      expect(block.task).toBe('Test task');
      expect(block.id).toMatch(/^task-\d+$/);
      expect(block.timestamp).toBeDefined();
    });
  });

  describe('createProposalContextBlock', () => {
    it('should create proposal context block', () => {
      const proposal = {
        actionName: 'Test action',
        description: 'Test description',
        steps: ['Step 1', 'Step 2']
      };
      
      const block = createProposalContextBlock(proposal);
      
      expect(block.type).toBe('action_proposal');
      expect(block.actionName).toBe('Test action');
      expect(block.description).toBe('Test description');
      expect(block.steps).toEqual(['Step 1', 'Step 2']);
    });
  });

  describe('createResultContextBlock', () => {
    it('should create result context block with success', () => {
      const result = {
        success: true,
        message: 'Operation completed',
        changes: ['File updated']
      };
      
      const block = createResultContextBlock(result);
      
      expect(block.type).toBe('step_result');
      expect(block.success).toBe(true);
      expect(block.message).toBe('Operation completed');
      expect(block.changes).toEqual(['File updated']);
    });

    it('should create result context block with failure', () => {
      const result = {
        success: false,
        message: 'Operation failed',
        error: 'Syntax error'
      };
      
      const block = createResultContextBlock(result);
      
      expect(block.type).toBe('step_result');
      expect(block.success).toBe(false);
      expect(block.message).toBe('Operation failed');
      expect(block.result.error).toBe('Syntax error');
    });
  });

  describe('createCompleteContextBlock', () => {
    it('should create complete context block', () => {
      const completion = {
        actionName: 'Test action',
        summary: 'Action completed successfully',
        totalSteps: 5,
        duration: '15s'
      };
      
      const block = createCompleteContextBlock(completion);
      
      expect(block.type).toBe('action_complete');
      expect(block.actionName).toBe('Test action');
      expect(block.summary).toBe('Action completed successfully');
      expect(block.totalSteps).toBe(5);
      expect(block.duration).toBe('15s');
    });
  });

  describe('addEdgeToFlow', () => {
    it('should create edge between nodes', () => {
      const flow = {
        nodes: [
          { id: 'node1', data: { color: '#22c55e' } },
          { id: 'node2', data: { color: '#eab308' } }
        ],
        edges: []
      };

      const result = addEdgeToFlow(flow, 'node1', 'node2');
      
      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].source).toBe('node1');
      expect(result.edges[0].target).toBe('node2');
      expect(result.edges[0].style.stroke).toBe('#eab308');
    });

    it('should not create duplicate edges', () => {
      const flow = {
        nodes: [
          { id: 'node1', data: { color: '#22c55e' } },
          { id: 'node2', data: { color: '#eab308' } }
        ],
        edges: [
          { id: 'edge-node1-node2', source: 'node1', target: 'node2' }
        ]
      };

      const result = addEdgeToFlow(flow, 'node1', 'node2');
      expect(result.edges).toHaveLength(1);
    });

    it('should add animated marker for running steps', () => {
      const flow = {
        nodes: [
          { id: 'node1', data: { color: '#22c55e' } },
          { id: 'node2', data: { color: '#3b82f6', messageType: 'action_executing' } }
        ],
        edges: []
      };

      const result = addEdgeToFlow(flow, 'node1', 'node2');
      expect(result.edges[0].animated).toBe(true);
    });
  });

  describe('findNodesByType', () => {
    it('should find nodes by type', () => {
      const flow = {
        nodes: [
          { data: { messageType: 'task_request' } },
          { data: { messageType: 'action_proposal' } },
          { data: { messageType: 'task_request' } }
        ]
      };

      const taskNodes = findNodesByType(flow, 'task_request');
      expect(taskNodes).toHaveLength(2);
      expect(taskNodes[0].data.messageType).toBe('task_request');
    });

    it('should return empty array for unknown type', () => {
      const flow = {
        nodes: [
          { data: { messageType: 'task_request' } }
        ]
      };

      const unknownNodes = findNodesByType(flow, 'unknown_type');
      expect(unknownNodes).toHaveLength(0);
    });
  });

  describe('getLastTaskNode', () => {
    it('should return last task node', () => {
      const flow = {
        nodes: [
          { id: 'node1', data: { messageType: 'task_request' } },
          { id: 'node2', data: { messageType: 'action_proposal' } },
          { id: 'node3', data: { messageType: 'task_request' } }
        ]
      };

      const lastTaskNode = getLastTaskNode(flow);
      expect(lastTaskNode.id).toBe('node3');
    });

    it('should return null if no task nodes', () => {
      const flow = {
        nodes: [
          { data: { messageType: 'action_proposal' } }
        ]
      };

      const lastTaskNode = getLastTaskNode(flow);
      expect(lastTaskNode).toBeNull();
    });
  });

  describe('getLastProposalNode', () => {
    it('should return last proposal node', () => {
      const flow = {
        nodes: [
          { id: 'node1', data: { messageType: 'action_proposal' } },
          { id: 'node2', data: { messageType: 'task_request' } },
          { id: 'node3', data: { messageType: 'action_proposal' } }
        ]
      };

      const lastProposalNode = getLastProposalNode(flow);
      expect(lastProposalNode.id).toBe('node3');
    });
  });
});

describe('A2AClient', () => {
  
  describe('constructor', () => {
    it('should set default server URL', () => {
      const client = new A2AClient({});
      expect(client.serverUrl).toBe('http://localhost:3000/api/v1');
    });

    it('should accept custom server URL', () => {
      const client = new A2AClient({ serverUrl: 'http://test/api/v1/' });
      expect(client.serverUrl).toBe('http://test/api/v1');
    });

    it('should set client properties', () => {
      const client = new A2AClient({
        serverUrl: 'http://test/api/v1',
        token: 'test-token',
        clientId: 'test-client',
        timeout: 5000
      });
      
      expect(client.serverUrl).toBe('http://test/api/v1');
      expect(client.token).toBe('test-token');
      expect(client.clientId).toBe('test-client');
      expect(client.timeout).toBe(5000);
    });
  });

  describe('request method', () => {
    let client;
    let mockFetch;

    beforeEach(() => {
      client = new A2AClient({ serverUrl: 'http://test/api/v1' });
      mockFetch = vi.fn();
      global.fetch = mockFetch;
    });

    it('should make GET request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      });

      const result = await client.request('GET', '/test');
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://test/api/v1/test',
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: expect.any(AbortSignal)
        }
      );
      expect(result).toEqual({ data: 'test' });
    });

    it('should make POST request with body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      const result = await client.request('POST', '/test', { test: 'data' });
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://test/api/v1/test',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{"test":"data"}',
          signal: expect.any(AbortSignal)
        }
      );
      expect(result).toEqual({ success: true });
    });

    it('should include authorization header', async () => {
      client.token = 'test-token';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      await client.request('GET', '/test');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      );
    });

    it('should include client ID header', async () => {
      client.clientId = 'test-client';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      await client.request('GET', '/test');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Client-ID': 'test-client'
          })
        })
      );
    });

    it('should handle request timeout', async () => {
      mockFetch.mockImplementationOnce(() => new Promise((resolve, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 50);
      }));

      client.timeout = 50; // 50ms timeout

      await expect(client.request('GET', '/test')).rejects.toThrow('Request timeout');
    });

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: { message: 'Not found' } })
      });

      await expect(client.request('GET', '/test')).rejects.toThrow('Not found');
    });

    it('should handle JSON parse errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Parse error'))
      });

      await expect(client.request('GET', '/test')).rejects.toThrow('Request failed');
    });
  });

  describe('createSession', () => {
    let client;
    let mockFetch;

    beforeEach(() => {
      client = new A2AClient({ serverUrl: 'http://test/api/v1' });
      mockFetch = vi.fn();
      global.fetch = mockFetch;
    });

    it('should create session', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { sessionId: 'test-session' } })
      });

      const result = await client.createSession('test-project', 'Test session');
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://test/api/v1/sessions',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ projectId: 'test-project', title: 'Test session' })
        })
      );
      expect(result).toEqual({ sessionId: 'test-session' });
    });
  });

  describe('createRequest', () => {
    let client;
    let mockFetch;

    beforeEach(() => {
      client = new A2AClient({ serverUrl: 'http://test/api/v1' });
      mockFetch = vi.fn();
      global.fetch = mockFetch;
    });

    it('should create request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { promiseId: 'test-promise' } })
      });

      const result = await client.createRequest({ test: 'data' });
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://test/api/v1/requests',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ test: 'data' })
        })
      );
      expect(result).toEqual({ promiseId: 'test-promise' });
    });
  });

  describe('getRequestStatus', () => {
    let client;
    let mockFetch;

    beforeEach(() => {
      client = new A2AClient({ serverUrl: 'http://test/api/v1' });
      mockFetch = vi.fn();
      global.fetch = mockFetch;
    });

    it('should get request status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { status: 'completed' } })
      });

      const result = await client.getRequestStatus('test-promise');
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://test/api/v1/requests/test-promise/status',
        expect.objectContaining({
          method: 'GET'
        })
      );
      expect(result).toEqual({ status: 'completed' });
    });
  });

  describe('approveAction', () => {
    let client;
    let mockFetch;

    beforeEach(() => {
      client = new A2AClient({ serverUrl: 'http://test/api/v1' });
      mockFetch = vi.fn();
      global.fetch = mockFetch;
    });

    it('should approve action', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { approved: true } })
      });

      const result = await client.approveAction('test-session', true);
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://test/api/v1/sessions/test-session/confirm',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            context: { session_id: 'test-session', approved: true },
            confirmed: true
          })
        })
      );
      expect(result).toEqual({ approved: true });
    });
  });

  describe('sendStepResult', () => {
    let client;
    let mockFetch;

    beforeEach(() => {
      client = new A2AClient({ serverUrl: 'http://test/api/v1' });
      mockFetch = vi.fn();
      global.fetch = mockFetch;
    });

    it('should send step result', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { success: true } })
      });

      const result = await client.sendStepResult('test-session', { test: 'result' });
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://test/api/v1/sessions/test-session/continue',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            context: { session_id: 'test-session' },
            step_result: { test: 'result' }
          })
        })
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('pollForResult', () => {
    let client;
    let mockFetch;

    beforeEach(() => {
      client = new A2AClient({ serverUrl: 'http://test/api/v1' });
      mockFetch = vi.fn();
      global.fetch = mockFetch;
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should poll until completion', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { status: 'processing' } })
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { status: 'completed' } })
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { result: 'success' } })
      });

      const pollPromise = client.pollForResult('test-promise', { interval: 100, maxAttempts: 10 });
      vi.advanceTimersByTime(200);
      const result = await pollPromise;
      
      expect(result).toEqual({ result: 'success' });
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should throw error on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { status: 'failed', error: { message: 'Test error' } } })
      });

      await expect(client.pollForResult('test-promise')).rejects.toThrow('Test error');
    });

    it('should timeout after max attempts', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { status: 'processing' } })
      });

      await expect(client.pollForResult('test-promise', { maxAttempts: 2, interval: 100 })).rejects.toThrow('Polling timeout exceeded');
      vi.advanceTimersByTime(200);
    });
  });
});
