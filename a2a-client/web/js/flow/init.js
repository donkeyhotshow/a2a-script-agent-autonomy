/**
 * Flow Panel Initialization
 * Initializes VueFlow and handles demo data loading
 */

import {
    initFlow,
    loadSimulationResponse,
    clearFlowView,
    zoomIn,
    zoomOut,
    fitView,
    configureClient,
    onLog,
    onProgress,
    onComplete,
    onError,
    connectSSE,
    disconnectSSE
} from './index.js';

/**
 * Demo data for testing the graph
 */
export const DEMO_DATA = {
    // Simple task flow
    simple: {
        outcome: {
            task: "Create a simple hello world application",
            status: "completed",
            messageType: "task_response",
            contextBlocks: [
                {
                    id: "task-1",
                    type: "task_request",
                    messageType: "task_request",
                    title: "Task Request",
                    task: "Create a simple hello world application",
                    timestamp: new Date().toISOString()
                },
                {
                    id: "proposal-1",
                    type: "action_proposal",
                    messageType: "action_proposal",
                    title: "Action Proposal",
                    proposal: {
                        action: "create_file",
                        params: {
                            path: "hello.js",
                            content: "console.log('Hello World!');"
                        }
                    },
                    timestamp: new Date().toISOString()
                },
                {
                    id: "complete-1",
                    type: "action_complete",
                    messageType: "action_complete",
                    title: "Action Complete",
                    result: {
                        success: true,
                        message: "File created successfully"
                    },
                    timestamp: new Date().toISOString()
                }
            ]
        }
    },

    // Multi-step workflow
    workflow: {
        outcome: {
            task: "Build a complete user authentication system",
            status: "completed",
            messageType: "task_response",
            contextBlocks: [
                {
                    id: "task-main",
                    type: "task_request",
                    messageType: "task_request",
                    title: "Task Request",
                    task: "Build a complete user authentication system",
                    timestamp: new Date().toISOString()
                },
                {
                    id: "proposal-1",
                    type: "action_proposal",
                    messageType: "action_proposal",
                    title: "Create User Model",
                    proposal: {
                        action: "create_file",
                        params: {
                            path: "models/User.js",
                            content: "export default class User { ... }"
                        }
                    },
                    timestamp: new Date().toISOString()
                },
                {
                    id: "result-1",
                    type: "step_result",
                    messageType: "step_result",
                    title: "Model Created",
                    result: {
                        success: true,
                        output: "User model created at models/User.js"
                    },
                    timestamp: new Date().toISOString()
                },
                {
                    id: "proposal-2",
                    type: "action_proposal",
                    messageType: "action_proposal",
                    title: "Create Auth Controller",
                    proposal: {
                        action: "create_file",
                        params: {
                            path: "controllers/AuthController.js",
                            content: "export default class AuthController { ... }"
                        }
                    },
                    timestamp: new Date().toISOString()
                },
                {
                    id: "result-2",
                    type: "step_result",
                    messageType: "step_result",
                    title: "Controller Created",
                    result: {
                        success: true,
                        output: "Auth controller created at controllers/AuthController.js"
                    },
                    timestamp: new Date().toISOString()
                },
                {
                    id: "complete-1",
                    type: "action_complete",
                    messageType: "action_complete",
                    title: "Auth System Complete",
                    result: {
                        success: true,
                        summary: "User authentication system created with 5 files"
                    },
                    timestamp: new Date().toISOString()
                }
            ]
        }
    },

    // Agent graph visualization
    agents: {
        outcome: {
            task: "Analyze project architecture",
            status: "completed",
            messageType: "task_response",
            contextBlocks: [
                {
                    id: "task-root",
                    type: "task_request",
                    messageType: "task_request",
                    title: "Analyze Architecture",
                    task: "Analyze project architecture",
                    timestamp: new Date().toISOString()
                },
                {
                    id: "agent-1",
                    type: "agents",
                    messageType: "action_proposal",
                    title: "Code Analyzer Agent",
                    proposal: {
                        agent: "CodeAnalyzer",
                        action: "scan_files",
                        params: {pattern: "**/*.js"}
                    },
                    timestamp: new Date().toISOString()
                },
                {
                    id: "agent-2",
                    type: "agents",
                    messageType: "action_proposal",
                    title: "Dependency Agent",
                    proposal: {
                        agent: "DependencyAgent",
                        action: "analyze_deps",
                        params: {}
                    },
                    timestamp: new Date().toISOString()
                },
                {
                    id: "node-1",
                    type: "nodes",
                    messageType: "step_result",
                    title: "Found 150 JS Files",
                    result: {files: 150, lines: 45000},
                    timestamp: new Date().toISOString()
                },
                {
                    id: "node-2",
                    type: "actions",
                    messageType: "step_result",
                    title: "Found 45 Dependencies",
                    result: {dependencies: 45},
                    timestamp: new Date().toISOString()
                },
                {
                    id: "complete-arch",
                    type: "action_complete",
                    messageType: "action_complete",
                    title: "Analysis Complete",
                    result: {
                        summary: "Project has 150 JS files and 45 dependencies"
                    },
                    timestamp: new Date().toISOString()
                }
            ]
        }
    }
};

/**
 * Initialize the flow panel
 */
export function initFlowPanel(config = {}) {
    const {
        apiBase = '/api/v1',
        serverUrl = 'http://localhost:8080/api/v1',
        token = null,
        useSSE = true
    } = config;

    console.log('[FlowPanel] Initializing...');

    // Configure the A2A client
    configureClient({serverUrl, token});

    // Setup SSE event handlers if enabled
    if (useSSE) {
        setupSSEEventHandlers();
    }

    // Initialize VueFlow
    initFlow();

    // Setup toolbar handlers
    setupToolbarHandlers();

    // Setup panel controls
    setupPanelControls();

    console.log('[FlowPanel] Initialized successfully');
    return flowManager;
}

/**
 * Setup SSE event handlers
 */
function setupSSEEventHandlers() {
    onLog((data) => {
        console.log('[FlowPanel] Log:', data.message);
        // Could also update a log panel here
    });

    onProgress((data) => {
        console.log('[FlowPanel] Progress:', data);
    });

    onComplete((data) => {
        console.log('[FlowPanel] Complete:', data);
    });

    onError((error) => {
        console.error('[FlowPanel] Error:', error);
    });
}

/**
 * Setup toolbar button handlers
 */
function setupToolbarHandlers() {
    // Zoom in
    const zoomInBtn = document.getElementById('flowZoomIn');
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            zoomIn();
        });
    }

    // Zoom out
    const zoomOutBtn = document.getElementById('flowZoomOut');
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            zoomOut();
        });
    }

    // Fit view
    const fitViewBtn = document.getElementById('flowFitView');
    if (fitViewBtn) {
        fitViewBtn.addEventListener('click', () => {
            fitView();
        });
    }

    // Clear
    const clearBtn = document.getElementById('flowClear');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            clearFlowView();
        });
    }

    // Load demo
    const loadDemoBtn = document.getElementById('flowLoadDemo');
    if (loadDemoBtn) {
        loadDemoBtn.addEventListener('click', () => {
            showDemoSelector();
        });
    }
}

/**
 * Setup panel control handlers
 */
function setupPanelControls() {
    document.addEventListener('click', (e) => {
        const action = e.target.dataset?.action;
        if (!action) return;

        switch (action) {
            case 'zoom-in':
                zoomIn();
                break;
            case 'zoom-out':
                zoomOut();
                break;
            case 'fit':
                fitView();
                break;
            case 'clear':
                clearFlowView();
                break;
        }
    });
}

/**
 * Show demo data selector
 */
function showDemoSelector() {
    const demoKeys = Object.keys(DEMO_DATA);
    const demoNames = {
        simple: 'Simple Task',
        workflow: 'Multi-step Workflow',
        agents: 'Agent Graph'
    };

    // Create a simple selector (could be enhanced with a modal)
    const selection = prompt(
        'Select demo data:\n' +
        demoKeys.map((key, i) => `${i + 1}. ${demoNames[key]}`).join('\n') +
        '\n\nEnter number (1-' + demoKeys.length + '):'
    );

    const index = parseInt(selection) - 1;
    if (index >= 0 && index < demoKeys.length) {
        loadDemo(demoKeys[index]);
    }
}

/**
 * Load demo data by key
 */
export function loadDemo(demoKey) {
    const demo = DEMO_DATA[demoKey];
    if (!demo) {
        console.error('[FlowPanel] Demo not found:', demoKey);
        return;
    }

    console.log('[FlowPanel] Loading demo:', demoKey);
    clearFlowView();

    setTimeout(() => {
        loadSimulationResponse(demo);
        console.log('[FlowPanel] Demo loaded:', demoKey);
    }, 100);
}

/**
 * Create a graph panel element
 */
export function createGraphPanel(panelId = 'graph-panel', slot = 'floating') {
    const panel = document.createElement('div');
    panel.className = 'pui-panel pui-graph-panel pui-slot-' + slot;
    panel.dataset.panelId = panelId;
    panel.dataset.panelType = 'graph';
    panel.innerHTML = `
    <div class="pui-panel-header">
      <span class="pui-panel-title">📊 Flow Graph</span>
      <div class="pui-panel-controls">
        <button class="pui-panel-control-btn" data-action="zoom-in" aria-label="Zoom in">+</button>
        <button class="pui-panel-control-btn" data-action="zoom-out" aria-label="Zoom out">−</button>
        <button class="pui-panel-control-btn" data-action="fit" aria-label="Fit view">⊡</button>
        <button class="pui-panel-control-btn" data-action="clear" aria-label="Clear graph">🗑</button>
        <button class="pui-panel-control-btn" data-action="minimize" aria-label="Minimize panel">−</button>
        <button class="pui-panel-control-btn" data-action="close" aria-label="Close panel">×</button>
      </div>
    </div>
    <div class="pui-panel-content pui-graph-content">
      <div id="vueflow-graph" class="vueflow-container"></div>
      <div class="vueflow-toolbar">
        <button class="flow-toolbar-btn" id="flowZoomIn" title="Zoom In">🔍+</button>
        <button class="flow-toolbar-btn" id="flowZoomOut" title="Zoom Out">🔍-</button>
        <button class="flow-toolbar-btn" id="flowFitView" title="Fit View">⊡</button>
        <button class="flow-toolbar-btn" id="flowClear" title="Clear">🗑</button>
        <button class="flow-toolbar-btn" id="flowLoadDemo" title="Load Demo">📂</button>
      </div>
    </div>
    <div class="pui-panel-resize-handle"></div>
  `;

    return panel;
}

/**
 * Connect to SSE for a session
 */
export function connectToSession(sessionId, apiBase = '/api/v1') {
    console.log('[FlowPanel] Connecting to session:', sessionId);
    connectSSE(sessionId, apiBase);
}

/**
 * Disconnect from SSE
 */
export function disconnectFromSession() {
    console.log('[FlowPanel] Disconnecting from session');
    disconnectSSE();
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if VueFlow container exists
    const vueflowContainer = document.getElementById('vueflow-graph');
    if (vueflowContainer) {
        console.log('[FlowPanel] VueFlow container found, initializing...');
        initFlowPanel();
    }
});

// Make functions available globally
if (typeof window !== 'undefined') {
    window.initFlowPanel = initFlowPanel;
    window.loadDemo = loadDemo;
    window.createGraphPanel = createGraphPanel;
    window.connectToSession = connectToSession;
    window.disconnectFromSession = disconnectFromSession;
}
