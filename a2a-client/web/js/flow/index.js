/**
 * VueFlow integration for A2A Protocol visualization
 * 
 * This module initializes VueFlow and provides integration with the UI
 */

import { VueFlow, useVueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { MiniMap } from '@vue-flow/minimap';
import { 
  mapContextToFlow, 
  mapSimulationResponseToFlow,
  createTaskRequestNode, 
  addNodeToFlow, 
  updateNodeInFlow, 
  clearFlow, 
  NODE_COLORS,
  A2AClient,
  getA2AClient,
  setA2AClient,
  responseToFlow,
  createTaskContextBlock,
  createProposalContextBlock,
  createResultContextBlock,
  createCompleteContextBlock,
  addEdgeToFlow,
  getLastTaskNode,
  getLastProposalNode
} from './protocol.js';
import { 
  registerCustomNodes,
  TaskInputNode,
  ActionProposalNode,
  SubActionNode,
  ResultNode,
  ActionCompleteNode
} from './nodes.js';


/**
 * A2A Flow Manager class
 * Manages VueFlow instance and protocol visualization
 */
class A2AFlowManager {
  constructor(containerId = 'vueflow-graph') {
    this.containerId = containerId;
    this.vueflow = null;
    this.currentFlow = { nodes: [], edges: [] };
    this.isInitialized = false;
    this.a2aClient = null;
    this.sessionId = null;
    this.promiseId = null;
    this.pollingInterval = null;
    this.onTaskResponse = null;
    this.onProposalReceived = null;
    this.onActionApproved = null;
    this.onResultReceived = null;
    this.onComplete = null;
    this.onError = null;
  }

  /**
   * Configure A2A client for server communication
   * 
   * @param {Object} config - Client configuration
   */
  configureClient(config) {
    this.a2aClient = new A2AClient(config);
    setA2AClient(this.a2aClient);
  }

  /**
   * Set callback for task response
   * 
   * @param {Function} callback - Callback function
   */
  onTaskResponse(callback) {
    this.onTaskResponse = callback;
  }

  /**
   * Set callback for action proposal received
   * 
   * @param {Function} callback - Callback function
   */
  onProposal(callback) {
    this.onProposalReceived = callback;
  }

  /**
   * Set callback for action approved
   * 
   * @param {Function} callback - Callback function
   */
  onActionApproved(callback) {
    this.onActionApproved = callback;
  }

  /**
   * Set callback for result received
   * 
   * @param {Function} callback - Callback function
   */
  onResult(callback) {
    this.onResultReceived = callback;
  }

  /**
   * Set callback for completion
   * 
   * @param {Function} callback - Callback function
   */
  onComplete(callback) {
    this.onComplete = callback;
  }

  /**
   * Set callback for errors
   * 
   * @param {Function} callback - Callback function
   */
  onError(callback) {
    this.onError = callback;
  }

  /**
   * Send a task request to the server
   * Creates Input node and initiates server communication
   * 
   * @param {string} taskText - Task description
   * @param {Object} options - Optional parameters (projectPath, codeBlocks)
   */
  async sendTask(taskText, options = {}) {
    if (!this.a2aClient) {
      console.error('A2A client not configured. Call configureClient() first.');
      if (this.onError) this.onError(new Error('A2A client not configured'));
      return;
    }

    // Create and add task request node
    const contextBlock = createTaskContextBlock(taskText);
    this.currentFlow = addNodeToFlow(this.currentFlow, {
      id: contextBlock.id,
      type: 'task_request',
      ...contextBlock
    });
    this.render();

    // Notify callback
    if (this.onTaskResponse) {
      this.onTaskResponse(contextBlock);
    }

    try {
      // Send task to server
      const result = await this.a2aClient.sendTask(
        options.projectPath || '',
        taskText,
        options.codeBlocks || []
      );

      this.promiseId = result.promiseId;
      this.sessionId = result.sessionId;

      // Start polling for response
      this.startPolling();

      return result;
    } catch (error) {
      console.error('Failed to send task:', error);
      
      // Update node with error
      this.updateNode(contextBlock.id, {
        error: error.message,
        status: 'error'
      });
      
      if (this.onError) this.onError(error);
      throw error;
    }
  }

  /**
   * Start polling for server response
   */
  startPolling() {
    if (!this.promiseId || !this.a2aClient) return;

    const poll = async () => {
      try {
        const status = await this.a2aClient.getRequestStatus(this.promiseId);
        
        if (status.status === 'completed') {
          const result = await this.a2aClient.getRequestResult(this.promiseId);
          this.handleServerResponse(result);
          this.stopPolling();
        } else if (status.status === 'failed' || status.status === 'cancelled') {
          const error = new Error(status.error?.message || 'Request failed');
          if (this.onError) this.onError(error);
          this.stopPolling();
        }
        // Otherwise still processing - continue polling
      } catch (error) {
        console.error('Polling error:', error);
        if (this.onError) this.onError(error);
        this.stopPolling();
      }
    };

    // Poll every 5 seconds
    this.pollingInterval = setInterval(poll, 5000);
    
    // Also do an immediate check
    poll();
  }

  /**
   * Stop polling for server response
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Handle server response and create appropriate nodes
   * 
   * @param {Object} response - Server response
   */
  handleServerResponse(response) {
    // Try simulation response format first
    let responseFlow;
    if (response && response.outcome) {
      responseFlow = mapSimulationResponseToFlow(response);
    } else {
      responseFlow = responseToFlow(response);
    }
    
    if (responseFlow.nodes.length > 0) {
      // Add all nodes from response
      responseFlow.nodes.forEach(node => {
        const existingNode = this.currentFlow.nodes.find(n => n.id === node.id);
        if (!existingNode) {
          this.currentFlow = addNodeToFlow(this.currentFlow, {
            id: node.id,
            type: node.type,
            ...node.data
          });
        }
      });

      // Add edges from response
      responseFlow.edges.forEach(edge => {
        const exists = this.currentFlow.edges.some(
          e => e.source === edge.source && e.target === edge.target
        );
        if (!exists) {
          this.currentFlow.edges.push(edge);
        }
      });

      // Notify appropriate callbacks based on response type
      const proposalNodes = responseFlow.nodes.filter(
        n => n.data?.messageType === 'action_proposal'
      );
      if (proposalNodes.length > 0 && this.onProposalReceived) {
        this.onProposalReceived(proposalNodes[proposalNodes.length - 1]);
      }

      const resultNodes = responseFlow.nodes.filter(
        n => n.data?.messageType === 'step_result'
      );
      if (resultNodes.length > 0 && this.onResultReceived) {
        this.onResultReceived(resultNodes[resultNodes.length - 1]);
      }

      const completeNodes = responseFlow.nodes.filter(
        n => n.data?.messageType === 'action_complete'
      );
      if (completeNodes.length > 0 && this.onComplete) {
        this.onComplete(completeNodes[completeNodes.length - 1]);
      }
    }

    this.render();
  }

  /**
   * Approve an action proposal
   * Creates edge between task node and proposal node
   * 
   * @param {string} proposalId - ID of proposal to approve
   */
  async approveAction(proposalId) {
    if (!this.a2aClient || !this.sessionId) {
      console.error('A2A client not configured or no active session');
      if (this.onError) this.onError(new Error('No active session'));
      return;
    }

    // Find the proposal node
    const proposalNode = this.currentFlow.nodes.find(
      n => n.id === proposalId || n.data?.messageType === 'action_proposal'
    );
    
    // Find the task node
    const taskNode = getLastTaskNode(this.currentFlow);
    
    // Add edge between task and proposal
    if (taskNode && proposalNode) {
      this.currentFlow = addEdgeToFlow(
        this.currentFlow,
        taskNode.id,
        proposalNode.id
      );
      this.render();
    }

    try {
      // Send approval to server
      const result = await this.a2aClient.approveAction(this.sessionId, true);
      
      if (this.onActionApproved) {
        this.onActionApproved(proposalNode);
      }

      // Continue polling for results
      this.startPolling();

      return result;
    } catch (error) {
      console.error('Failed to approve action:', error);
      if (this.onError) this.onError(error);
      throw error;
    }
  }

  /**
   * Send step result to server
   * 
   * @param {Object} stepResult - Step result data
   */
  async sendStepResult(stepResult) {
    if (!this.a2aClient || !this.sessionId) {
      console.error('A2A client not configured or no active session');
      if (this.onError) this.onError(new Error('No active session'));
      return;
    }

    // Add result node to flow
    const resultBlock = createResultContextBlock(stepResult);
    this.currentFlow = addNodeToFlow(this.currentFlow, {
      id: resultBlock.id,
      type: 'step_result',
      ...resultBlock
    });
    this.render();

    try {
      const result = await this.a2aClient.sendStepResult(this.sessionId, stepResult);
      
      if (this.onResultReceived) {
        this.onResultReceived(resultBlock);
      }

      // Continue polling
      this.startPolling();

      return result;
    } catch (error) {
      console.error('Failed to send step result:', error);
      if (this.onError) this.onError(error);
      throw error;
    }
  }

  /**
   * Cancel current request
   */
  async cancelRequest() {
    if (!this.a2aClient || !this.promiseId) return;

    this.stopPolling();
    
    try {
      await this.a2aClient.cancelRequest(this.promiseId);
    } catch (error) {
      console.error('Failed to cancel request:', error);
    }

    this.promiseId = null;
    this.sessionId = null;
  }

  /**
   * Initialize VueFlow instance
   */
  init() {
    if (this.isInitialized) return;

    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error('VueFlow container not found:', this.containerId);
      return;
    }

    // Get custom node types
    const customNodes = registerCustomNodes();

    // Create VueFlow instance with custom node types
    this.vueflow = new VueFlow({
      nodes: [],
      edges: [],
      nodeTypes: customNodes,  // Register custom nodes
      fitViewOnInit: true,
      defaultEdgeOptions: {
        type: 'smoothstep',
        style: {
          stroke: '#64748b',
          strokeWidth: 2
        },
        markerEnd: {
          type: 'arrowclosed',
          color: '#64748b'
        }
      },
      connectionLineStyle: {
        stroke: '#3b82f6',
        strokeWidth: 2
      }
    });

    // Mount to container
    this.vueflow.mount(container);

    // Add plugins
    const flow = this.vueflow;
    
    // Add background
    const background = new Background({
      variant: 'dots',
      gap: 20,
      size: 1,
      color: '#334155'
    });
    flow.addComponent(background);

    // Add controls
    const controls = new Controls();
    flow.addComponent(controls);

    // Add minimap
    const minimap = new MiniMap({
      nodeColor: (node) => node.data?.color || NODE_COLORS.DEFAULT,
      maskColor: 'rgba(71, 85, 105, 0.8)'
    });
    flow.addComponent(minimap);

    // Set up event handlers
    this.setupEventHandlers();

    this.isInitialized = true;
    console.log('VueFlow initialized successfully');
  }

  /**
   * Set up VueFlow event handlers
   */
  setupEventHandlers() {
    if (!this.vueflow) return;

    const { onNodeClick, onEdgeClick, onConnect, onPaneReady } = useVueFlow();

    onPaneReady(({ fitView }) => {
      console.log('VueFlow pane ready');
      fitView();
    });

    onNodeClick((event) => {
      console.log('Node clicked:', event.node);
      // Could show node details in sidebar
    });

    onEdgeClick((event) => {
      console.log('Edge clicked:', event.edge);
    });

    onConnect((connection) => {
      console.log('Connection created:', connection);
    });
  }

  /**
   * Load context and render flow
   * @param {Object} context - Response context or array of context blocks
   */
  loadContext(context) {
    if (!this.isInitialized) {
      this.init();
    }

    // Handle simulation response format
    if (context && context.outcome) {
      this.currentFlow = mapSimulationResponseToFlow(context);
    } else {
      this.currentFlow = mapContextToFlow(context);
    }
    this.render();
  }

  /**
   * Load simulation data directly (for testing with simulations/pilot/)
   * @param {Object} simulationResponse - Response from simulation
   */
  loadSimulationResponse(simulationResponse) {
    if (!this.isInitialized) {
      this.init();
    }
    
    this.currentFlow = mapSimulationResponseToFlow(simulationResponse);
    this.render();
  }

  /**
   * Add a new task request node
   */
  addTask(taskText) {
    if (!this.isInitialized) {
      this.init();
    }

    const newNode = createTaskRequestNode(taskText);
    this.currentFlow = addNodeToFlow(this.currentFlow, {
      id: newNode.id,
      type: 'task_request',
      task: taskText,
      timestamp: new Date().toISOString()
    });
    this.render();
  }

  /**
   * Add a new context block to the flow
   */
  addContextBlock(contextBlock) {
    if (!this.isInitialized) {
      this.init();
    }

    this.currentFlow = addNodeToFlow(this.currentFlow, contextBlock);
    this.render();
  }

  /**
   * Update an existing node
   */
  updateNode(nodeId, updates) {
    if (!this.isInitialized) return;

    this.currentFlow = updateNodeInFlow(this.currentFlow, nodeId, updates);
    this.render();
  }

  /**
   * Render the current flow
   */
  render() {
    if (!this.vueflow || !this.isInitialized) return;

    const { nodes, edges } = this.currentFlow;

    // Use VueFlow's setNodes and setEdges
    this.vueflow.setNodes(nodes);
    this.vueflow.setEdges(edges);

    // Fit view after rendering
    setTimeout(() => {
      this.vueflow.fitView({ padding: 0.2 });
    }, 100);
  }

  /**
   * Clear the flow
   */
  clear() {
    this.currentFlow = clearFlow();
    this.render();
  }

  /**
   * Zoom in
   */
  zoomIn() {
    if (!this.vueflow) return;
    this.vueflow.zoomIn();
  }

  /**
   * Zoom out
   */
  zoomOut() {
    if (!this.vueflow) return;
    this.vueflow.zoomOut();
  }

  /**
   * Fit view
   */
  fitView() {
    if (!this.vueflow) return;
    this.vueflow.fitView({ padding: 0.2 });
  }

  /**
   * Destroy VueFlow instance
   */
  destroy() {
    if (this.vueflow) {
      this.vueflow.unmount();
      this.vueflow = null;
      this.isInitialized = false;
    }
  }
}

// Export singleton instance
const flowManager = new A2AFlowManager();

// Export functions for global use
export function initFlow() {
  flowManager.init();
}

export function loadContext(context) {
  flowManager.loadContext(context);
}

export function loadSimulationResponse(response) {
  flowManager.loadSimulationResponse(response);
}

export function addTask(taskText) {
  flowManager.addTask(taskText);
}

export function addContextBlock(contextBlock) {
  flowManager.addContextBlock(contextBlock);
}

export function updateNode(nodeId, updates) {
  flowManager.updateNode(nodeId, updates);
}

export function clearFlowView() {
  flowManager.clear();
}

export function zoomIn() {
  flowManager.zoomIn();
}

export function zoomOut() {
  flowManager.zoomOut();
}

export function fitView() {
  flowManager.fitView();
}

export function configureClient(config) {
  flowManager.configureClient(config);
}

export async function sendTask(taskText, options) {
  return flowManager.sendTask(taskText, options);
}

export async function approveAction(proposalId) {
  return flowManager.approveAction(proposalId);
}

export async function sendStepResult(stepResult) {
  return flowManager.sendStepResult(stepResult);
}

export async function cancelRequest() {
  return flowManager.cancelRequest();
}

export function onTaskResponse(callback) {
  flowManager.onTaskResponse(callback);
}

export function onProposal(callback) {
  flowManager.onProposal(callback);
}

export function onActionApproved(callback) {
  flowManager.onActionApproved(callback);
}

export function onResult(callback) {
  flowManager.onResult(callback);
}

export function onComplete(callback) {
  flowManager.onComplete(callback);
}

export function onError(callback) {
  flowManager.onError(callback);
}

export { flowManager, A2AFlowManager, A2AClient };
