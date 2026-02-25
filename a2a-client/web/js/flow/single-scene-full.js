/**
 * Single Scene VueFlow UI - Full Initialization
 * Includes: Drag & Drop, Canvas config, Panel events
 */

(function() {
  'use strict';

  console.log('Single Scene UI: Initializing...');

  // Wait for DOM and VueFlow to be ready
  function init() {
    let attempts = 0;
    const maxAttempts = 50;

    const checkVueFlow = () => {
      attempts++;
      
      if (window.PanelManager) {
        console.log('Single Scene UI: PanelManager found');
        
        // Load default panels
        PanelManager.loadDefaultPanels();
        
        // Update VueFlow
        if (window.setFlowNodes && window.setFlowEdges) {
          const nodes = PanelManager.getNodes();
          const edges = PanelManager.getEdges();
          window.setFlowNodes(nodes);
          window.setFlowEdges(edges);
          console.log('Single Scene UI: Panels loaded', nodes.length);
        }
        
        // Setup canvas
        setupCanvas();
        
        // Setup drag & drop
        setupDragDrop();
        
        // Setup events
        setupEvents();
        
        console.log('Single Scene UI: Complete!');
      } else if (attempts < maxAttempts) {
        setTimeout(checkVueFlow, 100);
      }
    };

    setTimeout(checkVueFlow, 500);
  }

  // Canvas configuration - fixed size with horizontal scroll
  function setupCanvas() {
    const container = document.getElementById('vueflow-graph');
    if (container) {
      container.style.width = '3000px';
      container.style.height = '100%';
      container.style.minHeight = '800px';
      console.log('Canvas: 3000x800 configured');
    }
  }

  // Drag & Drop
  function setupDragDrop() {
    // Horizontal scroll with wheel
    const container = document.getElementById('vueflow-graph');
    if (container) {
      container.addEventListener('wheel', (e) => {
        if (e.shiftKey || e.deltaY !== 0) {
          container.scrollLeft += e.deltaY;
          e.preventDefault();
        }
      }, { passive: false });
    }
    console.log('Drag & Drop: configured');
  }

  // Panel events
  function setupEvents() {
    // Close panel
    document.addEventListener('panel-close', (e) => {
      if (window.PanelManager && e.detail) {
        window.PanelManager.removePanel(e.detail);
        if (window.setFlowNodes) {
          window.setFlowNodes(window.PanelManager.getNodes());
          window.setFlowEdges(window.PanelManager.getEdges());
        }
      }
    });

    // Add panel
    document.addEventListener('panel-add', (e) => {
      if (window.PanelManager && e.detail) {
        if (window.PanelManager.hasPanelType(e.detail)) return;
        
        const newPanel = window.PanelManager.addPanel(e.detail);
        const projectPanel = window.PanelManager.getPanelByType('project');
        if (projectPanel) {
          window.PanelManager.connectPanels(projectPanel.id, newPanel.id);
        }
        
        if (window.setFlowNodes) {
          window.setFlowNodes(window.PanelManager.getNodes());
          window.setFlowEdges(window.PanelManager.getEdges());
        }
      }
    });

    console.log('Panel events: configured');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
