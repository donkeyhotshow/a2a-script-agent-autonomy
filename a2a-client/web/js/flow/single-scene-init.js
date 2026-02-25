/**
 * Single Scene VueFlow UI - Initialization
 * This file initializes the new panel-based UI system
 */

(function() {
  'use strict';

  console.log('Single Scene UI: Initializing...');

  // Wait for DOM and VueFlow to be ready
  function init() {
    // Wait for VueFlow to be mounted
    let attempts = 0;
    const maxAttempts = 50;

    const checkVueFlow = () => {
      attempts++;
      
      if (window.PanelManager) {
        // Initialize Panel Manager
        console.log('Single Scene UI: PanelManager found');
        
        // Load default panels (only project panel)
        PanelManager.loadDefaultPanels();
        
        // Update VueFlow with panels
        if (window.setFlowNodes && window.setFlowEdges) {
          const nodes = PanelManager.getNodes();
          const edges = PanelManager.getEdges();
          window.setFlowNodes(nodes);
          window.setFlowEdges(edges);
          console.log('Single Scene UI: Panels loaded', nodes.length);
        }
        
        // Setup project selection handler
        setupProjectHandler();
        
        console.log('Single Scene UI: Initialization complete');
      } else if (attempts < maxAttempts) {
        setTimeout(checkVueFlow, 100);
      } else {
        console.warn('Single Scene UI: PanelManager not found after 5 seconds');
      }
    };

    setTimeout(checkVueFlow, 500);
  }

  // Handle project selection
  function setupProjectHandler() {
    // Listen for project changes
    window.addEventListener('project-selected', (e) => {
      const project = e.detail;
      if (project && window.PanelManager) {
        // Update project panel data
        const projectPanel = PanelManager.getPanelByType('project');
        if (projectPanel) {
          PanelManager.updatePanelData(projectPanel.id, {
            data: {
              name: project.name || 'Unknown',
              path: project.path || '',
              entities: project.entityCount || 0,
              sessions: project.sessionCount || 0,
              status: 'active'
            }
          });
          
          // Update VueFlow
          if (window.setFlowNodes) {
            window.setFlowNodes(PanelManager.getNodes());
          }
        }
        
        // Load project-specific panels
        PanelManager.loadFromProject(project.id);
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
