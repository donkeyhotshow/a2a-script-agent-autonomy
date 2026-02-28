/**
 * Graph Improvements - Missing functionality
 * Implements: Properties Panel, Console, Loading, Graph Toolbar, API enhancements
 */

// ===== PROPERTIES PANEL =====

const PropertiesPanel = {
  currentNode: null,
  
  init() {
    document.getElementById('closePropertiesPanel')?.addEventListener('click', () => this.hide());
  },
  
  show(node) {
    if (!node) {
      this.hide();
      return;
    }
    
    this.currentNode = node;
    const panel = document.getElementById('propertiesPanel');
    const content = document.getElementById('propertiesContent');
    
    if (!panel || !content) return;
    
    const data = node.data || {};
    const type = node.type || 'default';
    
    content.innerHTML = `
      <div class="property-group">
        <div class="property-group-title">General</div>
        <div class="property-row">
          <span class="property-label">ID</span>
          <span class="property-value">${node.id}</span>
        </div>
        <div class="property-row">
          <span class="property-label">Type</span>
          <span class="property-value">${type}</span>
        </div>
        <div class="property-row">
          <span class="property-label">Label</span>
          <span class="property-value">${data.label || '-'}</span>
        </div>
        <div class="property-row">
          <span class="property-label">Status</span>
          <span class="property-value">${data.status || 'pending'}</span>
        </div>
      </div>
      
      <div class="property-group">
        <div class="property-group-title">Position</div>
        <div class="property-row">
          <span class="property-label">X</span>
          <span class="property-value">${Math.round(node.position?.x || 0)}</span>
        </div>
        <div class="property-row">
          <span class="property-label">Y</span>
          <span class="property-value">${Math.round(node.position?.y || 0)}</span>
        </div>
      </div>
    `;
    
    panel.style.display = 'flex';
  },
  
  hide() {
    const panel = document.getElementById('propertiesPanel');
    if (panel) {
      panel.style.display = 'none';
    }
    this.currentNode = null;
  },

  toggle() {
    const panel = document.getElementById('propertiesPanel');
    if (panel) {
      panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
    }
  }
};


// ===== CONSOLE PANEL =====

const ConsolePanel = {
  entries: [],
  maxEntries: 500,
  autoScroll: true,
  filterLevel: 'all',
  
  init() {
    document.getElementById('consoleClear')?.addEventListener('click', () => this.clear());
    document.getElementById('consoleToggleAutoScroll')?.addEventListener('click', (e) => {
      this.autoScroll = !this.autoScroll;
      e.target.classList.toggle('active', this.autoScroll);
    });
    document.getElementById('closeConsolePanel')?.addEventListener('click', () => this.hide());
    
    document.querySelectorAll('.console-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.console-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.filterLevel = btn.dataset.level;
        this.render();
      });
    });
  },
  
  log(message, level = 'info') {
    const entry = {
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      level,
      message: String(message)
    };
    
    this.entries.unshift(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.pop();
    }
    
    this.render();
  },
  
  render() {
    const content = document.getElementById('consoleContent');
    if (!content) return;
    
    const filtered = this.filterLevel === 'all' 
      ? this.entries 
      : this.entries.filter(e => e.level === this.filterLevel);
    
    if (filtered.length === 0) {
      content.innerHTML = '<div class="console-empty">Console output will appear here</div>';
      return;
    }
    
    content.innerHTML = filtered.slice(0, 100).map(entry => `
      <div class="console-entry">
        <span class="console-timestamp">${entry.timestamp.toLocaleTimeString()}</span>
        <span class="console-level ${entry.level}">${entry.level.toUpperCase()}</span>
        <span class="console-message">${this.escapeHtml(entry.message)}</span>
      </div>
    `).join('');
    
    if (this.autoScroll) {
      content.scrollTop = 0;
    }
  },
  
  clear() {
    this.entries = [];
    this.render();
  },
  
  show() {
    document.getElementById('consolePanel').style.display = 'flex';
  },
  
  hide() {
    document.getElementById('consolePanel').style.display = 'none';
  },
  
  toggle() {
    const panel = document.getElementById('consolePanel');
    panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
  },
  
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};


// ===== LOADING OVERLAY =====

const LoadingOverlay = {
  init() {
    // No initialization needed
  },
  
  show(text = 'Loading...', progress = 0, status = '') {
    const overlay = document.getElementById('loadingOverlay');
    const textEl = document.querySelector('.loading-text');
    const progressEl = document.getElementById('loadingProgressBar');
    const statusEl = document.getElementById('loadingStatus');
    
    if (overlay) {
      overlay.style.display = 'flex';
      if (textEl) textEl.textContent = text;
      if (progressEl) progressEl.style.width = progress + '%';
      if (statusEl) statusEl.textContent = status;
    }
  },
  
  hide() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  },
  
  updateProgress(progress, status = '') {
    const progressEl = document.getElementById('loadingProgressBar');
    const statusEl = document.getElementById('loadingStatus');
    
    if (progressEl) progressEl.style.width = Math.min(100, Math.max(0, progress)) + '%';
    if (statusEl) statusEl.textContent = status;
  },
  
  updateText(text) {
    const textEl = document.querySelector('.loading-text');
    if (textEl) textEl.textContent = text;
  }
};


// ===== GRAPH TOOLBAR =====

const GraphToolbar = {
  init() {
    document.getElementById('graphZoomIn')?.addEventListener('click', () => {
      window.flowManager?.zoomIn();
    });
    
    document.getElementById('graphZoomOut')?.addEventListener('click', () => {
      window.flowManager?.zoomOut();
    });
    
    document.getElementById('graphFitView')?.addEventListener('click', () => {
      window.flowManager?.fitView();
    });
    
    document.getElementById('graphUndo')?.addEventListener('click', () => {
      window.UndoRedoManager?.undo();
    });
    
    document.getElementById('graphRedo')?.addEventListener('click', () => {
      window.UndoRedoManager?.redo();
    });
    
    document.getElementById('graphSelectAll')?.addEventListener('click', () => {
      const vueflow = window.flowManager?.vueflow;
      if (vueflow) vueflow.fitView();
    });
    
    document.getElementById('graphDeleteSelected')?.addEventListener('click', () => {
      const selected = document.querySelectorAll('.vue-flow__node.selected');
      selected.forEach(node => {
        window.flowManager?.removeNode?.(node.id);
      });
    });
    
    document.getElementById('graphToggleMinimap')?.addEventListener('click', () => {
      const minimap = document.querySelector('.vue-flow__minimap');
      if (minimap) {
        minimap.style.display = minimap.style.display === 'none' ? 'block' : 'none';
      }
    });
    
    document.getElementById('graphToggleConsole')?.addEventListener('click', () => {
      ConsolePanel.toggle();
    });
    
    document.getElementById('graphToggleProperties')?.addEventListener('click', () => {
      PropertiesPanel.toggle();
    });
  }
};


// ===== API ENHANCEMENTS =====

const APIEnhancements = {
  timeout: 30000,
  retries: 3,
  
  init() {
    this.wrapFetch();
  },
  
  wrapFetch() {
    const originalFetch = window.fetch;
    
    window.fetch = async (url, options = {}) => {
      const timeout = options.timeout || this.timeout;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      try {
        const response = await originalFetch(url, {
          ...options,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeout}ms`);
        }
        throw error;
      }
    };
  }
};


// ===== NODE SELECTION =====

const NodeSelection = {
  selectedNodes: new Set(),
  
  init() {
    document.addEventListener('click', (e) => {
      const node = e.target.closest('.vue-flow__node');
      if (node) {
        if (e.ctrlKey || e.metaKey) {
          this.toggleSelection(node.id);
        } else {
          this.selectNode(node.id);
        }
      } else if (!e.target.closest('.properties-panel')) {
        this.clearSelection();
      }
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.clearSelection();
      }
    });
  },
  
  selectNode(nodeId) {
    this.selectedNodes.clear();
    this.selectedNodes.add(nodeId);
  },
  
  toggleSelection(nodeId) {
    if (this.selectedNodes.has(nodeId)) {
      this.selectedNodes.delete(nodeId);
    } else {
      this.selectedNodes.add(nodeId);
    }
  },
  
  clearSelection() {
    this.selectedNodes.clear();
  },
  
  getSelected() {
    return Array.from(this.selectedNodes);
  }
};


// ===== GRAPH SEARCH =====

const GraphSearch = {
  results: [],
  currentIndex: -1,
  
  init() {
    // Search is handled by ActionPanel
  },
  
  search(query) {
    if (!query.trim()) {
      this.results = [];
      return;
    }
    
    const nodes = window.flowManager?.currentFlow?.nodes || [];
    const lowerQuery = query.toLowerCase();
    
    this.results = nodes.filter(n => {
      const data = n.data || {};
      return (
        (n.id && n.id.toLowerCase().includes(lowerQuery)) ||
        (data.label && data.label.toLowerCase().includes(lowerQuery))
      );
    });
  }
};


// ===== INITIALIZE ALL IMPROVEMENTS =====

function initGraphImprovements() {
  console.log('[GraphImprovements] Initializing...');
  
  PropertiesPanel.init();
  ConsolePanel.init();
  LoadingOverlay.init();
  GraphToolbar.init();
  APIEnhancements.init();
  NodeSelection.init();
  GraphSearch.init();
  
  console.log('[GraphImprovements] Initialized');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGraphImprovements);
} else {
  initGraphImprovements();
}

// Make available globally
if (typeof window !== 'undefined') {
  window.PropertiesPanel = PropertiesPanel;
  window.ConsolePanel = ConsolePanel;
  window.LoadingOverlay = LoadingOverlay;
  window.GraphToolbar = GraphToolbar;
  window.APIEnhancements = APIEnhancements;
  window.NodeSelection = NodeSelection;
  window.GraphSearch = GraphSearch;
  window.initGraphImprovements = initGraphImprovements;
}
