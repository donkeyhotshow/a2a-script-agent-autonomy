/**
 * VueFlow integration for A2A Protocol visualization
 * 
 * This module initializes VueFlow and provides integration with the UI
 * Uses SSE for real-time updates instead of polling
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
 * Uses SSE for real-time updates
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
    this.useSSE = true; // Use SSE by default instead of polling
    this.sseConnected = false;
    this.onTaskResponse = null;
    this.onProposalReceived = null;
    this.onActionApproved = null;
    this.onResultReceived = null;
    this.onComplete = null;
    this.onError = null;
    this.onLog = null;
    this.onProgress = null;
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
   * Set callback for log messages
   * 
   * @param {Function} callback - Callback function
   */
  onLog(callback) {
    this.onLog = callback;
  }

  /**
   * Set callback for progress updates
   * 
   * @param {Function} callback - Callback function
   */
  onProgress(callback) {
    this.onProgress = callback;
  }

  /**
   * Connect to SSE for real-time updates
   * 
   * @param {string} sessionId - Session ID to connect to
   * @param {string} apiBase - API base URL
   */
  connectSSE(sessionId, apiBase = '/api/v1') {
    if (typeof SSEClient === 'undefined') {
      console.error('[Flow] SSEClient not found. Make sure sse-client.js is loaded.');
      if (this.onError) this.onError(new Error('SSEClient not found'));
      return;
    }

    this.sessionId = sessionId;
    
    // Configure SSE client
    SSEClient.configureApi(apiBase);
    
    // Setup event handlers
    this.setupSSEHandlers();
    
    // Connect
    SSEClient.connect(sessionId, apiBase);
    this.sseConnected = true;
  }

  /**
   * Setup SSE event handlers
   */
  setupSSEHandlers() {
    // Connected
    SSEClient.on('connected', (data) => {
      console.log('[Flow] SSE Connected:', data);
      this.sessionId = data.sessionId || this.sessionId;
      this.promiseId = data.promiseId || this.promiseId;
    });

    // Disconnected
    SSEClient.on('disconnected', (data) => {
      console.log('[Flow] SSE Disconnected:', data);
      this.sseConnected = false;
    });

    // Log messages
    SSEClient.on('log', (data) => {
      console.log('[Flow] Log:', data);
      if (this.onLog) this.onLog(data);
      
      // Add log as a node if it has significant content
      if (data.message) {
        this.addLogNode(data);
      }
    });

    // Progress updates
    SSEClient.on('progress', (data) => {
      console.log('[Flow] Progress:', data);
      if (this.onProgress) this.onProgress(data);
      
      // Update progress in the flow
      if (data.nodeId) {
        this.updateNode(data.nodeId, {
          progress: data.progress,
          status: data.status
        });
      }
    });

    // Task response
    SSEClient.on('task_response', (data) => {
      console.log('[Flow] Task Response:', data);
      this.handleServerResponse(data);
      if (this.onTaskResponse) this.onTaskResponse(data);
    });

    // Action proposal
    SSEClient.on('action_proposal', (data) => {
      console.log('[Flow] Action Proposal:', data);
      this.handleActionProposal(data);
      if (this.onProposalReceived) this.onProposalReceived(data);
    });

    // Action executing
    SSEClient.on('action_executing', (data) => {
      console.log('[Flow] Action Executing:', data);
      if (data.nodeId) {
        this.updateNode(data.nodeId, {
          status: 'executing',
          progress: data.progress
        });
      }
    });

    // Step result
    SSEClient.on('step_result', (data) => {
      console.log('[Flow] Step Result:', data);
      this.handleStepResult(data);
      if (this.onResultReceived) this.onResultReceived(data);
    });

    // Complete
    SSEClient.on('complete', (data) => {
      console.log('[Flow] Complete:', data);
      this.handleComplete(data);
      if (this.onComplete) this.onComplete(data);
    });

    // Error
    SSEClient.on('error', (data) => {
      console.error('[Flow] SSE Error:', data);
      if (this.onError) this.onError(new Error(data?.message || 'SSE Error'));
      
      // Update node with error if nodeId provided
      if (data.nodeId) {
        this.updateNode(data.nodeId, {
          status: 'error',
          error: data.message
        });
      }
    });

    // Node added
    SSEClient.on('node_added', (data) => {
      console.log('[Flow] Node Added:', data);
      if (data.node) {
        this.currentFlow = addNodeToFlow(this.currentFlow, data.node);
        this.render();
      }
    });

    // Node updated
    SSEClient.on('node_updated', (data) => {
      console.log('[Flow] Node Updated:', data);
      if (data.nodeId && data.updates) {
        this.updateNode(data.nodeId, data.updates);
      }
    });

    // Edge added
    SSEClient.on('edge_added', (data) => {
      console.log('[Flow] Edge Added:', data);
      if (data.edge) {
        this.currentFlow.edges.push(data.edge);
        this.render();
      }
    });

    // Session update
    SSEClient.on('session_update', (data) => {
      console.log('[Flow] Session Update:', data);
      // Handle session state changes
      if (data.state) {
        // Update based on session state
      }
    });
  }

  /**
   * Add a log node to the flow
   */
  addLogNode(data) {
    const logNode = {
      id: `log-${Date.now()}`,
      type: 'log',
      data: {
        label: 'Log',
        message: data.message,
        level: data.level || 'info',
        timestamp: data.timestamp || new Date().toISOString()
      },
      position: { x: 0, y: 0 }
    };
    this.currentFlow = addNodeToFlow(this.currentFlow, logNode);
    this.render();
  }

  /**
   * Handle action proposal from SSE
   */
  handleActionProposal(data) {
    const proposalBlock = createProposalContextBlock(data);
    this.currentFlow = addNodeToFlow(this.currentFlow, {
      id: proposalBlock.id,
      type: 'action_proposal',
      ...proposalBlock
    });
    
    // Connect to previous node
    const lastNode = this.currentFlow.nodes[this.currentFlow.nodes.length - 2];
    if (lastNode) {
      this.currentFlow = addEdgeToFlow(
        this.currentFlow,
        lastNode.id,
        proposalBlock.id
      );
    }
    
    this.render();
  }

  /**
   * Handle step result from SSE
   */
  handleStepResult(data) {
    const resultBlock = createResultContextBlock(data);
    this.currentFlow = addNodeToFlow(this.currentFlow, {
      id: resultBlock.id,
      type: 'step_result',
      ...resultBlock
    });
    this.render();
  }

  /**
   * Handle completion from SSE
   */
  handleComplete(data) {
    const completeBlock = createCompleteContextBlock(data);
    this.currentFlow = addNodeToFlow(this.currentFlow, {
      id: completeBlock.id,
      type: 'action_complete',
      ...completeBlock
    });
    this.render();
  }

  /**
   * Disconnect from SSE
   */
  disconnectSSE() {
    if (typeof SSEClient !== 'undefined') {
      SSEClient.disconnect();
    }
    this.sseConnected = false;
  }

  /**
   * Enable or disable SSE
   */
  setUseSSE(enabled) {
    this.useSSE = enabled;
    if (!enabled && this.pollingInterval) {
      this.stopPolling();
    }
  }

  /**
   * Send a task request to the server
   * Creates Input node and initiates server communication
   * Uses SSE for real-time updates if enabled
   * 
   * @param {string} taskText - Task description
   * @param {Object} options - Optional parameters (projectPath, codeBlocks, useSSE)
   */
  async sendTask(taskText, options = {}) {
    if (!this.a2aClient) {
      console.error('A2A client not configured. Call configureClient() first.');
      if (this.onError) this.onError(new Error('A2A client not configured'));
      return;
    }

    // Determine whether to use SSE or polling
    const useSSE = options.useSSE !== undefined ? options.useSSE : this.useSSE;

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

      // Use SSE or polling based on configuration
      if (useSSE) {
        // Connect to SSE for real-time updates
        console.log('[Flow] Connecting to SSE for session:', this.sessionId);
        this.connectSSE(this.sessionId, this.a2aClient.serverUrl);
      } else {
        // Start polling for response
        this.startPolling();
      }

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

    // Stop polling or disconnect SSE
    this.stopPolling();
    this.disconnectSSE();
    
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
      // Show node details in sidebar
      this.showNodeDetails(event.node);
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
   * Show node details in a panel
   * @param {Object} node - Clicked node
   */
  showNodeDetails(node) {
    // Find or create a details panel
    let panel = document.getElementById('node-details-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'node-details-panel';
      panel.className = 'node-details-panel';
      document.body.appendChild(panel);
    }
    
    const data = node.data || {};
    const type = node.type || 'default';
    
    // Extract relevant information from node data
    const dsl = data.dsl || data.definition || null;
    const input = data.input || data.task || data.message || null;
    const output = data.output || data.result || data.response || null;
    const status = data.status || 'pending';
    const timestamp = data.timestamp || null;
    
    // Build tabs content
    let tabsContent = '';
    
    // Data section (always show)
    let dataSection = `<div class="section"><div class="section-title">Data</div><pre>${JSON.stringify(data, null, 2)}</pre></div>`;
    
    // If there's DSL, show tabs
    if (dsl || input || output) {
      tabsContent = `
        <div class="node-details-tabs">
          ${dsl ? '<button class="active" data-tab="dsl">DSL</button>' : ''}
          ${input ? '<button data-tab="input">Input</button>' : ''}
          ${output ? '<button data-tab="output">Output</button>' : ''}
        </div>
        <div class="tab-content">
          ${dsl ? `<div class="tab-pane active" data-tab="dsl"><pre>${typeof dsl === 'string' ? dsl : JSON.stringify(dsl, null, 2)}</pre></div>` : ''}
          ${input ? `<div class="tab-pane" data-tab="input"><pre>${typeof input === 'string' ? input : JSON.stringify(input, null, 2)}</pre></div>` : ''}
          ${output ? `<div class="tab-pane" data-tab="output"><pre>${typeof output === 'string' ? output : JSON.stringify(output, null, 2)}</pre></div>` : ''}
        </div>
      `;
      dataSection = ''; // Hide raw data if we have tabs
    }
    
    panel.innerHTML = `
      <button class="close-btn" onclick="document.getElementById('node-details-panel').remove()">×</button>
      <h3>Node Details</h3>
      <div class="node-type">Type: <span>${type}</span></div>
      <div class="node-type">Status: <span>${status}</span></div>
      <div class="node-id">${node.id}</div>
      ${timestamp ? `<div class="node-type">Time: ${new Date(timestamp).toLocaleString()}</div>` : ''}
      
      ${tabsContent}
      ${dataSection}
    `;
    
    // Add tab switching functionality
    const tabs = panel.querySelectorAll('.node-details-tabs button');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Update button states
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Show corresponding content
        const tabName = tab.dataset.tab;
        panel.querySelectorAll('.tab-pane').forEach(pane => {
          pane.classList.toggle('active', pane.dataset.tab === tabName);
        });
      });
    });
  }

  /**
   * Update flow history panel with completed steps
   * @param {Array} nodes - Array of flow nodes
   */
  updateHistory(nodes) {
    const historyList = document.getElementById('flowHistoryList');
    if (!historyList) return;
    
    // Filter completed nodes
    const completedNodes = nodes.filter(n => 
      n.data?.status === 'completed' || 
      n.data?.status === 'done' ||
      n.type?.includes('complete') ||
      n.type?.includes('result')
    );
    
    if (completedNodes.length === 0) {
      historyList.innerHTML = '<div class="flow-history-item">No completed steps yet</div>';
      return;
    }
    
    historyList.innerHTML = completedNodes.map(node => {
      const label = node.data?.label || node.data?.task || node.data?.title || node.type || 'Step';
      const icon = node.data?.status === 'error' ? '❌' : '✅';
      return `
        <div class="flow-history-item completed" data-node-id="${node.id}">
          <span class="icon">${icon}</span>
          <span class="label">${label.substring(0, 30)}${label.length > 30 ? '...' : ''}</span>
        </div>
      `;
    }).join('');
    
    // Add click handlers to jump to node
    historyList.querySelectorAll('.flow-history-item').forEach(item => {
      item.addEventListener('click', () => {
        const nodeId = item.dataset.nodeId;
        this.focusNode(nodeId);
      });
    });
  }

  /**
   * Focus on a specific node in the flow
   * @param {string} nodeId - Node ID to focus on
   */
  focusNode(nodeId) {
    if (!this.vueflow) return;
    
    const node = this.vueflow.findNode(nodeId);
    if (node) {
      this.vueflow.setCenter(node.position.x + 100, node.position.y + 50, { zoom: 1.5, duration: 500 });
      this.showNodeDetails(node);
    }
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

export function updateFlowHistory(nodes) {
  flowManager.updateHistory(nodes);
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

export function onLog(callback) {
  flowManager.onLog(callback);
}

export function onProgress(callback) {
  flowManager.onProgress(callback);
}

export function connectSSE(sessionId, apiBase) {
  flowManager.connectSSE(sessionId, apiBase);
}

export function disconnectSSE() {
  flowManager.disconnectSSE();
}

export function setUseSSE(enabled) {
  flowManager.setUseSSE(enabled);
}

// Make functions available globally (for non-module scripts)
if (typeof window !== 'undefined') {
  window.initFlow = initFlow;
  window.loadContext = loadContext;
  window.loadSimulationResponse = loadSimulationResponse;
  window.addTask = addTask;
  window.addContextBlock = addContextBlock;
  window.updateNode = updateNode;
  window.clearFlowView = clearFlowView;
  window.zoomIn = zoomIn;
  window.zoomOut = zoomOut;
  window.fitView = fitView;
  window.updateFlowHistory = updateFlowHistory;
  window.configureClient = configureClient;
  window.sendTask = sendTask;
  window.approveAction = approveAction;
  window.sendStepResult = sendStepResult;
  window.cancelRequest = cancelRequest;
  window.onTaskResponse = onTaskResponse;
  window.onProposal = onProposal;
  window.onActionApproved = onActionApproved;
  window.onResult = onResult;
  window.onComplete = onComplete;
  window.onError = onError;
  window.onLog = onLog;
  window.onProgress = onProgress;
  window.connectSSE = connectSSE;
  window.disconnectSSE = disconnectSSE;
  window.setUseSSE = setUseSSE;
  window.flowManager = flowManager;
}

export { flowManager, A2AFlowManager, A2AClient };
