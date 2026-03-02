/**
 * App Enhancements - Missing functionality for index.html
 * Implements: Command Palette, Node Editor, Export/Import, Undo/Redo, Activity Log, SSE Reconnection
 */

// ===== COMMAND PALETTE =====

const CommandPalette = {
    commands: [],
    resultsEl: null,
    inputEl: null,
    selectedIndex: 0,
    isOpen: false,

    init() {
        this.inputEl = document.getElementById('commandInput');
        this.resultsEl = document.getElementById('commandResults');

        if (!this.inputEl || !this.resultsEl) {
            console.warn('[CommandPalette] Elements not found');
            return;
        }

        // Register default commands
        this.registerDefaultCommands();

        // Setup event listeners
        this.setupEvents();
    },

    registerDefaultCommands() {
        this.commands = [
            // File commands
            {id: 'new-file', label: 'New File', category: 'File', action: () => this.showModal('nodeEditorModal')},
            {
                id: 'open-file',
                label: 'Open File',
                category: 'File',
                action: () => document.getElementById('docOpenForm')?.dispatchEvent(new Event('submit'))
            },
            {id: 'save-file', label: 'Save Graph', category: 'File', action: () => window.saveGraphState?.()},
            {id: 'import', label: 'Import Graph', category: 'File', action: () => this.showModal('importExportModal')},
            {id: 'export-json', label: 'Export as JSON', category: 'File', action: () => this.exportJSON()},
            {id: 'export-png', label: 'Export as PNG', category: 'File', action: () => this.exportPNG()},

            // Edit commands
            {id: 'undo', label: 'Undo', category: 'Edit', shortcut: 'Ctrl+Z', action: () => window.appState?.undo?.()},
            {
                id: 'redo',
                label: 'Redo',
                category: 'Edit',
                shortcut: 'Ctrl+Shift+Z',
                action: () => window.appState?.redo?.()
            },
            {
                id: 'copy-node',
                label: 'Copy Node',
                category: 'Edit',
                shortcut: 'Ctrl+C',
                action: () => this.copySelectedNode()
            },
            {
                id: 'paste-node',
                label: 'Paste Node',
                category: 'Edit',
                shortcut: 'Ctrl+V',
                action: () => this.pasteNode()
            },
            {
                id: 'delete-node',
                label: 'Delete Node',
                category: 'Edit',
                shortcut: 'Delete',
                action: () => this.deleteSelectedNode()
            },
            {
                id: 'duplicate-node',
                label: 'Duplicate Node',
                category: 'Edit',
                action: () => this.duplicateSelectedNode()
            },

            // View commands
            {
                id: 'zoom-in',
                label: 'Zoom In',
                category: 'View',
                shortcut: 'Ctrl++',
                action: () => window.flowManager?.zoomIn?.()
            },
            {
                id: 'zoom-out',
                label: 'Zoom Out',
                category: 'View',
                shortcut: 'Ctrl+-',
                action: () => window.flowManager?.zoomOut?.()
            },
            {
                id: 'fit-view',
                label: 'Fit View',
                category: 'View',
                shortcut: 'Ctrl+0',
                action: () => window.flowManager?.fitView?.()
            },
            {id: 'toggle-minimap', label: 'Toggle Minimap', category: 'View', action: () => this.toggleMinimap()},

            // Flow commands
            {
                id: 'new-task',
                label: 'New Task',
                category: 'Flow',
                shortcut: 'Ctrl+N',
                action: () => this.showModal('taskModal')
            },
            {id: 'clear-flow', label: 'Clear Flow', category: 'Flow', action: () => window.flowManager?.clear?.()},
            {id: 'load-demo', label: 'Load Demo', category: 'Flow', action: () => window.loadDemo?.('workflow')},

            // Settings commands
            {id: 'settings', label: 'Settings', category: 'Settings', action: () => this.showModal('settingsModal')},
            {
                id: 'sessions',
                label: 'Manage Sessions',
                category: 'Settings',
                action: () => this.showModal('sessionsModal')
            },
            {
                id: 'projects',
                label: 'Manage Projects',
                category: 'Settings',
                action: () => this.showModal('projectsModal')
            },

            // Help commands
            {id: 'shortcuts', label: 'Keyboard Shortcuts', category: 'Help', action: () => this.showShortcuts()},
        ];
    },

    setupEvents() {
        // Input handler
        this.inputEl?.addEventListener('input', (e) => {
            this.filterCommands(e.target.value);
        });

        // Keyboard navigation
        this.inputEl?.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.selectNext();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.selectPrev();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                this.executeSelected();
            } else if (e.key === 'Escape') {
                this.close();
            }
        });

        // Global shortcut to open palette
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.open();
            }
        });
    },

    open() {
        const palette = document.getElementById('commandPalette');
        if (palette) {
            palette.style.display = 'block';
            this.inputEl?.focus();
            this.filterCommands('');
            this.isOpen = true;
        }
    },

    close() {
        const palette = document.getElementById('commandPalette');
        if (palette) {
            palette.style.display = 'none';
            this.isOpen = false;
        }
    },

    filterCommands(query) {
        if (!this.resultsEl) return;

        const filtered = this.commands.filter(cmd => {
            const searchText = `${cmd.label} ${cmd.category}`.toLowerCase();
            return searchText.includes(query.toLowerCase());
        });

        this.selectedIndex = 0;
        this.renderResults(filtered);
    },

    renderResults(commands) {
        if (!this.resultsEl) return;

        if (commands.length === 0) {
            this.resultsEl.innerHTML = '<div class="command-no-results">No commands found</div>';
            return;
        }

        this.resultsEl.innerHTML = commands.map((cmd, i) => `
      <div class="command-item${i === this.selectedIndex ? ' selected' : ''}" data-index="${i}">
        <span class="command-label">${cmd.label}</span>
        <span class="command-category">${cmd.category}</span>
        ${cmd.shortcut ? `<kbd class="command-shortcut">${cmd.shortcut}</kbd>` : ''}
      </div>
    `).join('');

        // Add click handlers
        this.resultsEl.querySelectorAll('.command-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                this.selectedIndex = index;
                this.executeSelected();
            });
        });
    },

    selectNext() {
        const items = this.resultsEl?.querySelectorAll('.command-item') || [];
        if (items.length === 0) return;

        this.selectedIndex = (this.selectedIndex + 1) % items.length;
        this.updateSelection();
    },

    selectPrev() {
        const items = this.resultsEl?.querySelectorAll('.command-item') || [];
        if (items.length === 0) return;

        this.selectedIndex = (this.selectedIndex - 1 + items.length) % items.length;
        this.updateSelection();
    },

    updateSelection() {
        this.resultsEl?.querySelectorAll('.command-item').forEach((item, i) => {
            item.classList.toggle('selected', i === this.selectedIndex);
        });
    },

    executeSelected() {
        const items = this.resultsEl?.querySelectorAll('.command-item') || [];
        if (items.length === 0 || !items[this.selectedIndex]) return;

        const cmd = this.commands.find((_, i) => i === this.selectedIndex);
        if (cmd) {
            cmd.action?.();
            this.close();
        }
    },

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
        }
    },

    // Node operations
    copySelectedNode() {
        const selected = document.querySelector('.vue-flow__node.selected');
        if (selected) {
            window.copyNode?.(selected.id);
        }
    },

    pasteNode() {
        window.pasteNode?.();
    },

    deleteSelectedNode() {
        const selected = document.querySelector('.vue-flow__node.selected');
        if (selected) {
            window.flowManager?.removeNode?.(selected.id);
        }
    },

    duplicateSelectedNode() {
        const selected = document.querySelector('.vue-flow__node.selected');
        if (selected) {
            window.duplicateNode?.(selected.id);
        }
    },

    toggleMinimap() {
        const minimap = document.querySelector('.vue-flow__minimap');
        if (minimap) {
            minimap.style.display = minimap.style.display === 'none' ? 'block' : 'none';
        }
    },

    // Export functions
    exportJSON() {
        const state = window.flowManager?.currentFlow;
        if (!state) return;

        const data = JSON.stringify({
            nodes: state.nodes || [],
            edges: state.edges || [],
            viewport: window.flowManager?.getViewport?.() || {},
            exportedAt: new Date().toISOString()
        }, null, 2);

        const blob = new Blob([data], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flow-graph-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },

    async exportPNG() {
        const container = document.getElementById('vueflow-graph');
        if (!container) return;

        try {
            const vueflow = window.flowManager?.vueflow;
            if (vueflow?.exportToPNG) {
                await vueflow.exportToPNG('flow-graph');
            } else {
                alert('PNG export not fully implemented. Use JSON export for backup.');
            }
        } catch (e) {
            console.error('PNG export failed:', e);
        }
    },

    showShortcuts() {
        const shortcuts = [
            ['Ctrl+K', 'Open command palette'],
            ['Ctrl+Enter', 'Submit task'],
            ['Ctrl+Z', 'Undo'],
            ['Ctrl+Shift+Z', 'Redo'],
            ['Ctrl+S', 'Save state'],
            ['Ctrl+C', 'Copy node'],
            ['Ctrl+V', 'Paste node'],
            ['Delete', 'Delete node'],
            ['Escape', 'Close modal'],
        ];

        alert('Keyboard Shortcuts:\n\n' + shortcuts.map(([k, v]) => `${k}: ${v}`).join('\n'));
    }
};


// ===== NODE EDITOR =====

const NodeEditor = {
    currentNode: null,

    init() {
        document.getElementById('saveNodeEdit')?.addEventListener('click', () => this.save());
        document.getElementById('cancelNodeEdit')?.addEventListener('click', () => this.cancel());
        document.getElementById('closeNodeEditor')?.addEventListener('click', () => this.cancel());
    },

    open(nodeId) {
        const nodes = window.flowManager?.currentFlow?.nodes || [];
        const node = nodes.find(n => n.id === nodeId);

        if (!node) {
            console.warn('[NodeEditor] Node not found:', nodeId);
            return;
        }

        this.currentNode = node;

        // Populate form
        document.getElementById('nodeEditorId').value = node.id;
        document.getElementById('nodeEditorLabel').value = node.data?.label || '';
        document.getElementById('nodeEditorType').value = node.type || 'default';
        document.getElementById('nodeEditorDescription').value = node.data?.description || '';
        document.getElementById('nodeEditorPosX').value = node.position?.x || 0;
        document.getElementById('nodeEditorPosY').value = node.position?.y || 0;

        // Show modal
        document.getElementById('nodeEditorModal').style.display = 'flex';
    },

    save() {
        if (!this.currentNode) return;

        const updates = {
            label: document.getElementById('nodeEditorLabel').value,
            type: document.getElementById('nodeEditorType').value,
            description: document.getElementById('nodeEditorDescription').value,
            position: {
                x: parseInt(document.getElementById('nodeEditorPosX').value) || 0,
                y: parseInt(document.getElementById('nodeEditorPosY').value) || 0
            }
        };

        window.flowManager?.updateNode?.(this.currentNode.id, updates);
        this.cancel();

        window.addNotification?.('Node updated', 'success');
    },

    cancel() {
        document.getElementById('nodeEditorModal').style.display = 'none';
        this.currentNode = null;
    }
};


// ===== UNDO/REDO SYSTEM =====

const UndoRedoManager = {
    undoStack: [],
    redoStack: [],
    maxHistory: 50,

    init() {
        window.appState?.on('nodes', ({value, oldValue}) => {
            if (oldValue && JSON.stringify(value) !== JSON.stringify(oldValue)) {
                this.pushUndo({
                    type: 'nodes',
                    oldValue: JSON.parse(JSON.stringify(oldValue)),
                    newValue: JSON.parse(JSON.stringify(value))
                });
            }
        });
    },

    pushUndo(action) {
        this.undoStack.push(action);
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }
        this.redoStack = [];
    },

    undo() {
        if (this.undoStack.length === 0) {
            console.log('[UndoRedo] Nothing to undo');
            return false;
        }

        const action = this.undoStack.pop();
        this.redoStack.push(action);

        switch (action.type) {
            case 'nodes':
                window.appState?.set('nodes', action.oldValue);
                window.flowManager?.render?.();
                break;
        }

        console.log('[UndoRedo] Undo:', action.type);
        return true;
    },

    redo() {
        if (this.redoStack.length === 0) {
            console.log('[UndoRedo] Nothing to redo');
            return false;
        }

        const action = this.redoStack.pop();
        this.undoStack.push(action);

        switch (action.type) {
            case 'nodes':
                window.appState?.set('nodes', action.newValue);
                window.flowManager?.render?.();
                break;
        }

        console.log('[UndoRedo] Redo:', action.type);
        return true;
    }
};


// ===== ACTIVITY LOG =====

const ActivityLog = {
    logs: [],
    maxLogs: 100,

    init() {
        document.getElementById('closeActivityLog')?.addEventListener('click', () => {
            document.getElementById('activityLogPanel').style.display = 'none';
        });

        this.connectToSSE();
    },

    connectToSSE() {
        if (window.SSEClient) {
            const events = ['log', 'progress', 'task_response', 'action_proposal', 'step_result', 'complete', 'error'];

            events.forEach(event => {
                window.SSEClient.on(event, (data) => {
                    this.addLog({
                        type: event,
                        data,
                        timestamp: new Date()
                    });
                });
            });
        }
    },

    addLog(entry) {
        this.logs.unshift(entry);
        if (this.logs.length > this.maxLogs) {
            this.logs.pop();
        }
        this.render();
    },

    render() {
        const container = document.getElementById('activityLogContent');
        if (!container) return;

        container.innerHTML = this.logs.map(log => `
      <div class="activity-log-item activity-${log.type}">
        <span class="activity-time">${log.timestamp.toLocaleTimeString()}</span>
        <span class="activity-type">${log.type}</span>
        <span class="activity-message">${this.formatMessage(log)}</span>
      </div>
    `).join('');
    },

    formatMessage(log) {
        if (log.data?.message) return log.data.message.substring(0, 100);
        if (log.data?.title) return log.data.title;
        return JSON.stringify(log.data || {}).substring(0, 50);
    },

    clear() {
        this.logs = [];
        this.render();
    },

    show() {
        document.getElementById('activityLogPanel').style.display = 'block';
    }
};


// ===== SSE RECONNECTION =====

const SSEReconnection = {
    attempts: 0,
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    currentDelay: 1000,
    isReconnecting: false,
    currentSessionId: null,

    init() {
        if (window.SSEClient) {
            window.SSEClient.on('disconnected', (data) => {
                this.handleDisconnect(data);
            });

            window.SSEClient.on('error', (data) => {
                this.handleError(data);
            });
        }
    },

    handleDisconnect(data) {
        if (this.isReconnecting) return;

        console.log('[SSE Reconnect] Connection lost, attempting to reconnect...');
        this.attemptReconnect();
    },

    handleError(data) {
        console.error('[SSE Reconnect] Error:', data);

        if (data?.message?.includes('connection') || data?.status >= 500) {
            this.attemptReconnect();
        }
    },

    attemptReconnect() {
        if (this.attempts >= this.maxAttempts) {
            console.error('[SSE Reconnect] Max attempts reached');
            window.addNotification?.('Connection lost. Please refresh the page.', 'error');
            return;
        }

        this.isReconnecting = true;
        this.attempts++;

        const delay = Math.min(this.currentDelay * Math.pow(2, this.attempts - 1), this.maxDelay);

        console.log(`[SSE Reconnect] Attempt ${this.attempts}/${this.maxAttempts} in ${delay}ms`);

        setTimeout(() => {
            if (this.currentSessionId && window.SSEClient) {
                try {
                    window.SSEClient.connect(this.currentSessionId);
                    console.log('[SSE Reconnect] Reconnection initiated');
                } catch (e) {
                    console.error('[SSE Reconnect] Failed:', e);
                }
            }
            this.isReconnecting = false;
        }, delay);
    },

    setSession(sessionId) {
        this.currentSessionId = sessionId;
        this.attempts = 0;
        this.currentDelay = this.baseDelay;
    }
};


// ===== IMPORT FUNCTIONALITY =====

const ImportExport = {
    init() {
        document.getElementById('exportJSON')?.addEventListener('click', () => this.exportJSON());
        document.getElementById('exportPNG')?.addEventListener('click', () => this.exportPNG());
        document.getElementById('importJSON')?.addEventListener('click', () => this.importJSON());
    },

    exportJSON() {
        const state = window.flowManager?.currentFlow;
        if (!state) return;

        const data = JSON.stringify({
            nodes: state.nodes || [],
            edges: state.edges || [],
            viewport: window.flowManager?.getViewport?.() || {},
            exportedAt: new Date().toISOString(),
            version: '1.0'
        }, null, 2);

        const blob = new Blob([data], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flow-graph-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        window.addNotification?.('Graph exported as JSON', 'success');
    },

    async exportPNG() {
        const vueflow = window.flowManager?.vueflow;

        if (vueflow && vueflow.viewport) {
            try {
                const container = document.getElementById('vueflow-graph');
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                alert('PNG export captures the current view. Consider using browser screenshot for now.');
            } catch (e) {
                console.error('PNG export error:', e);
            }
        } else {
            alert('No graph to export');
        }
    },

    importJSON() {
        const input = document.getElementById('importFile');
        const file = input?.files?.[0];

        if (!file) {
            window.addNotification?.('Please select a file', 'warning');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                if (data.nodes) {
                    window.flowManager?.currentFlow?.set?.({
                        nodes: data.nodes,
                        edges: data.edges || []
                    });
                    window.flowManager?.render?.();

                    window.addNotification?.(`Imported ${data.nodes.length} nodes`, 'success');
                }
            } catch (err) {
                console.error('Import error:', err);
                window.addNotification?.('Invalid JSON file', 'error');
            }
        };
        reader.readAsText(file);

        if (input) input.value = '';
    }
};


// ===== NODE DRAG FROM SIDEBAR =====

const NodeDragDrop = {
    init() {
        const dropZone = document.getElementById('vueflow-graph');
        if (!dropZone) return;

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');

            const nodeType = e.dataTransfer.getData('node-type');
            if (nodeType) {
                const rect = dropZone.getBoundingClientRect();
                const position = {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                };
                this.createNode(nodeType, position);
            }
        });
    },

    createNode(type, position) {
        const nodeTypes = {
            'task': {label: 'Task', type: 'task_request', color: '#3b82f6'},
            'action': {label: 'Action', type: 'action_proposal', color: '#8b5cf6'},
            'result': {label: 'Result', type: 'step_result', color: '#10b981'},
            'agent': {label: 'Agent', type: 'agent', color: '#f59e0b'}
        };

        const config = nodeTypes[type];
        if (!config) return;

        const node = {
            id: `${type}-${Date.now()}`,
            type: config.type,
            position,
            data: {
                label: config.label,
                status: 'pending',
                timestamp: new Date().toISOString()
            }
        };

        window.flowManager?.currentFlow?.nodes?.push(node);
        window.flowManager?.render?.();
    }
};


// ===== ENHANCED KEYBOARD SHORTCUTS =====

const EnhancedShortcuts = {
    init() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                CommandPalette.open();
            }

            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
                e.preventDefault();
                CommandPalette.open();
            }

            if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
                e.preventDefault();
                const index = parseInt(e.key) - 1;
                const commands = CommandPalette.commands.filter(c => c.category === 'File');
                if (commands[index]) {
                    commands[index].action();
                }
            }
        });
    }
};


// ===== PROJECT MANAGEMENT =====

const ProjectManager = {
    projects: [],
    currentProject: null,

    init() {
        document.getElementById('newProjectBtn')?.addEventListener('click', () => this.createProject());
        document.getElementById('projectSearch')?.addEventListener('input', (e) => this.filterProjects(e.target.value));
    },

    async loadProjects() {
        const container = document.getElementById('projectsGrid');
        if (!container) return;

        try {
            const response = await fetch('/api/v1/projects');
            this.projects = await response.json();
            this.renderProjects();
        } catch (e) {
            container.innerHTML = '<div class="error">Failed to load projects</div>';
        }
    },

    renderProjects(filter = '') {
        const container = document.getElementById('projectsGrid');
        if (!container) return;

        const filtered = this.projects.filter(p =>
            p.name?.toLowerCase().includes(filter.toLowerCase())
        );

        container.innerHTML = filtered.map(project => `
      <div class="project-card" data-id="${project.id}">
        <div class="project-name">${project.name}</div>
        <div class="project-meta">${project.description || 'No description'}</div>
        <div class="project-actions">
          <button class="btn-open" data-id="${project.id}">Open</button>
          <button class="btn-delete" data-id="${project.id}">Delete</button>
        </div>
      </div>
    `).join('');

        container.querySelectorAll('.btn-open').forEach(btn => {
            btn.addEventListener('click', () => this.openProject(btn.dataset.id));
        });
    },

    filterProjects(query) {
        this.renderProjects(query);
    },

    async createProject() {
        const name = prompt('Enter project name:');
        if (!name) return;

        try {
            const response = await fetch('/api/v1/projects', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({name, description: ''})
            });

            const project = await response.json();
            this.projects.unshift(project);
            this.renderProjects();
            window.addNotification?.('Project created', 'success');
        } catch (e) {
            window.addNotification?.('Failed to create project', 'error');
        }
    },

    async openProject(projectId) {
        this.currentProject = this.projects.find(p => p.id === projectId);
        window.appState?.set('project', this.currentProject);
        document.getElementById('projectsModal').style.display = 'none';
        window.addNotification?.(`Opened project: ${this.currentProject.name}`, 'success');
    }
};


// ===== INITIALIZE ALL ENHANCEMENTS =====

function initEnhancements() {
    console.log('[Enhancements] Initializing...');

    CommandPalette.init();
    NodeEditor.init();
    UndoRedoManager.init();
    ActivityLog.init();
    SSEReconnection.init();
    ImportExport.init();
    NodeDragDrop.init();
    EnhancedShortcuts.init();
    ProjectManager.init();

    console.log('[Enhancements] Initialized');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEnhancements);
} else {
    initEnhancements();
}

// Make available globally
if (typeof window !== 'undefined') {
    window.CommandPalette = CommandPalette;
    window.NodeEditor = NodeEditor;
    window.UndoRedoManager = UndoRedoManager;
    window.ActivityLog = ActivityLog;
    window.SSEReconnection = SSEReconnection;
    window.ImportExport = ImportExport;
    window.NodeDragDrop = NodeDragDrop;
    window.EnhancedShortcuts = EnhancedShortcuts;
    window.ProjectManager = ProjectManager;
    window.initEnhancements = initEnhancements;
}
