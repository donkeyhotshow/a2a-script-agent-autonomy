/**
 * Panel Manager - Manages all panels on the VueFlow canvas
 * Handles: add, remove, connect, save, load panels
 */

const PanelManager = {
    // State
    state: {
        panels: new Map(), // id -> panel data
        connections: [], // array of { from, to }
        selectedPanel: null,
    },

    // API endpoint
    api: '/api/v1',

    /**
     * Initialize the panel manager
     */
    init() {
        console.log('PanelManager: Initializing...');
        this.setupEventListeners();
    },

    /**
     * Setup event listeners for panel interactions
     */
    setupEventListeners() {
        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' && this.state.selectedPanel) {
                this.removePanel(this.state.selectedPanel);
            }
        });
    },

    /**
     * Add a new panel to the canvas
     */
    addPanel(type, position = null) {
        const id = `${type}-panel-${Date.now()}`;

        // Default positions for new panels
        const defaultPositions = {
            project: {x: 50, y: 100},
            sessions: {x: 400, y: 50},
            chat: {x: 800, y: 50},
            graph: {x: 400, y: 400},
            actions: {x: 800, y: 400},
        };

        const pos = position || defaultPositions[type] || {
            x: 100 + Math.random() * 200,
            y: 100 + Math.random() * 200
        };

        const panelData = {
            id,
            type: 'default',
            position: pos,
            data: {
                label: this.getPanelConfig(type).title,
                ...this.getPanelConfig(type),
            },
        };

        this.state.panels.set(id, panelData);

        console.log(`PanelManager: Added ${type} panel at`, pos);

        return panelData;
    },

    /**
     * Get panel configuration by type
     */
    getPanelConfig(type) {
        const configs = {
            project: {
                icon: '📁',
                title: 'Project',
                panelType: 'project',
                showFooter: true,
                data: {
                    name: 'No project selected',
                    path: '',
                    entities: 0,
                    sessions: 0,
                    status: 'idle',
                },
            },
            sessions: {
                icon: '📜',
                title: 'Sessions',
                panelType: 'sessions',
                showFooter: true,
                data: {
                    sessions: [],
                    filter: 'all',
                },
            },
            chat: {
                icon: '💬',
                title: 'Chat',
                panelType: 'chat',
                showFooter: true,
                data: {
                    messages: [],
                    currentSession: null,
                },
            },
            graph: {
                icon: '🔀',
                title: 'Protocol Flow',
                panelType: 'graph',
                showFooter: true,
                data: {
                    nodes: [],
                    edges: [],
                },
            },
            actions: {
                icon: '⚡',
                title: 'Actions',
                panelType: 'actions',
                showFooter: true,
                data: {
                    currentAction: null,
                    steps: [],
                    logs: [],
                    status: 'idle',
                },
            },
        };

        return configs[type] || configs.project;
    },

    /**
     * Remove a panel from the canvas
     */
    removePanel(panelId) {
        if (!this.state.panels.has(panelId)) return;

        const panel = this.state.panels.get(panelId);

        // Don't allow removing project panel
        if (panel.data.panelType === 'project') {
            console.warn('PanelManager: Cannot remove project panel');
            return;
        }

        // Remove connections involving this panel
        this.state.connections = this.state.connections.filter(
            c => c.from !== panelId && c.to !== panelId
        );

        this.state.panels.delete(panelId);
        console.log(`PanelManager: Removed panel ${panelId}`);
    },

    /**
     * Update panel position
     */
    updatePanelPosition(panelId, position) {
        const panel = this.state.panels.get(panelId);
        if (panel) {
            panel.position = position;
        }
    },

    /**
     * Update panel data
     */
    updatePanelData(panelId, data) {
        const panel = this.state.panels.get(panelId);
        if (panel) {
            panel.data = {...panel.data, ...data};
        }
    },

    /**
     * Connect two panels
     */
    connectPanels(fromId, toId) {
        // Check if connection already exists
        const exists = this.state.connections.some(
            c => c.from === fromId && c.to === toId
        );

        if (exists) {
            console.warn('PanelManager: Connection already exists');
            return;
        }

        this.state.connections.push({from: fromId, to: toId});
        console.log(`PanelManager: Connected ${fromId} -> ${toId}`);
    },

    /**
     * Remove connection between panels
     */
    disconnectPanels(fromId, toId) {
        this.state.connections = this.state.connections.filter(
            c => !(c.from === fromId && c.to === toId)
        );
    },

    /**
     * Get all panels as VueFlow nodes
     */
    getNodes() {
        return Array.from(this.state.panels.values());
    },

    /**
     * Get all connections as VueFlow edges
     */
    getEdges() {
        return this.state.connections.map((conn, index) => ({
            id: `edge-${index}`,
            source: conn.from,
            target: conn.to,
            type: 'smoothstep',
            animated: true,
            style: {stroke: '#58a6ff', strokeWidth: 2},
            markerEnd: {type: 'arrowclosed', color: '#58a6ff'},
        }));
    },

    /**
     * Get panel by type
     */
    getPanelByType(type) {
        for (const panel of this.state.panels.values()) {
            if (panel.data.panelType === type) {
                return panel;
            }
        }
        return null;
    },

    /**
     * Get panel by ID
     */
    getPanel(panelId) {
        return this.state.panels.get(panelId);
    },

    /**
     * Select a panel
     */
    selectPanel(panelId) {
        this.state.selectedPanel = panelId;
    },

    /**
     * Save panels configuration to project files
     */
    async saveToProject(projectId) {
        if (!projectId) {
            console.warn('PanelManager: No project selected, cannot save');
            return;
        }

        const config = {
            panels: Array.from(this.state.panels.values()).map(p => ({
                id: p.id,
                type: p.data.panelType,
                position: p.position,
                data: p.data,
            })),
            connections: this.state.connections,
        };

        try {
            const res = await fetch(`${this.api}/projects/${projectId}/files/.a2a/panels.json`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(config, null, 2),
            });

            if (res.ok) {
                console.log('PanelManager: Saved to project files');
            } else {
                console.error('PanelManager: Failed to save', res.status);
            }
        } catch (err) {
            console.error('PanelManager: Save error', err);
        }
    },

    /**
     * Load panels configuration from project files
     */
    async loadFromProject(projectId) {
        if (!projectId) {
            console.warn('PanelManager: No project selected');
            return;
        }

        try {
            const res = await fetch(`${this.api}/projects/${projectId}/files/.a2a/panels.json`);

            if (!res.ok) {
                console.log('PanelManager: No saved configuration, using defaults');
                this.loadDefaultPanels();
                return;
            }

            const config = await res.json();

            // Clear existing panels
            this.state.panels.clear();
            this.state.connections = [];

            // Load panels
            if (config.panels) {
                config.panels.forEach(p => {
                    this.state.panels.set(p.id, {
                        id: p.id,
                        type: 'panel',
                        position: p.position,
                        data: this.getPanelConfig(p.type),
                    });

                    // Override with saved data
                    const panel = this.state.panels.get(p.id);
                    if (panel && p.data) {
                        panel.data = {...panel.data, ...p.data};
                    }
                });
            }

            // Load connections
            if (config.connections) {
                this.state.connections = config.connections;
            }

            console.log('PanelManager: Loaded from project files');
        } catch (err) {
            console.log('PanelManager: Using default panels');
            this.loadDefaultPanels();
        }
    },

    /**
     * Load default panels (only project panel)
     */
    loadDefaultPanels() {
        this.state.panels.clear();
        this.state.connections = [];

        // Add only project panel by default
        this.addPanel('project', {x: 50, y: 100});
    },

    /**
     * Reset to default state
     */
    reset() {
        this.state.panels.clear();
        this.state.connections = [];
        this.state.selectedPanel = null;
        this.loadDefaultPanels();
    },

    /**
     * Get available panel types for adding
     */
    getAvailablePanelTypes() {
        return [
            {type: 'sessions', icon: '📜', title: 'Sessions', description: 'Session list and management'},
            {type: 'chat', icon: '💬', title: 'Chat', description: 'Chat with AI assistant'},
            {type: 'graph', icon: '🔀', title: 'Protocol Flow', description: 'Visual graph of protocol'},
            {type: 'actions', icon: '⚡', title: 'Actions', description: 'Action execution and progress'},
        ];
    },

    /**
     * Check if panel type already exists
     */
    hasPanelType(type) {
        for (const panel of this.state.panels.values()) {
            if (panel.data.panelType === type) {
                return true;
            }
        }
        return false;
    },
};

// Make available globally
window.PanelManager = PanelManager;

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PanelManager.init());
} else {
    PanelManager.init();
}
