/**
 * Batch Operations Manager - Multi-node selection and batch operations
 * Provides box selection and group operations for nodes
 */

class BatchOperationsManager {
    constructor() {
        this.selectedNodes = new Set();
        this.isBoxSelecting = false;
        this.selectionBox = null;
        this.boxStartPoint = null;
        this.listeners = new Map();
    }

    /**
     * Initialize Batch Operations Manager
     */
    init() {
        this._setupEventListeners();
        console.log('[BatchOperations] Initialized');
    }

    /**
     * Setup event listeners
     */
    _setupEventListeners() {
        // Listen for node selection changes from VueFlow
        document.addEventListener('keydown', (e) => {
            // Ctrl+A - Select all
            if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !e.target.closest('input, textarea')) {
                e.preventDefault();
                this.selectAll();
            }

            // Escape - Clear selection
            if (e.key === 'Escape') {
                this.clearSelection();
            }
        });
    }

    /**
     * Enable box selection mode
     */
    enableBoxSelection(container) {
        if (!container) return;

        container.addEventListener('mousedown', this._onBoxSelectStart.bind(this));
        container.addEventListener('mousemove', this._onBoxSelectMove.bind(this));
        container.addEventListener('mouseup', this._onBoxSelectEnd.bind(this));
    }

    /**
     * Handle box selection start
     */
    _onBoxSelectStart(e) {
        // Only start box selection with Shift key or middle mouse button
        if (e.shiftKey || e.button === 1) {
            this.isBoxSelecting = true;
            this.boxStartPoint = {x: e.clientX, y: e.clientY};

            // Create selection box element
            this.selectionBox = document.createElement('div');
            this.selectionBox.className = 'selection-box';
            this.selectionBox.style.position = 'fixed';
            this.selectionBox.style.border = '2px dashed #3b82f6';
            this.selectionBox.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
            this.selectionBox.style.pointerEvents = 'none';
            this.selectionBox.style.zIndex = '9999';
            document.body.appendChild(this.selectionBox);
        }
    }

    /**
     * Handle box selection move
     */
    _onBoxSelectMove(e) {
        if (!this.isBoxSelecting || !this.selectionBox || !this.boxStartPoint) return;

        const currentX = e.clientX;
        const currentY = e.clientY;

        const left = Math.min(this.boxStartPoint.x, currentX);
        const top = Math.min(this.boxStartPoint.y, currentY);
        const width = Math.abs(currentX - this.boxStartPoint.x);
        const height = Math.abs(currentY - this.boxStartPoint.y);

        this.selectionBox.style.left = left + 'px';
        this.selectionBox.style.top = top + 'px';
        this.selectionBox.style.width = width + 'px';
        this.selectionBox.style.height = height + 'px';
    }

    /**
     * Handle box selection end
     */
    _onBoxSelectEnd(e) {
        if (!this.isBoxSelecting) return;

        this.isBoxSelecting = false;

        if (this.selectionBox) {
            // Get box bounds
            const boxRect = this.selectionBox.getBoundingClientRect();

            // Find nodes within the box
            this._selectNodesInRect(boxRect);

            // Remove selection box
            this.selectionBox.remove();
            this.selectionBox = null;
        }

        this.boxStartPoint = null;
    }

    /**
     * Select nodes within rectangle
     */
    _selectNodesInRect(rect) {
        const nodes = document.querySelectorAll('.vue-flow__node');

        nodes.forEach(node => {
            const nodeRect = node.getBoundingClientRect();

            // Check if node intersects with selection box
            if (this._rectsIntersect(rect, nodeRect)) {
                this.addToSelection(node.dataset.nodeId || node.id);
            }
        });

        this._emit('selectionChanged', Array.from(this.selectedNodes));
    }

    /**
     * Check if two rectangles intersect
     */
    _rectsIntersect(r1, r2) {
        return !(
            r2.left > r1.right ||
            r2.right < r1.left ||
            r2.top > r1.bottom ||
            r2.bottom < r1.top
        );
    }

    /**
     * Add node to selection
     */
    addToSelection(nodeId) {
        this.selectedNodes.add(nodeId);
        this._highlightSelectedNodes();
        this._emit('selectionChanged', Array.from(this.selectedNodes));
    }

    /**
     * Remove node from selection
     */
    removeFromSelection(nodeId) {
        this.selectedNodes.delete(nodeId);
        this._highlightSelectedNodes();
        this._emit('selectionChanged', Array.from(this.selectedNodes));
    }

    /**
     * Toggle node selection
     */
    toggleSelection(nodeId) {
        if (this.selectedNodes.has(nodeId)) {
            this.removeFromSelection(nodeId);
        } else {
            this.addToSelection(nodeId);
        }
    }

    /**
     * Clear selection
     */
    clearSelection() {
        this.selectedNodes.clear();
        this._highlightSelectedNodes();
        this._emit('selectionChanged', []);
    }

    /**
     * Select all nodes
     */
    selectAll() {
        const nodes = document.querySelectorAll('.vue-flow__node');
        nodes.forEach(node => {
            this.selectedNodes.add(node.dataset.nodeId || node.id);
        });
        this._highlightSelectedNodes();
        this._emit('selectionChanged', Array.from(this.selectedNodes));
    }

    /**
     * Get selected nodes
     */
    getSelectedNodes() {
        return Array.from(this.selectedNodes);
    }

    /**
     * Get selected nodes count
     */
    getSelectedCount() {
        return this.selectedNodes.size;
    }

    /**
     * Highlight selected nodes in the DOM
     */
    _highlightSelectedNodes() {
        const nodes = document.querySelectorAll('.vue-flow__node');
        nodes.forEach(node => {
            const nodeId = node.dataset.nodeId || node.id;
            if (this.selectedNodes.has(nodeId)) {
                node.classList.add('batch-selected');
            } else {
                node.classList.remove('batch-selected');
            }
        });
    }

    /**
     * Delete selected nodes
     */
    deleteSelected() {
        const flowManager = window.flowManager;
        if (!flowManager) return;

        this.selectedNodes.forEach(nodeId => {
            flowManager.removeNode?.(nodeId);
        });

        const count = this.selectedNodes.size;
        this.clearSelection();

        window.showToast?.(`${count} nodes deleted`, 'success');
        this._emit('nodesDeleted', count);
    }

    /**
     * Duplicate selected nodes
     */
    duplicateSelected() {
        const flowManager = window.flowManager;
        if (!flowManager) return;

        const nodes = flowManager.currentFlow?.nodes || [];
        const nodesToDuplicate = nodes.filter(n => this.selectedNodes.has(n.id));

        nodesToDuplicate.forEach(node => {
            const newNode = {
                ...node,
                id: 'node-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                position: {
                    x: node.position.x + 50,
                    y: node.position.y + 50
                }
            };
            flowManager.addContextBlock?.(newNode);
        });

        const count = nodesToDuplicate.length;
        this.clearSelection();

        window.showToast?.(`${count} nodes duplicated`, 'success');
        this._emit('nodesDuplicated', count);
    }

    /**
     * Move selected nodes
     */
    moveSelected(deltaX, deltaY) {
        const flowManager = window.flowManager;
        if (!flowManager) return;

        const nodes = flowManager.currentFlow?.nodes || [];

        this.selectedNodes.forEach(nodeId => {
            const node = nodes.find(n => n.id === nodeId);
            if (node && node.position) {
                node.position.x += deltaX;
                node.position.y += deltaY;
            }
        });

        flowManager.render?.();
        this._emit('nodesMoved', this.selectedNodes.size);
    }

    /**
     * Copy selected nodes to clipboard
     */
    copySelected() {
        const flowManager = window.flowManager;
        if (!flowManager) return;

        const nodes = flowManager.currentFlow?.nodes || [];
        const nodesToCopy = nodes.filter(n => this.selectedNodes.has(n.id));

        window.clipboardNodes = nodesToCopy;
        window.showToast?.(`${nodesToCopy.length} nodes copied`, 'info');
        this._emit('nodesCopied', nodesToCopy.length);
    }

    /**
     * Paste nodes from clipboard
     */
    pasteSelected() {
        const flowManager = window.flowManager;
        if (!flowManager || !window.clipboardNodes || window.clipboardNodes.length === 0) return;

        window.clipboardNodes.forEach(node => {
            const newNode = {
                ...node,
                id: 'node-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                position: {
                    x: node.position.x + 50,
                    y: node.position.y + 50
                }
            };
            flowManager.addContextBlock?.(newNode);
        });

        const count = window.clipboardNodes.length;
        window.showToast?.(`${count} nodes pasted`, 'success');
        this._emit('nodesPasted', count);
    }

    /**
     * Group selected nodes (add to a group)
     */
    groupSelected() {
        if (this.selectedNodes.size < 2) {
            window.showToast?.('Select at least 2 nodes to group', 'warning');
            return;
        }

        // For now, just show a message - full grouping would require VueFlow group functionality
        window.showToast?.(`${this.selectedNodes.size} nodes selected for grouping`, 'info');
        this._emit('nodesGrouped', this.selectedNodes.size);
    }

    /**
     * Subscribe to events
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);

        return () => this.listeners.get(event)?.delete(callback);
    }

    /**
     * Emit event
     */
    _emit(event, data) {
        this.listeners.get(event)?.forEach(cb => cb(data));
    }
}

// Create singleton instance
const batchOperationsManager = new BatchOperationsManager();

// Make available globally
if (typeof window !== 'undefined') {
    window.BatchOperationsManager = BatchOperationsManager;
    window.batchOperationsManager = batchOperationsManager;
}
