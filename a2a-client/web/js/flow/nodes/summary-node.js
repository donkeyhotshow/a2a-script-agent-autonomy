/**
 * Flow Nodes - Summary Node
 * Узел сводки для VueFlow
 */

(function (global) {
    'use strict';

    /**
     * Компонент узла сводки
     */
    export const SummaryNode = {
        name: 'SummaryNode',
        
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
            <div :class="['vue-flow__node-summary', { selected }]">
                <div class="node-header">
                    <span class="node-icon">📊</span>
                    <span class="node-title">Task Summary</span>
                </div>
                <div class="node-content">
                    <div class="action-name">
                        <strong>Action:</strong> {{ data.actionName || 'unknown' }}
                    </div>
                    <div class="stats-grid" v-if="hasStats">
                        <div class="stat">
                            <span class="stat-label">Steps</span>
                            <span class="stat-value">{{ data.totalSteps || 0 }}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Duration</span>
                            <span class="stat-value">{{ formatDuration(data.duration) }}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Files</span>
                            <span class="stat-value">{{ data.filesChanged || 0 }}</span>
                        </div>
                        <div class="stat errors">
                            <span class="stat-label">Errors</span>
                            <span class="stat-value">{{ data.errors || 0 }}</span>
                        </div>
                    </div>
                </div>
            </div>
        `,

        setup(props) {
            const hasStats = computed(() => {
                return props.data?.totalSteps || props.data?.duration || props.data?.filesChanged || props.data?.errors;
            });
            
            const formatDuration = (duration) => {
                if (!duration) return '-';
                if (typeof duration === 'number') {
                    return duration < 60 ? `${duration}s` : `${Math.floor(duration/60)}m ${duration%60}s`;
                }
                return duration;
            };
            
            const computed = {
                hasStats
            };

            return { formatDuration, computed };
        },

        type: 'summaryNode',
        
        defaultData: {
            actionName: '',
            summary: {},
            totalSteps: 0,
            duration: '',
            filesChanged: 0,
            errors: 0
        },

        createElement(data = {}) {
            return () => {
                const { 
                    actionName = 'Unknown Action', 
                    summary = {}, 
                    totalSteps = summary.totalSteps || 0, 
                    duration = summary.duration || '', 
                    filesChanged = summary.filesChanged || 0, 
                    errors = summary.errors || 0 
                } = data;

                return {
                    props: {
                        class: 'vue-flow__node-default',
                        style: {
                            background: '#f0fdf4',
                            border: '2px solid #22c55e',
                            borderRadius: '8px',
                            padding: '10px',
                            minWidth: '200px'
                        }
                    },
                    data: {
                        actionName,
                        totalSteps,
                        duration,
                        filesChanged,
                        errors,
                        type: 'summaryNode'
                    }
                };
            };
        }
    };

    global.SummaryNode = SummaryNode;

})(typeof window !== 'undefined' ? window : global);
