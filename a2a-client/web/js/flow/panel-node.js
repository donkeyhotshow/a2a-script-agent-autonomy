/**
 * Panel Node - Base component for all draggable panels in VueFlow
 * Each panel is a VueFlow custom node
 */

import {Handle, Position} from '@vue-flow/core';

/**
 * Panel Node Component
 * Used for Sessions, Chat, Graph, Actions panels
 */
export const PanelNode = {
    name: 'PanelNode',
    inheritAttrs: false,
    components: {Handle},
    props: {
        id: {type: String, required: true},
        data: {type: Object, required: true},
        selected: {type: Boolean, default: false},
    },
    emits: ['close', 'add-panel', 'node-click'],
    setup(props, {emit}) {
        const isDragging = () => {
            // VueFlow handles dragging internally
        };

        const handleClose = () => {
            emit('close', props.id);
        };

        const handleAddPanel = (panelType) => {
            emit('add-panel', panelType);
        };

        const handleNodeClick = () => {
            emit('node-click', props.id, props.data);
        };

        return {
            isDragging,
            handleClose,
            handleAddPanel,
            handleNodeClick,
            Position,
        };
    },
    template: `
    <div 
      class="vue-flow__node-panel" 
      :class="[data.panelType, { selected }]"
      @click="handleNodeClick"
    >
      <!-- Input Handle (Left) -->
      <Handle 
        type="target" 
        :position="Position.Left" 
        class="panel-handle"
      />

      <!-- Panel Header -->
      <div class="panel-header" :class="{ draggable: true }">
        <span class="panel-icon">{{ data.icon }}</span>
        <span class="panel-title">{{ data.title }}</span>
        <div class="panel-actions">
          <button 
            v-if="data.panelType !== 'project'" 
            class="panel-btn-close" 
            @click.stop="handleClose"
            title="Close panel"
          >×</button>
        </div>
      </div>

      <!-- Panel Content -->
      <div class="panel-content">
        <slot></slot>
      </div>

      <!-- Panel Footer (for some panels) -->
      <div v-if="data.showFooter" class="panel-footer">
        <slot name="footer"></slot>
      </div>

      <!-- Output Handle (Right) -->
      <Handle 
        type="source" 
        :position="Position.Right" 
        class="panel-handle"
      />
    </div>
  `,
};

/**
 * Create a new panel node data object
 */
export function createPanelNode(type, position, options = {}) {
    const panelConfig = {
        project: {
            icon: '📁',
            title: 'Project',
            panelType: 'project',
            showFooter: true,
        },
        sessions: {
            icon: '📜',
            title: 'Sessions',
            panelType: 'sessions',
            showFooter: true,
        },
        chat: {
            icon: '💬',
            title: 'Chat',
            panelType: 'chat',
            showFooter: true,
        },
        graph: {
            icon: '🔀',
            title: 'Protocol Flow',
            panelType: 'graph',
            showFooter: true,
        },
        actions: {
            icon: '⚡',
            title: 'Actions',
            panelType: 'actions',
            showFooter: true,
        },
    };

    const config = panelConfig[type] || panelConfig.project;

    return {
        id: `${type}-panel-${Date.now()}`,
        type: 'panel',
        position,
        data: {
            ...config,
            ...options,
        },
    };
}

/**
 * Register Panel Node with VueFlow
 */
export function registerPanelNode(app) {
    // This would be used if we convert to Vue components
    // For now, we use the JavaScript version
    return PanelNode;
}
