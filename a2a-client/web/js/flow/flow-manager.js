/**
 * A2A Flow Manager
 *
 * Manages VueFlow instance for visualizing A2A task execution.
 * Integrates with Sessions.js for real-time updates.
 */

import { mapSimulationResponseToFlow, createEdgesFromNodes, layoutNodes } from './protocol.js';
import { registerCustomNodes } from './nodes.js';

class A2AFlowManager {
    constructor(options = {}) {
        this.options = {
            containerId: 'flow-container',
            vueFlowConfig: {
                nodes: [],
                edges: [],
                nodeTypes: {},
                fitViewOnInit: true,
                ...options.vueFlowConfig
            },
            ...options
        };

        this.vueFlow = null;
        this.nodes = [];
        this.edges = [];
        this.isInitialized = false;
        this.eventListeners = new Map();
    }

    /**
     * Initialize VueFlow instance
     */
    async init() {
        try {
            // Check if Vue and VueFlow are available
            if (typeof Vue === 'undefined' || typeof VueFlow === 'undefined') {
                throw new Error('Vue and VueFlow must be loaded before initializing A2AFlowManager');
            }

            const container = document.getElementById(this.options.containerId);
            if (!container) {
                throw new Error(`Container element with id '${this.options.containerId}' not found`);
            }

            // Register custom node types
            const nodeTypes = registerCustomNodes();

            // Create Vue app with VueFlow
            const app = Vue.createApp({
                template: `
                    <div class="vue-flow-container" style="width: 100%; height: 100%;">
                        <VueFlow
                            v-model:nodes="nodes"
                            v-model:edges="edges"
                            :node-types="nodeTypes"
                            :fit-view-on-init="fitViewOnInit"
                            @node-click="onNodeClick"
                            @edge-click="onEdgeClick"
                            @connect="onConnect"
                        >
                            <template #node-custom="nodeProps">
                                <component :is="nodeTypes[nodeProps.type]" v-bind="nodeProps" />
                            </template>

                            <Background pattern="dots" />
                            <Controls />
                            <MiniMap />
                        </VueFlow>
                    </div>
                `,
                data: () => ({
                    nodes: this.nodes,
                    edges: this.edges,
                    nodeTypes,
                    fitViewOnInit: this.options.vueFlowConfig.fitViewOnInit
                }),
                methods: {
                    onNodeClick(event) {
                        console.log('Node clicked:', event);
                        this.$emit('node-click', event);
                    },
                    onEdgeClick(event) {
                        console.log('Edge clicked:', event);
                        this.$emit('edge-click', event);
                    },
                    onConnect(event) {
                        console.log('Nodes connected:', event);
                        this.$emit('connect', event);
                    }
                }
            });

            // Mount the app
            const vm = app.mount(container);
            this.vueFlow = vm;

            // Set up event listeners
            this.setupEventListeners();

            this.isInitialized = true;
            console.log('VueFlow initialized successfully');

            return true;
        } catch (error) {
            console.error('Failed to initialize VueFlow:', error);
            throw error;
        }
    }

    /**
     * Set up event listeners for integration
     */
    setupEventListeners() {
        // Listen for session events if Sessions object exists
        if (typeof window !== 'undefined' && window.Sessions) {
            this.addEventListener(window.Sessions, 'responseReceived', (response) => {
                this.loadContext(response);
            });

            this.addEventListener(window.Sessions, 'executionStep', (data) => {
                this.updateExecutionStep(data);
            });

            this.addEventListener(window.Sessions, 'executionProgress', (data) => {
                this.updateExecutionProgress(data);
            });
        }

        // Listen for SSE events if available
        if (typeof window !== 'undefined' && window.SSEClient) {
            this.addEventListener(window.SSEClient, 'message', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'simulation_response') {
                        this.loadContext(data.response);
                    }
                } catch (error) {
                    console.warn('Failed to parse SSE message:', error);
                }
            });
        }
    }

    /**
     * Add task node to start the flow
     */
    addTask(task, projectId = null) {
        if (!this.isInitialized) {
            throw new Error('FlowManager not initialized. Call init() first.');
        }

        const taskNode = {
            id: `task-${Date.now()}`,
            type: 'taskInput',
            position: { x: 250, y: 50 },
            data: {
                task: task,
                timestamp: new Date().toISOString(),
                projectId: projectId
            }
        };

        this.nodes.push(taskNode);
        this.updateEdges();
        this.fitView();

        return taskNode;
    }

    /**
     * Load context from simulation response
     */
    loadContext(response) {
        if (!this.isInitialized) return;

        try {
            const { nodes: newNodes, edges: newEdges } = mapSimulationResponseToFlow(response, this.nodes);

            this.nodes = layoutNodes(newNodes);
            this.edges = [...this.edges, ...newEdges];

            this.updateVueFlow();
            this.fitView();

        } catch (error) {
            console.error('Failed to load context:', error);
        }
    }

    /**
     * Update execution step indicator
     */
    updateExecutionStep(data) {
        if (!this.isInitialized) return;

        const { step, action } = data;

        // Find running nodes and update their status
        this.nodes.forEach(node => {
            if (node.data && typeof node.data.status !== 'undefined') {
                if (node.data.stepIndex === step) {
                    node.data.status = 'running';
                } else if (node.data.status === 'running') {
                    node.data.status = 'completed';
                }
            }
        });

        this.updateEdges();
        this.updateVueFlow();
    }

    /**
     * Update execution progress
     */
    updateExecutionProgress(data) {
        if (!this.isInitialized) return;

        const { step, progress } = data;

        // Find the current step node and update progress
        const stepNode = this.nodes.find(node =>
            node.type === 'subAction' && node.data?.stepIndex === step
        );

        if (stepNode) {
            stepNode.data.progress = progress;
            this.updateVueFlow();
        }
    }

    /**
     * Clear all nodes and edges
     */
    clear() {
        this.nodes = [];
        this.edges = [];
        this.updateVueFlow();
    }

    /**
     * Zoom in
     */
    zoomIn() {
        if (this.vueFlow?.$el) {
            const vueFlowInstance = this.vueFlow.$el.querySelector('.vue-flow__viewport');
            if (vueFlowInstance && vueFlowInstance.__vue__) {
                vueFlowInstance.__vue__.zoomIn();
            }
        }
    }

    /**
     * Zoom out
     */
    zoomOut() {
        if (this.vueFlow?.$el) {
            const vueFlowInstance = this.vueFlow.$el.querySelector('.vue-flow__viewport');
            if (vueFlowInstance && vueFlowInstance.__vue__) {
                vueFlowInstance.__vue__.zoomOut();
            }
        }
    }

    /**
     * Fit view to show all nodes
     */
    fitView() {
        if (this.vueFlow?.$el) {
            const vueFlowInstance = this.vueFlow.$el.querySelector('.vue-flow__viewport');
            if (vueFlowInstance && vueFlowInstance.__vue__) {
                vueFlowInstance.__vue__.fitView();
            }
        }
    }

    /**
     * Update edges based on current nodes
     */
    updateEdges() {
        this.edges = createEdgesFromNodes(this.nodes);
    }

    /**
     * Update VueFlow reactive data
     */
    updateVueFlow() {
        if (this.vueFlow) {
            this.vueFlow.nodes = [...this.nodes];
            this.vueFlow.edges = [...this.edges];
        }
    }

    /**
     * Add event listener with cleanup tracking
     */
    addEventListener(target, event, handler) {
        if (target && typeof target.on === 'function') {
            target.on(event, handler);
            this.eventListeners.set(`${target.constructor.name}-${event}`, { target, event, handler });
        }
    }

    /**
     * Remove all event listeners
     */
    removeEventListeners() {
        this.eventListeners.forEach(({ target, event, handler }) => {
            if (target && typeof target.off === 'function') {
                target.off(event, handler);
            }
        });
        this.eventListeners.clear();
    }

    /**
     * Destroy the flow manager
     */
    destroy() {
        this.removeEventListeners();
        if (this.vueFlow) {
            this.vueFlow.$destroy();
            this.vueFlow = null;
        }
        this.isInitialized = false;
        this.nodes = [];
        this.edges = [];
    }

    /**
     * Get current state
     */
    getState() {
        return {
            isInitialized: this.isInitialized,
            nodeCount: this.nodes.length,
            edgeCount: this.edges.length,
            nodes: [...this.nodes],
            edges: [...this.edges]
        };
    }
}

// Export singleton instance
export const flowManager = new A2AFlowManager();

// Export class for testing
export { A2AFlowManager };

// Global initialization function
if (typeof window !== 'undefined') {
    window.initFlow = async function(options = {}) {
        try {
            await flowManager.init();
            console.log('A2A Flow Manager initialized');
            return flowManager;
        } catch (error) {
            console.error('Failed to initialize A2A Flow Manager:', error);
            throw error;
        }
    };

    window.loadContext = function(response) {
        flowManager.loadContext(response);
    };
}