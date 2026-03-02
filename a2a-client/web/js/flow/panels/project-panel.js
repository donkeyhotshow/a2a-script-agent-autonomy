/**
 * Project Panel - Default panel showing project information
 * Displays: project name, path, entities count, sessions count, status
 */

const ProjectPanel = {
    /**
     * Render the project panel HTML
     */
    render(panelData) {
        const data = panelData?.data || {};
        const projectData = data.data || {};

        return `
      <div class="project-panel-content">
        <div class="project-info">
          <div class="project-field">
            <label>Name:</label>
            <span class="project-name">${this.escape(projectData.name || 'No project selected')}</span>
          </div>
          <div class="project-field">
            <label>Path:</label>
            <span class="project-path">${this.escape(projectData.path || '—')}</span>
          </div>
        </div>
        
        <div class="project-stats">
          <div class="stat-item">
            <span class="stat-value">${projectData.entities || 0}</span>
            <span class="stat-label">Entities</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${projectData.sessions || 0}</span>
            <span class="stat-label">Sessions</span>
          </div>
          <div class="stat-item">
            <span class="stat-value status-${projectData.status || 'idle'}">${projectData.status || 'idle'}</span>
            <span class="stat-label">Status</span>
          </div>
        </div>
        
        <div class="project-actions">
          <button class="btn-add-panel" id="addPanelBtn" title="Add new panel">
            + Add Panel
          </button>
        </div>
        
        <!-- Panel Type Selector (hidden by default) -->
        <div class="panel-type-selector" id="panelTypeSelector" style="display: none;">
          <div class="selector-title">Choose Panel:</div>
          <div class="panel-types">
            <button class="panel-type-btn" data-type="sessions">
              <span class="icon">📜</span>
              <span class="label">Sessions</span>
            </button>
            <button class="panel-type-btn" data-type="chat">
              <span class="icon">💬</span>
              <span class="label">Chat</span>
            </button>
            <button class="panel-type-btn" data-type="graph">
              <span class="icon">🔀</span>
              <span class="label">Graph</span>
            </button>
            <button class="panel-type-btn" data-type="actions">
              <span class="icon">⚡</span>
              <span class="label">Actions</span>
            </button>
          </div>
        </div>
      </div>
    `;
    },

    /**
     * Setup event listeners for the panel
     */
    setupEvents(panelId) {
        // Add panel button
        const addBtn = document.getElementById('addPanelBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                const selector = document.getElementById('panelTypeSelector');
                if (selector) {
                    selector.style.display = selector.style.display === 'none' ? 'block' : 'none';
                }
            });
        }

        // Panel type buttons
        const typeButtons = document.querySelectorAll('.panel-type-btn');
        typeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.currentTarget.dataset.type;
                if (type && window.PanelManager) {
                    // Check if panel type already exists
                    if (window.PanelManager.hasPanelType(type)) {
                        alert(`${type} panel already exists!`);
                        return;
                    }

                    // Add new panel
                    const newPanel = window.PanelManager.addPanel(type);

                    // Create edge from project panel to new panel
                    const projectPanel = window.PanelManager.getPanelByType('project');
                    if (projectPanel) {
                        window.PanelManager.connectPanels(projectPanel.id, newPanel.id);
                    }

                    // Update VueFlow
                    this.updateVueFlow();

                    // Hide selector
                    const selector = document.getElementById('panelTypeSelector');
                    if (selector) selector.style.display = 'none';
                }
            });
        });
    },

    /**
     * Update VueFlow with current panels
     */
    updateVueFlow() {
        if (window.setFlowNodes && window.setFlowEdges) {
            const nodes = window.PanelManager.getNodes();
            const edges = window.PanelManager.getEdges();

            window.setFlowNodes(nodes);
            window.setFlowEdges(edges);

            console.log('ProjectPanel: Updated VueFlow with', nodes.length, 'nodes');
        }
    },

    /**
     * Update panel data
     */
    update(panelId, projectData) {
        if (window.PanelManager) {
            window.PanelManager.updatePanelData(panelId, {data: projectData});
            this.updateVueFlow();
        }
    },

    /**
     * Escape HTML special characters
     */
    escape(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },
};

// Make available globally
window.ProjectPanel = ProjectPanel;
