/**
 * Flow Nodes - Task Input Node
 * Узел ввода задачи для VueFlow
 */

(function (global) {
    'use strict';

    /**
     * Компонент узла ввода задачи
     */
    export const TaskInputNode = {
        // Component name for VueFlow
        name: 'TaskInputNode',
        
        /**
         * Props validator
         */
        props: {
            data: {
                type: Object,
                required: true
            },
            selected: {
                type: Boolean,
                default: false
            }
        },

        /**
         * Template for the node
         */
        template: `
            <div :class="['vue-flow__node-task-input', { selected }]">
                <div class="node-header">
                    <span class="node-icon">📝</span>
                    <span class="node-title">Task Input</span>
                </div>
                <div class="node-content">
                    <div class="task-text">{{ data.task || 'No task specified' }}</div>
                    <div class="task-timestamp" v-if="data.timestamp">
                        {{ formatTimestamp(data.timestamp) }}
                    </div>
                </div>
            </div>
        `,

        /**
         * Setup function for Vue 3
         */
        setup(props) {
            const formatTimestamp = (timestamp) => {
                if (!timestamp) return '';
                const date = new Date(timestamp);
                return date.toLocaleTimeString();
            };

            return {
                formatTimestamp
            };
        },

        /**
         * VueFlow node configuration
         */
        type: 'taskInput',
        
        /**
         * Default data for new nodes
         */
        defaultData: {
            task: '',
            timestamp: ''
        },

        /**
         * Create node element
         */
        createElement(data = {}) {
            return () => {
                const { task = 'No task specified', timestamp = '' } = data;
                const timestampStr = timestamp ? new Date(timestamp).toLocaleTimeString() : '';

                return {
                    props: {
                        class: 'vue-flow__node-default',
                        style: {
                            background: '#ecfdf5',
                            border: '2px solid #22c55e',
                            borderRadius: '8px',
                            padding: '10px',
                            minWidth: '150px'
                        }
                    },
                    // Vue component would be rendered here
                    // For now return data for custom rendering
                    data: {
                        task,
                        timestamp: timestampStr,
                        type: 'taskInput'
                    }
                };
            };
        }
    };

    // Export for use
    global.TaskInputNode = TaskInputNode;

})(typeof window !== 'undefined' ? window : global);
