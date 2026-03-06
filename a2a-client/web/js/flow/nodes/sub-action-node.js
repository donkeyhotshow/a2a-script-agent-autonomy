/**
 * Flow Nodes - Sub Action Node
 * Узел под-действия для VueFlow
 */

(function (global) {
    'use strict';

    /**
     * Компонент узла под-действия
     */
    export const SubActionNode = {
        name: 'SubActionNode',
        
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

        template: `
            <div :class="['vue-flow__node-sub-action', { selected }]">
                <div class="node-header">
                    <span class="step-badge">Step {{ data.stepIndex || '?' }}</span>
                    <span class="node-title">{{ data.subActionName || 'Unknown Step' }}</span>
                </div>
                <div class="node-content">
                    <div class="dsl-preview" v-if="data.dsl">
                        <code>{{ truncateDsl(data.dsl) }}</code>
                    </div>
                    <div class="status-indicator" :class="data.status || 'pending'">
                        {{ data.status || 'pending' }}
                    </div>
                    <div class="io-section" v-if="data.input || data<div class.output">
                        ="input" v-if="data.input">
                            <strong>Input:</strong> {{ truncate(String(data.input), 50) }}
                        </div>
                        <div class="output" v-if="data.output">
                            <strong>Output:</strong> {{ truncate(String(data.output), 50) }}
                        </div>
                    </div>
                </div>
            </div>
        `,

        setup(props) {
            const truncateDsl = (dsl) => {
                if (!dsl) return '';
                return dsl.length > 30 ? dsl.substring(0, 30) + '...' : dsl;
            };
            
            const truncate = (str, len) => {
                if (!str) return '';
                return str.length > len ? str.substring(0, len) + '...' : str;
            };

            return { truncateDsl, truncate };
        },

        type: 'subActionNode',
        
        defaultData: {
            subActionName: '',
            stepIndex: 0,
            dsl: '',
            input: {},
            output: '',
            status: 'pending'
        },

        createElement(data = {}) {
            return () => {
                const { 
                    subActionName = 'Unknown Step', 
                    stepIndex = 0, 
                    dsl = '', 
                    input = {}, 
                    output = '', 
                    status = 'pending' 
                } = data;

                const statusColors = {
                    'pending': '#6b7280',
                    'executing': '#f59e0b',
                    'completed': '#22c55e',
                    'failed': '#ef4444'
                };
                const statusColor = statusColors[status] || '#6b7280';

                return {
                    props: {
                        class: 'vue-flow__node-default',
                        style: {
                            background: '#f5f3ff',
                            border: `2px solid #8b5cf6`,
                            borderRadius: '8px',
                            padding: '10px',
                            minWidth: '160px'
                        }
                    },
                    data: {
                        subActionName,
                        stepIndex,
                        dsl: dsl?.substring(0, 30) || '',
                        input,
                        output: output?.substring(0, 50) || '',
                        status,
                        statusColor,
                        type: 'subActionNode'
                    }
                };
            };
        }
    };

    global.SubActionNode = SubActionNode;

})(typeof window !== 'undefined' ? window : global);
