/**
 * Graph Statistics Manager - Manages graph analytics and statistics
 * Provides UI for viewing graph metrics and analytics
 */

class GraphStatisticsManager {
  constructor() {
    this.listeners = new Map();
    this.history = [];
    this.maxHistory = 50;
  }

  /**
   * Initialize Statistics Manager
   */
  init() {
    this._setupEventListeners();
    console.log('[GraphStatistics] Initialized');
  }

  /**
   * Setup event listeners
   */
  _setupEventListeners() {
    // Close button
    document.getElementById('closeStatisticsPanel')?.addEventListener('click', () => {
      this.hide();
    });
  }

  /**
   * Calculate statistics from flow manager
   */
  calculate(flowManager) {
    if (!flowManager?.currentFlow) {
      return this._getEmptyStats();
    }

    const nodes = flowManager.currentFlow.nodes || [];
    const edges = flowManager.currentFlow.edges || [];

    // Count by status
    const statusCounts = {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      idle: 0
    };

    // Count by type
    const typeCounts = {};

    // Calculate execution times
    const executionTimes = [];

    nodes.forEach(node => {
      // Status counts
      const status = node.data?.status || 'idle';
      if (statusCounts.hasOwnProperty(status)) {
        statusCounts[status]++;
      } else {
        statusCounts.idle++;
      }

      // Type counts
      const type = node.type || 'default';
      typeCounts[type] = (typeCounts[type] || 0) + 1;

      // Execution time (if available)
      if (node.data?.startTime && node.data?.endTime) {
        executionTimes.push(node.data.endTime - node.data.startTime);
      }
    });

    // Calculate average execution time
    const avgExecutionTime = executionTimes.length > 0
      ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length
      : 0;

    const stats = {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      pendingNodes: statusCounts.pending,
      runningNodes: statusCounts.running,
      completedNodes: statusCounts.completed,
      failedNodes: statusCounts.failed,
      idleNodes: statusCounts.idle,
      typeCounts: typeCounts,
      avgExecutionTime: avgExecutionTime,
      maxExecutionTime: executionTimes.length > 0 ? Math.max(...executionTimes) : 0,
      minExecutionTime: executionTimes.length > 0 ? Math.min(...executionTimes) : 0,
      timestamp: Date.now()
    };

    return stats;
  }

  /**
   * Get empty statistics
   */
  _getEmptyStats() {
    return {
      totalNodes: 0,
      totalEdges: 0,
      pendingNodes: 0,
      runningNodes: 0,
      completedNodes: 0,
      failedNodes: 0,
      idleNodes: 0,
      typeCounts: {},
      avgExecutionTime: 0,
      maxExecutionTime: 0,
      minExecutionTime: 0,
      timestamp: Date.now()
    };
  }

  /**
   * Update statistics display
   */
  update(flowManager) {
    const stats = this.calculate(flowManager);
    
    // Save to history
    this._addToHistory(stats);

    // Update UI
    this._render(stats);

    // Emit event
    this._emit('statsUpdated', stats);

    return stats;
  }

  /**
   * Add stats to history
   */
  _addToHistory(stats) {
    this.history.push(stats);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  /**
   * Render statistics to UI
   */
  _render(stats) {
    // Update total nodes
    const totalNodesEl = document.getElementById('statTotalNodes');
    if (totalNodesEl) {
      totalNodesEl.textContent = stats.totalNodes;
    }

    // Update total edges
    const totalEdgesEl = document.getElementById('statTotalEdges');
    if (totalEdgesEl) {
      totalEdgesEl.textContent = stats.totalEdges;
    }

    // Update completed nodes
    const completedNodesEl = document.getElementById('statCompletedNodes');
    if (completedNodesEl) {
      completedNodesEl.textContent = stats.completedNodes;
    }

    // Update running nodes
    const runningNodesEl = document.getElementById('statRunningNodes');
    if (runningNodesEl) {
      runningNodesEl.textContent = stats.runningNodes;
    }

    // Update failed nodes
    const failedNodesEl = document.getElementById('statFailedNodes');
    if (failedNodesEl) {
      failedNodesEl.textContent = stats.failedNodes;
    }
  }

  /**
   * Get history
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Get latest stats
   */
  getLatest() {
    return this.history[this.history.length - 1] || this._getEmptyStats();
  }

  /**
   * Show statistics panel
   */
  show() {
    const panel = document.getElementById('statisticsPanel');
    if (panel) {
      panel.style.display = 'flex';
      // Update with current flow state
      if (window.flowManager) {
        this.update(window.flowManager);
      }
    }
  }

  /**
   * Hide statistics panel
   */
  hide() {
    const panel = document.getElementById('statisticsPanel');
    if (panel) {
      panel.style.display = 'none';
    }
  }

  /**
   * Toggle statistics panel
   */
  toggle() {
    const panel = document.getElementById('statisticsPanel');
    if (panel?.style.display === 'none') {
      this.show();
    } else {
      this.hide();
    }
  }

  /**
   * Subscribe to events
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    
    return () => this.listeners.get(event)?.delete(callback);
  }

  /**
   * Emit event
   */
  _emit(event, data) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }
}

// Create singleton instance
const graphStatisticsManager = new GraphStatisticsManager();

// Make available globally
if (typeof window !== 'undefined') {
  window.GraphStatisticsManager = GraphStatisticsManager;
  window.graphStatisticsManager = graphStatisticsManager;
}
