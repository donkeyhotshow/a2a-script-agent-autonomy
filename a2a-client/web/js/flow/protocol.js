/**
 * A2A Protocol to VueFlow mapping utilities
 * 
 * Maps A2A protocol ContextBlocks to VueFlow nodes and edges
 */

import { getNodeType, getNodeColor } from './nodes.js';

/**
 * Browser-based A2A Client for server communication
 * Uses native fetch API
 */
export class A2AClient {
  constructor(config = {}) {
    this.serverUrl = config.serverUrl || 'http://localhost:3000/api/v1';
    this.serverUrl = this.serverUrl.replace(/\/?$/, '');
    this.token = config.token;
    this.clientId = config.clientId;
    this.timeout = config.timeout || 30000;
  }

  /**
   * Make HTTP request to server
   */
  async request(method, path, body = null) {
    const url = `${this.serverUrl}${path}`;
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    if (this.clientId) headers['X-Client-ID'] = this.clientId;
    
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    options.signal = controller.signal;
    
    try {
      const response = await fetch(url, options);
      clearTimeout(timeoutId);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error?.message || 'Request failed');
      }
      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') throw new Error('Request timeout');
      throw err;
    }
  }

  /**
   * Create a new session
   */
  async createSession(projectId, title) {
    const res = await this.request('POST', '/sessions', { projectId, title });
    return res.data;
  }

  /**
   * Get session details
   */
  async getSession(sessionId) {
    const res = await this.request('GET', `/sessions/${sessionId}`);
    return res.data;
  }

  /**
   * Create a new request (task)
   */
  async createRequest(data) {
    const res = await this.request('POST', '/requests', data);
    return res.data;
  }

  /**
   * Get request status (for polling)
   */
  async getRequestStatus(promiseId) {
    const res = await this.request('GET', `/requests/${promiseId}/status`);
    return res.data;
  }

  /**
   * Get request result
   */
  async getRequestResult(promiseId) {
    const res = await this.request('GET', `/requests/${promiseId}/result`);
    return res.data;
  }

  /**
   * Cancel a request
   */
  async cancelRequest(promiseId) {
    const res = await this.request('DELETE', `/requests/${promiseId}`);
    return res.data;
  }

  /**
   * Send a task request to start a session
   */
  async sendTask(projectPath, task, codeBlocks = []) {
    const context = {
      project_path: projectPath,
      new_task: task ? [task] : undefined
    };
    const created = await this.createRequest({ context, codeBlocks });
    return created;
  }

  /**
   * Approve an action (action_proposal)
   */
  async approveAction(sessionId, approved = true) {
    const res = await this.request('POST', `/sessions/${sessionId}/confirm`, {
      context: { session_id: sessionId, approved },
      confirmed: approved
    });
    return res.data;
  }

  /**
   * Send step result back to server
   */
  async sendStepResult(sessionId, stepResult) {
    const res = await this.request('POST', `/sessions/${sessionId}/continue`, {
      context: { session_id: sessionId },
      step_result: stepResult
    });
    return res.data;
  }

  /**
   * Poll for request completion
   */
  async pollForResult(promiseId, options = {}) {
    const interval = options.interval || 5000;
    const maxAttempts = options.maxAttempts || 720;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      const status = await this.getRequestStatus(promiseId);
      
      if (status.status === 'completed') {
        return await this.getRequestResult(promiseId);
      }
      
      if (status.status === 'failed' || status.status === 'cancelled') {
        throw new Error(status.error?.message || 'Request failed');
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error('Polling timeout exceeded');
  }
}

/**
 * Default A2A client instance (lazy initialization)
 */
let defaultClient = null;

export function getA2AClient(config) {
  if (!defaultClient && config) {
    defaultClient = new A2AClient(config);
  }
  return defaultClient;
}

export function setA2AClient(client) {
  defaultClient = client;
}

/**
 * Node color constants based on protocol message types
 */
export const NODE_COLORS = {
  /** task_request - Input Node (green) */
  TASK_REQUEST: '#22c55e',
  /** action_proposal - Default Node (yellow) */
  ACTION_PROPOSAL: '#eab308',
  /** action_executing - Default Node (blue) */
  ACTION_EXECUTING: '#3b82f6',
  /** step_result - Default Node (gray) */
  STEP_RESULT: '#6b7280',
  /** action_complete - Output Node (green) */
  ACTION_COMPLETE: '#22c55e',
  /** Default node color */
  DEFAULT: '#6b7280',
  /** Error state */
  ERROR: '#ef4444'
};

/**
 * Node type labels for display
 */
export const NODE_LABELS = {
  task_request: 'Task Request',
  action_proposal: 'Action Proposal',
  action_executing: 'Executing',
  step_result: 'Result',
  action_complete: 'Complete',
  default: 'Node'
};

/**
 * Default layout configuration
 */
export const LAYOUT_CONFIG = {
  nodeWidth: 220,
  nodeHeight: 150,
  verticalSpacing: 120,
  horizontalSpacing: 50,
  startX: 100,
  startY: 50
};

/**
 * Extract message type from ContextBlock
 */
function getMessageType(contextBlock) {
  if (!contextBlock) return 'default';
  return contextBlock.type || contextBlock.messageType || 'default';
}

/**
 * Extract data from ContextBlock for node display
 */
function extractNodeData(contextBlock) {
  if (!contextBlock) return {};
  
  const baseData = {
    timestamp: contextBlock.timestamp || new Date().toISOString()
  };
  
  switch (contextBlock.type) {
    case 'task_request':
      return {
        ...baseData,
        task: contextBlock.task || contextBlock.text || 'No task specified'
      };
      
    case 'action_proposal':
      return {
        ...baseData,
        actionName: contextBlock.actionName || contextBlock.action || 'Unknown Action',
        description: contextBlock.description || '',
        stepsCount: contextBlock.steps?.length || contextBlock.subActions?.length || 0
      };
      
    case 'action_executing':
      return {
        ...baseData,
        subActionName: contextBlock.subActionName || contextBlock.currentAction || 'Sub Action',
        stepIndex: contextBlock.stepIndex || 1,
        stepName: contextBlock.stepName || contextBlock.step || 'Running...',
        codeBlocks: contextBlock.codeBlocks || [],
        status: contextBlock.status || 'running',
        statusText: contextBlock.statusText || 'Running'
      };
      
    case 'step_result':
      return {
        ...baseData,
        success: contextBlock.success !== false,
        message: contextBlock.message || '',
        changes: contextBlock.changes || []
      };
      
    case 'action_complete':
      return {
        ...baseData,
        actionName: contextBlock.actionName || 'Action',
        summary: contextBlock.summary || '',
        totalSteps: contextBlock.totalSteps || 0,
        duration: contextBlock.duration || '0s'
      };
      
    default:
      return {
        ...baseData,
        ...contextBlock
      };
  }
}

/**
 * Map a single ContextBlock to a VueFlow node
 */
export function mapContextBlockToNode(contextBlock, index, totalNodes) {
  const messageType = getMessageType(contextBlock);
  const nodeType = getNodeType(messageType);
  const color = getNodeColor(messageType);
  const data = extractNodeData(contextBlock);
  
  // Calculate position based on index
  const layout = LAYOUT_CONFIG;
  const x = layout.startX;
  const y = layout.startY + (index * layout.verticalSpacing);
  
  return {
    id: contextBlock.id || `node-${index}`,
    type: nodeType,
    position: { x, y },
    data: {
      ...data,
      messageType,
      label: NODE_LABELS[messageType] || NODE_LABELS.default,
      color
    },
    style: {
      borderColor: color,
      borderWidth: '2px'
    }
  };
}

/**
 * Map context to VueFlow elements (nodes and edges)
 * 
 * @param {Array|Object} context - ContextBlock or array of ContextBlocks
 * @returns {Object} { nodes, edges }
 */
export function mapContextToFlow(context) {
  // Handle different context formats
  let contextBlocks = [];
  
  if (!context) {
    contextBlocks = [];
  } else if (Array.isArray(context)) {
    contextBlocks = context;
  } else if (context.blocks) {
    contextBlocks = context.blocks;
  } else if (context.contextBlocks) {
    contextBlocks = context.contextBlocks;
  } else if (context.messages) {
    contextBlocks = context.messages;
  } else {
    // Single context block
    contextBlocks = [context];
  }
  
  // Map to nodes
  const nodes = contextBlocks.map((block, index) => 
    mapContextBlockToNode(block, index, contextBlocks.length)
  );
  
  // Create edges between sequential nodes
  const edges = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({
      id: `edge-${i}-${i + 1}`,
      source: nodes[i].id,
      target: nodes[i + 1].id,
      type: 'smoothstep',
      animated: nodes[i + 1].data.messageType === 'action_executing',
      style: {
        stroke: nodes[i + 1].data.color,
        strokeWidth: 2
      },
      markerEnd: {
        type: 'arrowclosed',
        color: nodes[i + 1].data.color
      }
    });
  }
  
  return { nodes, edges };
}

/**
 * Create an initial flow for a new task request
 */
export function createTaskRequestNode(taskText) {
  const contextBlock = {
    id: `task-${Date.now()}`,
    type: 'task_request',
    task: taskText,
    timestamp: new Date().toISOString()
  };
  
  return mapContextBlockToNode(contextBlock, 0, 1);
}

/**
 * Add a new node to existing flow
 */
export function addNodeToFlow(currentFlow, newContextBlock) {
  const { nodes: currentNodes, edges: currentEdges } = currentFlow;
  
  const newNode = mapContextBlockToNode(
    newContextBlock, 
    currentNodes.length, 
    currentNodes.length + 1
  );
  
  // Create edge from last node to new node
  const newEdges = [...currentEdges];
  if (currentNodes.length > 0) {
    const lastNode = currentNodes[currentNodes.length - 1];
    newEdges.push({
      id: `edge-${lastNode.id}-${newNode.id}`,
      source: lastNode.id,
      target: newNode.id,
      type: 'smoothstep',
      animated: newNode.data.messageType === 'action_executing',
      style: {
        stroke: newNode.data.color,
        strokeWidth: 2
      },
      markerEnd: {
        type: 'arrowclosed',
        color: newNode.data.color
      }
    });
  }
  
  return {
    nodes: [...currentNodes, newNode],
    edges: newEdges
  };
}

/**
 * Update an existing node in the flow
 */
export function updateNodeInFlow(currentFlow, nodeId, updates) {
  const { nodes, edges } = currentFlow;
  
  const updatedNodes = nodes.map(node => {
    if (node.id === nodeId) {
      return {
        ...node,
        data: { ...node.data, ...updates }
      };
    }
    return node;
  });
  
  return { nodes: updatedNodes, edges };
}

/**
 * Get flow statistics
 */
export function getFlowStats(flow) {
  const { nodes, edges } = flow;
  
  const stats = {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    byType: {}
  };
  
  nodes.forEach(node => {
    const type = node.data?.messageType || 'unknown';
    stats.byType[type] = (stats.byType[type] || 0) + 1;
  });
  
  return stats;
}

/**
 * Clear the flow
 */
export function clearFlow() {
  return { nodes: [], edges: [] };
}

/**
 * Export flow to JSON
 */
export function exportFlowToJSON(flow) {
  return JSON.stringify(flow, null, 2);
}

/**
 * Import flow from JSON
 */
export function importFlowFromJSON(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error('Failed to parse flow JSON:', e);
    return { nodes: [], edges: [] };
  }
}

/**
 * Convert server response to flow nodes
 * 
 * @param {Object} response - Server response with context/messages
 * @returns {Object} { nodes, edges }
 */
export function responseToFlow(response) {
  if (!response) return { nodes: [], edges: [] };
  
  // Handle different response formats
  const context = response.context || response;
  const messages = context.messages || context.blocks || context.contextBlocks || [];
  
  if (!Array.isArray(messages) || messages.length === 0) {
    // No messages yet - return empty
    return { nodes: [], edges: [] };
  }
  
  return mapContextToFlow(messages);
}

/**
 * Create a task_request node from user input
 * 
 * @param {string} taskText - User task description
 * @returns {Object} ContextBlock for task_request
 */
export function createTaskContextBlock(taskText) {
  return {
    id: `task-${Date.now()}`,
    type: 'task_request',
    task: taskText,
    timestamp: new Date().toISOString()
  };
}

/**
 * Create an action_proposal node from server response
 * 
 * @param {Object} proposal - Action proposal from server
 * @returns {Object} ContextBlock for action_proposal
 */
export function createProposalContextBlock(proposal) {
  return {
    id: `proposal-${Date.now()}`,
    type: 'action_proposal',
    actionName: proposal.actionName || proposal.action || 'Unknown Action',
    description: proposal.description || '',
    steps: proposal.steps || proposal.subActions || [],
    timestamp: new Date().toISOString()
  };
}

/**
 * Create a step_result node from execution result
 * 
 * @param {Object} result - Step result from server
 * @returns {Object} ContextBlock for step_result
 */
export function createResultContextBlock(result) {
  return {
    id: `result-${Date.now()}`,
    type: 'step_result',
    success: result.success !== false,
    message: result.message || '',
    changes: result.changes || [],
    timestamp: new Date().toISOString()
  };
}

/**
 * Create an action_complete node
 * 
 * @param {Object} completion - Completion data from server
 * @returns {Object} ContextBlock for action_complete
 */
export function createCompleteContextBlock(completion) {
  return {
    id: `complete-${Date.now()}`,
    type: 'action_complete',
    actionName: completion.actionName || 'Action',
    summary: completion.summary || '',
    totalSteps: completion.totalSteps || 0,
    duration: completion.duration || '0s',
    timestamp: new Date().toISOString()
  };
}

/**
 * Add edge between two nodes
 * 
 * @param {Object} currentFlow - Current flow state
 * @param {string} sourceId - Source node ID
 * @param {string} targetId - Target node ID
 * @returns {Object} Updated flow
 */
export function addEdgeToFlow(currentFlow, sourceId, targetId) {
  const { nodes, edges } = currentFlow;
  
  // Check if edge already exists
  const exists = edges.some(e => e.source === sourceId && e.target === targetId);
  if (exists) return currentFlow;
  
  const sourceNode = nodes.find(n => n.id === sourceId);
  const targetNode = nodes.find(n => n.id === targetId);
  const targetColor = targetNode?.data?.color || NODE_COLORS.DEFAULT;
  
  const newEdge = {
    id: `edge-${sourceId}-${targetId}`,
    source: sourceId,
    target: targetId,
    type: 'smoothstep',
    animated: targetNode?.data?.messageType === 'action_executing',
    style: {
      stroke: targetColor,
      strokeWidth: 2
    },
    markerEnd: {
      type: 'arrowclosed',
      color: targetColor
    }
  };
  
  return {
    nodes,
    edges: [...edges, newEdge]
  };
}

/**
 * Find nodes by type in flow
 * 
 * @param {Object} flow - Current flow state
 * @param {string} nodeType - Node type to find
 * @returns {Array} Array of matching nodes
 */
export function findNodesByType(flow, nodeType) {
  return flow.nodes.filter(node => node.data?.messageType === nodeType);
}

/**
 * Get the last task request node
 * 
 * @param {Object} flow - Current flow state
 * @returns {Object|null} Last task request node
 */
export function getLastTaskNode(flow) {
  const taskNodes = findNodesByType(flow, 'task_request');
  return taskNodes.length > 0 ? taskNodes[taskNodes.length - 1] : null;
}

/**
 * Get the last action proposal node
 * 
 * @param {Object} flow - Current flow state
 * @returns {Object|null} Last action proposal node
 */
export function getLastProposalNode(flow) {
  const proposalNodes = findNodesByType(flow, 'action_proposal');
  return proposalNodes.length > 0 ? proposalNodes[proposalNodes.length - 1] : null;
}
