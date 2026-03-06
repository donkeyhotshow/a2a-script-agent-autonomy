/**
 * Flow Nodes - Action Node
 * Узел действия для VueFlow
 */

(function (global) {
    'use strict';

    /**
     * Компонент узла действия
     */
    export const ActionNode = {
        name: 'ActionNode',
        
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
            <div :class="['vue-flow__node-action', { selected }]">
                <div class="node-header">
                    <span class="node-icon">⚡</span>
                    <span class="node-title">{{ data.actionName || 'Unknown Action' }}</span>
                </div>
                <div class="node-content">
                    <div class="action-description" v-if="data.description">
                        {{ data.description }}
                    </div>
                    <div class="match-score" v-if="data.matchScore !== undefined">
                        Match: {{ (data.matchScore * 100).toFixed(1) }}%
                    </div>
                    <div class="sub-actions" v-if="data.subActions?.length">
                        <div class="sub-action" v-for="(sa, idx) in data.subActions" :key="idx">
                            {{ sa }}
                        </div>
                    </div>
                </div>
            </div>
        `,

        setup(props) {
            return {};
        },

        type: 'actionNode',
        
        defaultData: {
            actionName: '',
            description: '',
            matchScore: null,
            subActions: []
        },

        createElement(data = {}) {
            return () => {
                const { 
                    actionName = 'Unknown Action', 
                    description = '', 
                    matchScore, 
                    subActions = [] 
                } = data;

                const matchScoreStr = matchScore !== undefined 
                    ? `Match: ${(matchScore * 100).toFixed(1)}%` 
                    : '';

                return {
                    props: {
                        class: 'vue-flow__node-default',
                        style: {
                            background: '#eff6ff',
                            border: '2px solid #3b82f6',
                            borderRadius: '8px',
                            padding: '10px',
                            minWidth: '180px'
                        }
                    },
                    data: {
                        actionName,
                        description,
                        matchScore: matchScoreStr,
                        subActions,
                        type: 'actionNode'
                    }
                };
            };
        }
    };

    global.ActionNode = ActionNode;

})(typeof window !== 'undefined' ? window : global);
