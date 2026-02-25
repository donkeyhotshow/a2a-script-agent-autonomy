/**
 * Graph Panel - Shows VueFlow graph visualization
 */

const GraphPanel = {
  render(panelData) {
    const data = panelData?.data || {};
    const graphData = data.data || {};
    
    return `
      <div class="graph-panel-content">
        <div class="graph-toolbar">
          <input type="text" id="graphSearch" placeholder="Search..." class="search-input">
          <select id="flowTypeFilter" class="search-filter">
            <option value="">All Types</option>
            <option value="taskInput">Task Request</option>
            <option value="actionProposal">Action Proposal</option>
            <option value="subAction">Sub Action</option>
            <option value="result">Result</option>
            <option value="actionComplete">Complete</option>
          </select>
          <select id="flowStatusFilter" class="search-filter">
            <option value="">All Status</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        
        <div class="graph-container" id="graphContainer">
          <!-- VueFlow will be rendered here -->
          <div class="graph-placeholder">Graph will appear here</div>
        </div>
        
        <div class="graph-controls">
          <button class="graph-btn" id="graphZoomIn" title="Zoom In">+</button>
          <button class="graph-btn" id="graphZoomOut" title="Zoom Out">−</button>
          <button class="graph-btn" id="graphFitView" title="Fit View">Fit</button>
          <button class="graph-btn" id="graphDemo" title="Load Demo">🎲</button>
        </div>
      </div>
    `;
  },

  setupEvents(panelId) {
    // Zoom controls
    const zoomIn = document.getElementById('graphZoomIn');
    const zoomOut = document.getElementById('graphZoomOut');
    const fitView = document.getElementById('graphFitView');
    const demo = document.getElementById('graphDemo');

    if (zoomIn && window.zoomIn) {
      zoomIn.addEventListener('click', () => window.zoomIn());
    }
    if (zoomOut && window.zoomOut) {
      zoomOut.addEventListener('click', () => window.zoomOut());
    }
    if (fitView && window.fitView) {
      fitView.addEventListener('click', () => window.fitView());
    }
    if (demo && window.loadDemoData) {
      demo.addEventListener('click', () => window.loadDemoData());
    }

    // Search
    const searchInput = document.getElementById('graphSearch');
    if (searchInput) {
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && window.searchFlow) {
          window.searchFlow(e.target.value);
        }
      });
    }

    // Filters
    const typeFilter = document.getElementById('flowTypeFilter');
    const statusFilter = document.getElementById('flowStatusFilter');

    if (typeFilter) {
      typeFilter.addEventListener('change', () => {
        window.filterFlow?.(typeFilter.value, statusFilter?.value);
      });
    }
    if (statusFilter) {
      statusFilter.addEventListener('change', () => {
        window.filterFlow?.(typeFilter?.value, statusFilter.value);
      });
    }
  },

  /**
   * Update graph with nodes and edges
   */
  updateGraph(nodes, edges) {
    if (window.setFlowNodes && window.setFlowEdges) {
      window.setFlowNodes(nodes);
      window.setFlowEdges(edges);
    }
  },

  /**
   * Clear graph
   */
  clearGraph() {
    if (window.clearFlowView) {
      window.clearFlowView();
    }
  },

  /**
   * Fit view to content
   */
  fitToView() {
    if (window.flowFitView) {
      window.flowFitView();
    }
  },
};

window.GraphPanel = GraphPanel;
