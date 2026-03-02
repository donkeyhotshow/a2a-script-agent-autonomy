/**
 * App Boot - Unified Initialization System
 * Properly initializes all modules in correct order
 */

// Use window objects instead of imports
// import { appState } from './app-state.js';
// import { actionsManager } from './actions-manager.js';
// etc.

/**
 * App Boot - Main initialization coordinator
 */
const AppBoot = {
    // Configuration
    config: {
        serverUrl: 'http://localhost:8080/api/v1',
        useSSE: true,
        autoSave: true,
        showMinimap: true,
        theme: 'dark'
    },

    // Initialization state
    initialized: false,
    initOrder: [],

    /**
     * Main initialization function
     */
    async init(options = {}) {
        console.log('[AppBoot] Starting initialization...');

        // Merge config
        this.config = {...this.config, ...options};

        // Start initialization
        this.initialized = false;
        this.initOrder = [];

        try {
            // Phase 1: Core services
            await this._initCore();

            // Phase 2: Flow Manager
            await this._initFlow();

            // Phase 3: UI Components
            await this._initUI();

            // Phase 4: Enhancements
            await this._initEnhancements();

            // Phase 5: Event bindings
            await this._initEventBindings();

            // Phase 6: Restore state
            await this._restoreState();

            this.initialized = true;
            console.log('[AppBoot] Initialization complete!');
            console.log('[AppBoot] Init order:', this.initOrder);

            // Emit ready event
            this._emitReady();

            return true;
        } catch (error) {
            console.error('[AppBoot] Initialization failed:', error);
            return false;
        }
    },

    /**
     * Phase 1: Initialize core services
     */
    async _initCore() {
        console.log('[AppBoot] Phase 1: Core services...');

        // Register init
        this._registerInit('appState');

        // Initialize Actions Manager
        if (window.actionsManager) {
            await window.actionsManager.init();
        }
        this._registerInit('actionsManager');

        // Initialize UI Manager
        if (window.uiManager) {
            window.uiManager.init('#app');
        }
        this._registerInit('uiManager');

        // Configure API
        if (window.apiIntegration) {
            window.apiIntegration.configure({
                serverUrl: this.config.serverUrl,
                useSSE: this.config.useSSE
            });
        }
        this._registerInit('apiIntegration');

        console.log('[AppBoot] Core services ready');
    },

    /**
     * Phase 2: Initialize Flow Manager
     */
    async _initFlow() {
        console.log('[AppBoot] Phase 2: Flow Manager...');

        // Initialize VueFlow
        if (window.initFlow) {
            window.initFlow({
                serverUrl: this.config.serverUrl,
                useSSE: this.config.useSSE
            });
        }

        // Configure A2A client
        if (window.configureClient) {
            window.configureClient({
                serverUrl: this.config.serverUrl
            });
        }

        // Setup flow event handlers
        this._setupFlowHandlers();

        this._registerInit('flowManager');
        console.log('[AppBoot] Flow Manager ready');
    },

    /**
     * Phase 3: Initialize UI Components
     */
    async _initUI() {
        console.log('[AppBoot] Phase 3: UI Components...');

        // Setup modals
        this._setupModals();

        // Setup toolbar
        this._setupToolbar();

        // Setup panels
        this._setupPanels();

        // Setup notifications
        this._setupNotifications();

        this._registerInit('ui');
        console.log('[AppBoot] UI Components ready');
    },

    /**
     * Phase 4: Initialize Enhancements
     */
    async _initEnhancements() {
        console.log('[AppBoot] Phase 4: Enhancements...');

        // Initialize enhancements if available
        if (typeof window.initEnhancements === 'function') {
            window.initEnhancements();
            this._registerInit('enhancements');
        }

        // Initialize graph improvements if available
        if (typeof window.initGraphImprovements === 'function') {
            window.initGraphImprovements();
            this._registerInit('graphImprovements');
        }

        // Initialize Action Panel if available
        if (window.actionPanel) {
            window.actionPanel.init();
            this._registerInit('actionPanel');
        }

        console.log('[AppBoot] Enhancements ready');
    },

    /**
     * Phase 5: Initialize Event Bindings
     */
    async _initEventBindings() {
        console.log('[AppBoot] Phase 5: Event Bindings...');

        // Keyboard shortcuts
        this._setupKeyboardShortcuts();

        // Context menu
        this._setupContextMenu();

        // Drag and drop
        this._setupDragDrop();

        // Auto-save
        if (this.config.autoSave) {
            this._setupAutoSave();
        }

        this._registerInit('events');
        console.log('[AppBoot] Event Bindings ready');
    },

    /**
     * Phase 6: Restore saved state
     */
    async _restoreState() {
        console.log('[AppBoot] Phase 6: Restore State...');

        // Load settings
        this._loadSettings();

        // Restore graph if available
        this._restoreGraphState();

        this._registerInit('state');
        console.log('[AppBoot] State restored');
    },

    /**
     * Setup Flow event handlers
     */
    _setupFlowHandlers() {
        const flowManager = window.flowManager;

        // Connect flow events to app state
        if (flowManager) {
            // On complete
            flowManager.onComplete?.((data) => {
                this._showNotification('Task completed!', 'success');
            });

            // On error
            flowManager.onError?.((error) => {
                this._showNotification('Error: ' + error.message, 'error');
            });
        }
    },

    /**
     * Setup modals
     */
    _setupModals() {
        // Task Modal
        const taskModal = document.getElementById('taskModal');
        if (taskModal) {
            document.getElementById('closeTaskModal')?.addEventListener('click', () => {
                taskModal.style.display = 'none';
            });

            document.getElementById('cancelTask')?.addEventListener('click', () => {
                taskModal.style.display = 'none';
            });

            document.getElementById('submitTask')?.addEventListener('click', () => {
                this._submitTask();
            });

            taskModal.addEventListener('click', (e) => {
                if (e.target === taskModal) taskModal.style.display = 'none';
            });
        }

        // Settings Modal
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
            document.getElementById('closeSettingsModal')?.addEventListener('click', () => {
                settingsModal.style.display = 'none';
            });

            document.getElementById('cancelSettings')?.addEventListener('click', () => {
                settingsModal.style.display = 'none';
            });

            document.getElementById('saveSettings')?.addEventListener('click', () => {
                this._saveSettings();
                settingsModal.style.display = 'none';
            });

            settingsModal.addEventListener('click', (e) => {
                if (e.target === settingsModal) settingsModal.style.display = 'none';
            });
        }
    },

    /**
     * Setup toolbar
     */
    _setupToolbar() {
        const flowManager = window.flowManager;

        // Graph toolbar buttons
        const graphZoomIn = document.getElementById('graphZoomIn');
        const graphZoomOut = document.getElementById('graphZoomOut');
        const graphFitView = document.getElementById('graphFitView');
        const graphUndo = document.getElementById('graphUndo');
        const graphRedo = document.getElementById('graphRedo');

        graphZoomIn?.addEventListener('click', () => flowManager?.zoomIn());
        graphZoomOut?.addEventListener('click', () => flowManager?.zoomOut());
        graphFitView?.addEventListener('click', () => flowManager?.fitView());

        graphUndo?.addEventListener('click', () => {
            if (window.UndoRedoManager) {
                window.UndoRedoManager.undo();
            }
        });

        graphRedo?.addEventListener('click', () => {
            if (window.UndoRedoManager) {
                window.UndoRedoManager.redo();
            }
        });

        // Action Panel button
        const actionPanelBtn = document.getElementById('graphActionPanel');
        actionPanelBtn?.addEventListener('click', () => {
            if (window.actionPanel) {
                window.actionPanel.toggle();
            }
        });

        // Auto Layout button
        const autoLayoutBtn = document.getElementById('graphAutoLayout');
        autoLayoutBtn?.addEventListener('click', () => {
            if (window.graphLayout && flowManager) {
                window.graphLayout.applyDagreLayout(flowManager);
                this._showNotification('Auto layout applied', 'success');
            }
        });
    },

    /**
     * Setup panels
     */
    _setupPanels() {
        // Activity Log Panel
        const activityLogPanel = document.getElementById('activityLogPanel');
        if (activityLogPanel) {
            document.getElementById('closeActivityLog')?.addEventListener('click', () => {
                activityLogPanel.style.display = 'none';
            });
        }

        // Properties Panel
        const propertiesPanel = document.getElementById('propertiesPanel');
        if (propertiesPanel) {
            document.getElementById('closePropertiesPanel')?.addEventListener('click', () => {
                propertiesPanel.style.display = 'none';
            });
        }

        // Console Panel
        const consolePanel = document.getElementById('consolePanel');
        if (consolePanel) {
            document.getElementById('closeConsolePanel')?.addEventListener('click', () => {
                consolePanel.style.display = 'none';
            });
        }

        // Notifications Panel
        const notificationsPanel = document.getElementById('notificationsPanel');
        if (notificationsPanel) {
            document.getElementById('clearNotifications')?.addEventListener('click', () => {
                this._clearNotifications();
            });
        }

        // Command Palette
        const commandPalette = document.getElementById('commandPalette');
        if (commandPalette) {
            const commandInput = document.getElementById('commandInput');
            commandInput?.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    commandPalette.style.display = 'none';
                }
            });
        }
    },

    /**
     * Setup notifications
     */
    _setupNotifications() {
        // Global notification function
        window.addNotification = (message, type = 'info') => {
            this._addNotification(message, type);
        };

        // Global Toast notification function (using uiManager if available)
        window.showToast = (message, type = 'info', options = {}) => {
            const {duration = 3000, position = 'top-right'} = options;

            // Try to use uiManager's createToast if available
            if (window.uiManager?.createToast) {
                const toast = window.uiManager.createToast(message, {type});
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), duration);
                return;
            }

            // Fallback: Create toast manually
            this._createToastElement(message, type, duration, position);
        };

        // Error Boundary setup
        this._setupErrorBoundary();
    },

    /**
     * Create toast element manually
     */
    _createToastElement(message, type, duration, position) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
      <span class="toast-icon">${this._getToastIcon(type)}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close">&times;</button>
    `;

        // Position
        toast.style.position = 'fixed';
        switch (position) {
            case 'top-left':
                toast.style.top = '20px';
                toast.style.left = '20px';
                break;
            case 'top-right':
                toast.style.top = '20px';
                toast.style.right = '20px';
                break;
            case 'bottom-left':
                toast.style.bottom = '20px';
                toast.style.left = '20px';
                break;
            case 'bottom-right':
                toast.style.bottom = '20px';
                toast.style.right = '20px';
                break;
            default:
                toast.style.top = '20px';
                toast.style.right = '20px';
        }

        // Close button
        toast.querySelector('.toast-close')?.addEventListener('click', () => {
            toast.remove();
        });

        document.body.appendChild(toast);

        // Auto-remove
        setTimeout(() => {
            toast.classList.add('toast-fade-out');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    /**
     * Get toast icon by type
     */
    _getToastIcon(type) {
        const icons = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    },

    /**
     * Setup Error Boundary
     */
    _setupErrorBoundary() {
        // Global error handler for uncaught errors
        window.onerror = (message, source, lineno, colno, error) => {
            console.error('[Global Error]', {message, source, lineno, colno, error});
            this._handleError(error || new Error(message), {source, lineno, colno});
            return false; // Let default error handling continue
        };

        // Unhandled promise rejection handler
        window.onunhandledrejection = (event) => {
            console.error('[Unhandled Promise Rejection]', event.reason);
            this._handleError(event.reason, {type: 'unhandled-rejection'});
        };
    },

    /**
     * Handle error with user-friendly message
     */
    _handleError(error, context = {}) {
        const errorMessage = error?.message || String(error);

        // Log to console
        console.error('[AppBoot] Error:', errorMessage, context);

        // Show toast notification
        this._showErrorToast(errorMessage);

        // Emit error event for other components
        document.dispatchEvent(new CustomEvent('appError', {
            detail: {error, context, message: errorMessage}
        }));
    },

    /**
     * Show error toast
     */
    _showErrorToast(message) {
        // Truncate long messages
        const displayMessage = message.length > 100
            ? message.substring(0, 100) + '...'
            : message;

        window.showToast?.(displayMessage, 'error', {duration: 5000});
    },

    /**
     * Setup keyboard shortcuts
     */
    _setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                // Except for Escape
                if (e.key !== 'Escape') return;
            }

            // Ctrl/Cmd + K - Command Palette
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                window.CommandPalette?.open();
            }

            // Ctrl/Cmd + Enter - Submit task
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('submitTask')?.click();
            }

            // Ctrl/Cmd + Z - Undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                window.UndoRedoManager?.undo();
            }

            // Ctrl/Cmd + Shift + Z - Redo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
                e.preventDefault();
                window.UndoRedoManager?.redo();
            }

            // Ctrl/Cmd + S - Save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this._saveGraphState();
                this._showNotification('State saved', 'success');
            }

            // Delete - Delete selected node
            if (e.key === 'Delete') {
                const selected = document.querySelector('.vue-flow__node.selected');
                if (selected) {
                    window.flowManager?.removeNode?.(selected.id);
                }
            }

            // Escape - Close modals
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.style.display = 'none';
                });
                document.getElementById('commandPalette')?.style.display = 'none';
                document.getElementById('contextMenu')?.style.display = 'none';
            }
        });
    },

    /**
     * Setup context menu
     */
    _setupContextMenu() {
        document.addEventListener('contextmenu', (e) => {
            const node = e.target.closest('.vue-flow__node');
            if (node) {
                e.preventDefault();
                this._showContextMenu(e.clientX, e.clientY, node.id);
            }
        });
    },

    /**
     * Show context menu
     */
    _showContextMenu(x, y, nodeId) {
        const menu = document.getElementById('contextMenu');
        if (!menu) return;

        menu.style.display = 'block';
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.dataset.nodeId = nodeId;

        // Handle menu actions
        menu.onclick = (e) => {
            const action = e.target.closest('li')?.dataset.action;
            if (action) {
                this._handleContextAction(action, nodeId);
                menu.style.display = 'none';
            }
        };
    },

    /**
     * Handle context menu action
     */
    _handleContextAction(action, nodeId) {
        const flowManager = window.flowManager;

        switch (action) {
            case 'edit':
                window.NodeEditor?.open(nodeId);
                break;
            case 'delete':
                flowManager?.removeNode?.(nodeId);
                this._showNotification('Node deleted', 'success');
                break;
            case 'duplicate':
                this._duplicateNode(nodeId);
                break;
            case 'copy':
                this._copyNode(nodeId);
                break;
            case 'paste':
                this._pasteNode();
                break;
        }
    },

    /**
     * Setup drag and drop
     */
    _setupDragDrop() {
        const dropZone = document.getElementById('vueflow-graph');
        if (!dropZone) return;

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', async (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');

            const files = Array.from(e.dataTransfer.files);
            for (const file of files) {
                await this._handleDroppedFile(file);
            }
        });
    },

    /**
     * Handle dropped file
     */
    async _handleDroppedFile(file) {
        const codeExtensions = ['.js', '.ts', '.py', '.java', '.cpp', '.c', '.h', '.go', '.rs', '.php', '.rb', '.swift', '.kt'];
        const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

        if (codeExtensions.includes(ext)) {
            try {
                const content = await file.text();
                const node = {
                    id: 'file-' + Date.now(),
                    type: 'file',
                    data: {
                        label: file.name,
                        path: file.name,
                        content: content.substring(0, 1000)
                    },
                    position: {x: Math.random() * 400, y: Math.random() * 400}
                };

                window.flowManager?.addContextBlock?.(node);
                this._showNotification('File added: ' + file.name, 'success');
            } catch (e) {
                this._showNotification('Failed to read file: ' + file.name, 'error');
            }
        } else {
            this._showNotification('Unsupported file type: ' + ext, 'warning');
        }
    },

    /**
     * Setup auto-save
     */
    _setupAutoSave() {
        setInterval(() => {
            this._saveGraphState();
        }, 30000); // Save every 30 seconds
    },

    /**
     * Load settings
     */
    _loadSettings() {
        const saved = localStorage.getItem('a2a-app-settings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                this.config = {...this.config, ...settings};
            } catch (e) {
                console.warn('[AppBoot] Failed to load settings:', e);
            }
        }
    },

    /**
     * Save settings
     */
    _saveSettings() {
        const serverUrlInput = document.getElementById('settingsServerUrl');
        const useSSECheckbox = document.getElementById('settingsUseSSE');
        const autoSaveCheckbox = document.getElementById('settingsAutoSave');

        this.config = {
            serverUrl: serverUrlInput?.value || this.config.serverUrl,
            useSSE: useSSECheckbox?.checked ?? this.config.useSSE,
            autoSave: autoSaveCheckbox?.checked ?? this.config.autoSave
        };

        localStorage.setItem('a2a-app-settings', JSON.stringify(this.config));
        this._showNotification('Settings saved', 'success');
    },

    /**
     * Save graph state
     */
    _saveGraphState() {
        if (!window.flowManager?.currentFlow) return;

        const state = {
            nodes: window.flowManager.currentFlow.nodes || [],
            edges: window.flowManager.currentFlow.edges || [],
            viewport: window.flowManager.getViewport?.() || {},
            timestamp: Date.now()
        };

        localStorage.setItem('a2a-graph-state', JSON.stringify(state));
    },

    /**
     * Restore graph state
     */
    _restoreGraphState() {
        const saved = localStorage.getItem('a2a-graph-state');
        if (!saved) return;

        try {
            const state = JSON.parse(saved);

            // Check if state is recent (less than 24 hours old)
            const age = Date.now() - state.timestamp;
            if (age < 24 * 60 * 60 * 1000 && state.nodes?.length > 0) {
                window.flowManager?.currentFlow?.set?.({
                    nodes: state.nodes,
                    edges: state.edges || []
                });

                if (state.viewport) {
                    window.flowManager?.setViewport?.(state.viewport);
                }

                this._showNotification('Previous state restored', 'info');
            }
        } catch (e) {
            console.warn('[AppBoot] Failed to restore graph state:', e);
        }
    },

    /**
     * Submit task
     */
    _submitTask() {
        const taskInput = document.getElementById('taskInput');
        const useSSE = document.getElementById('useSSE')?.checked ?? true;
        const taskText = taskInput?.value?.trim();

        if (!taskText) {
            this._showNotification('Please enter a task', 'warning');
            return;
        }

        window.flowManager?.sendTask(taskText, {useSSE})
            .then(() => {
                document.getElementById('taskModal').style.display = 'none';
                taskInput.value = '';
                this._showNotification('Task submitted', 'success');
            })
            .catch((error) => {
                this._showNotification('Error: ' + error.message, 'error');
            });
    },

    /**
     * Add notification
     */
    _addNotification(message, type) {
        const notificationsPanel = document.getElementById('notificationsPanel');
        const notificationsList = document.getElementById('notificationsList');

        if (!notificationsPanel || !notificationsList) return;

        notificationsPanel.style.display = 'block';

        const item = document.createElement('div');
        item.className = 'notification-item notification-' + type;
        item.innerHTML =
            '<span class="notification-message">' + message + '</span>' +
            '<span class="notification-time">' + new Date().toLocaleTimeString() + '</span>';

        notificationsList.insertBefore(item, notificationsList.firstChild);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            item.remove();
        }, 5000);
    },

    /**
     * Clear notifications
     */
    _clearNotifications() {
        const notificationsList = document.getElementById('notificationsList');
        const notificationsPanel = document.getElementById('notificationsPanel');

        if (notificationsList) notificationsList.innerHTML = '';
        if (notificationsPanel) notificationsPanel.style.display = 'none';
    },

    /**
     * Show notification (public)
     */
    _showNotification(message, type) {
        this._addNotification(message, type);
    },

    /**
     * Duplicate node
     */
    _duplicateNode(nodeId) {
        const nodes = window.flowManager?.currentFlow?.nodes || [];
        const node = nodes.find(n => n.id === nodeId);
        const flowManager = window.flowManager;

        if (node) {
            const newNode = {
                ...node,
                id: 'node-' + Date.now(),
                position: {
                    x: node.position.x + 50,
                    y: node.position.y + 50
                }
            };

            flowManager?.addContextBlock?.(newNode);
            this._showNotification('Node duplicated', 'success');
        }
    },

    /**
     * Copy node
     */
    _copyNode(nodeId) {
        const nodes = window.flowManager?.currentFlow?.nodes || [];
        window.clipboardNode = nodes.find(n => n.id === nodeId);
        this._showNotification('Node copied', 'success');
    },

    /**
     * Paste node
     */
    _pasteNode() {
        const flowManager = window.flowManager;
        if (window.clipboardNode) {
            const newNode = {
                ...window.clipboardNode,
                id: 'node-' + Date.now(),
                position: {
                    x: window.clipboardNode.position.x + 50,
                    y: window.clipboardNode.position.y + 50
                }
            };

            flowManager?.addContextBlock?.(newNode);
            this._showNotification('Node pasted', 'success');
        }
    },

    /**
     * Register init step
     */
    _registerInit(name) {
        this.initOrder.push(name);
    },

    /**
     * Emit ready event
     */
    _emitReady() {
        document.dispatchEvent(new CustomEvent('appReady', {detail: {config: this.config}}));
    },

    /**
     * Get config
     */
    getConfig() {
        return {...this.config};
    },

    /**
     * Update config
     */
    updateConfig(updates) {
        this.config = {...this.config, ...updates};
    }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Wait a bit for modules to load
    await new Promise(resolve => setTimeout(resolve, 500));

    // Initialize boot
    const success = await AppBoot.init({
        serverUrl: 'http://localhost:8080/api/v1',
        useSSE: true,
        autoSave: true
    });

    if (success) {
        console.log('[App] Ready!');
    }
});

// Make available globally
if (typeof window !== 'undefined') {
    window.AppBoot = AppBoot;
}
