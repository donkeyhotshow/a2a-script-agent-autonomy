/**
 * Flow Nodes - Result Node
 * Узел результата для VueFlow
 */

(function (global) {
    'use strict';

    /**
     * Компонент узла результата
     */
    export const ResultNode = {
        name: 'ResultNode',
        
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
            <div :class="['vue-flow__node-result', { selected, success: data.success, failed: !data.success }]">
                <div class="node-header">
                    <span class="node-icon">{{ data.success ? '✅' : '❌' }}</span>
                    <span class="node-title">{{ data.success ? 'Success' : 'Failed' }}</span>
                </div>
                <div class="node-content">
                    <div class="result-message" v-if="data.message">
                        {{ data.message }}
                    </div>
                    <div class="changes-summary" v-if="data.changes?.length">
                        <strong>Changes:</strong>
                        <ul>
                            <li v-for="(change, idx) in data.changes" :key="idx">{{ change }}</li>
                        </ul>
                    </div>
                    <div class="result-preview" v-if="data.result && typeof data.result === 'object'">
                        <pre>{{ JSON.stringify(data.result, null, 2).substring(0, 200) }}</pre>
                    </div>
                </div>
            </div>
        `,

        setup(props) {
            return {};
        },

        type: 'resultNode',
        
        defaultData: {
            success: true,
            message: '',
            result: {},
            changes: []
        },

        createElement(data = {}) {
            return () => {
                const { success = true, message = '', result = {}, changes = [] } = data;
                const borderColor = success ? '#22c55e' : '#ef4444';

                return {
                    props: {
                        class: 'vue-flow__node-default',
                        style: {
                            background: success ? '#f0fdf4' : '#fef2f2',
                            border: `2px solid ${borderColor}`,
                            borderRadius: '8px',
                            padding: '10px',
                            minWidth: '180px'
                        }
                    },
                    data: {
                        success,
                        message,
                        result,
                        changes,
                        type: 'resultNode'
                    }
                };
            };
        }
    };

    global.ResultNode = ResultNode;

})(typeof window !== 'undefined' ? window : global);
