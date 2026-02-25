/**
 * Custom VueFlow nodes for A2A Protocol visualization
 * 
 * Protocol message types:
 * - task_request → Input Node (green)
 * - action_proposal → Default Node (yellow)
 * - action_executing → Default Node (blue)
 * - step_result → Default Node (gray)
 * - action_complete → Output Node (green)
 * 
 * Uses Vue 3 render functions for compatibility with vanilla JS
 */

import { h } from 'vue';
import { Handle, Position } from '@vue-flow/core';

/**
 * Create a node wrapper with common structure
 */
function createNodeWrapper(props, children, headerColor, headerIcon, headerTitle) {
  const headerStyle = {
    backgroundColor: headerColor,
    padding: '8px 12px',
    color: 'white',
    fontWeight: '600',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  };
  
  return h('div', {
    class: 'custom-node',
    style: {
      backgroundColor: '#fff',
      border: `2px solid ${headerColor}`,
      borderRadius: '8px',
      overflow: 'hidden',
      minWidth: '200px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }
  }, [
    // Target handle (top)
    h(Handle, {
      type: 'target',
      position: Position.Top,
      style: { background: '#64748b', width: '8px', height: '8px' }
    }),
    
    // Header
    h('div', { style: headerStyle }, [
      h('span', { style: { fontSize: '14px' } }, headerIcon),
      h('span', {}, headerTitle)
    ]),
    
    // Content
    h('div', {
      style: {
        padding: '12px',
        backgroundColor: 'white',
        fontSize: '12px'
      }
    }, children),
    
    // Source handle (bottom)
    h(Handle, {
      type: 'source',
      position: Position.Bottom,
      style: { background: '#64748b', width: '8px', height: '8px' }
    })
  ]);
}

/**
 * TaskInputNode - displays task_request message
 * Green color (#22c55e) - represents input/start of flow
 */
export const TaskInputNode = {
  name: 'TaskInputNode',
  type: 'taskInput',
  nodeType: 'input',
  props: ['id', 'type', 'data', 'selected'],
  setup(props) {
    return () => {
      const data = props.data || {};
      return createNodeWrapper(
        props,
        [
          h('div', {
            style: {
              fontWeight: '600',
              color: '#64748b',
              fontSize: '11px',
              textTransform: 'uppercase',
              marginBottom: '4px'
            }
          }, 'Task:'),
          h('div', {
            style: {
              color: '#1e293b',
              fontSize: '13px',
              marginBottom: '8px',
              wordBreak: 'break-word'
            }
          }, data.task || 'No task'),
          h('div', {
            style: { fontSize: '11px', color: '#94a3b8' }
          }, data.timestamp ? new Date(data.timestamp).toLocaleString() : '')
        ],
        '#22c55e',
        '📥',
        'Task Request'
      );
    };
  }
};

/**
 * ActionProposalNode - displays action_proposal message
 * Yellow color (#eab308) - represents proposed action
 */
export const ActionProposalNode = {
  name: 'ActionProposalNode',
  type: 'actionProposal',
  props: ['id', 'type', 'data', 'selected'],
  setup(props) {
    return () => {
      const data = props.data || {};
      const subActions = data.subActions || [];
      
      return createNodeWrapper(
        props,
        [
          h('div', {
            style: {
              fontWeight: '600',
              color: '#64748b',
              fontSize: '11px',
              textTransform: 'uppercase',
              marginBottom: '4px'
            }
          }, 'Action:'),
          h('div', {
            style: {
              color: '#1e293b',
              fontSize: '13px',
              marginBottom: '4px',
              fontWeight: '500'
            }
          }, data.actionName || 'Unknown action'),
          h('div', {
            style: {
              fontSize: '12px',
              color: '#64748b',
              marginBottom: '8px'
            }
          }, data.description || ''),
          h('div', {
            style: { fontSize: '11px', color: '#94a3b8' }
          }, `${subActions.length} steps`),
          // Show match score if available
          data.matchScore ? h('div', {
            style: {
              marginTop: '8px',
              padding: '4px 8px',
              backgroundColor: '#fef3c7',
              borderRadius: '4px',
              fontSize: '11px',
              color: '#b45309'
            }
          }, `Match: ${Math.round(data.matchScore * 100)}%`) : null,
          // Show sub-actions list if available
          subActions.length > 0 ? h('div', {
            style: {
              marginTop: '8px',
              borderTop: '1px solid #e2e8f0',
              paddingTop: '8px'
            }
          }, [
            h('div', {
              style: {
                fontSize: '10px',
                color: '#64748b',
                marginBottom: '4px',
                textTransform: 'uppercase'
              }
            }, 'Sub-actions:'),
            ...subActions.slice(0, 3).map((sub, idx) => 
              h('div', {
                key: idx,
                style: {
                  fontSize: '11px',
                  color: '#475569',
                  padding: '2px 0'
                }
              }, `${idx + 1}. ${sub.title || sub.actionId}`)
            ),
            subActions.length > 3 ? h('div', {
              style: { fontSize: '10px', color: '#94a3b8' }
            }, `+${subActions.length - 3} more`) : null
          ]) : null
        ],
        '#eab308',
        '💡',
        'Action Proposal'
      );
    };
  }
};

/**
 * SubActionNode - displays sub-action during execution
 * Blue color (#3b82f6) - represents active execution
 */
export const SubActionNode = {
  name: 'SubActionNode',
  type: 'subAction',
  props: ['id', 'type', 'data', 'selected'],
  setup(props) {
    return () => {
      const data = props.data || {};
      const status = data.status || 'running';
      
      // Status styling
      const statusColors = {
        running: { bg: '#dbeafe', color: '#2563eb', text: 'Running...' },
        completed: { bg: '#dcfce7', color: '#16a34a', text: '✓ Completed' },
        failed: { bg: '#fee2e2', color: '#dc2626', text: '✗ Failed' },
        pending: { bg: '#f1f5f9', color: '#64748b', text: '○ Pending' }
      };
      const statusStyle = statusColors[status] || statusColors.pending;
      
      return createNodeWrapper(
        props,
        [
          h('div', {
            style: {
              fontWeight: '600',
              color: '#64748b',
              fontSize: '11px',
              textTransform: 'uppercase',
              marginBottom: '4px'
            }
          }, `Step ${data.stepIndex || 1}:`),
          h('div', {
            style: {
              color: '#1e293b',
              fontSize: '13px',
              marginBottom: '4px',
              fontWeight: '500'
            }
          }, data.subActionName || data.stepName || 'Sub Action'),
          // Show description
          data.description ? h('div', {
            style: {
              fontSize: '12px',
              color: '#64748b',
              marginBottom: '8px'
            }
          }, data.description) : null,
          // Show DSL if available
          data.dsl ? h('div', {
            style: {
              marginTop: '8px',
              padding: '8px',
              backgroundColor: '#1e293b',
              borderRadius: '4px',
              overflow: 'hidden'
            }
          }, [
            h('div', {
              style: {
                fontSize: '10px',
                color: '#94a3b8',
                marginBottom: '4px'
              }
            }, 'DSL Script:'),
            h('pre', {
              style: {
                margin: 0,
                fontSize: '10px',
                color: '#e2e8f0',
                fontFamily: 'Consolas, Monaco, monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                maxHeight: '60px',
                overflow: 'auto'
              }
            }, data.dsl.substring(0, 200) + (data.dsl.length > 200 ? '...' : ''))
          ]) : null,
          // Show input/output
          data.input ? h('div', {
            style: {
              marginTop: '8px',
              fontSize: '11px',
              color: '#64748b'
            }
          }, [`Input: ${JSON.stringify(data.input).substring(0, 50)}...`]) : null,
          // Status badge
          h('div', {
            style: {
              marginTop: '8px',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '600',
              textAlign: 'center',
              backgroundColor: statusStyle.bg,
              color: statusStyle.color
            }
          }, statusStyle.text)
        ],
        '#3b82f6',
        '⚡',
        data.subActionName || 'Sub Action'
      );
    };
  }
};

/**
 * ResultNode - displays step_result message
 * Gray color (#6b7280) - represents result/completion
 */
export const ResultNode = {
  name: 'ResultNode',
  type: 'result',
  props: ['id', 'type', 'data', 'selected'],
  setup(props) {
    return () => {
      const data = props.data || {};
      const success = data.success !== false;
      
      return createNodeWrapper(
        props,
        [
          h('div', {
            style: {
              fontWeight: '600',
              color: '#64748b',
              fontSize: '11px',
              textTransform: 'uppercase',
              marginBottom: '4px'
            }
          }, 'Status:'),
          h('div', {
            style: {
              fontSize: '13px',
              marginBottom: '8px',
              fontWeight: '600',
              color: success ? '#22c55e' : '#ef4444'
            }
          }, success ? '✓ Success' : '✗ Failed'),
          // Show message
          data.message ? h('div', {
            style: {
              fontSize: '12px',
              color: '#64748b',
              marginBottom: '8px'
            }
          }, data.message) : null,
          // Show result data
          data.result ? h('div', {
            style: {
              marginTop: '8px',
              padding: '8px',
              backgroundColor: '#f1f5f9',
              borderRadius: '4px'
            }
          }, [
            h('div', {
              style: {
                fontSize: '10px',
                color: '#64748b',
                marginBottom: '4px'
              }
            }, 'Result:'),
            h('pre', {
              style: {
                margin: 0,
                fontSize: '11px',
                color: '#1e293b',
                fontFamily: 'Consolas, Monaco, monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all'
              }
            }, typeof data.result === 'object' ? JSON.stringify(data.result, null, 2) : String(data.result))
          ]) : null,
          // Show changes if any
          data.changes && data.changes.length > 0 ? h('div', {
            style: {
              marginTop: '8px'
            }
          }, [
            h('div', {
              style: {
                fontWeight: '600',
                fontSize: '11px',
                color: '#64748b',
                marginBottom: '4px'
              }
            }, 'Changes:'),
            ...data.changes.slice(0, 5).map((change, idx) => 
              h('div', {
                key: idx,
                style: {
                  fontSize: '11px',
                  color: '#22c55e',
                  padding: '2px 0'
                }
              }, `+ ${change}`)
            ),
            data.changes.length > 5 ? h('div', {
              style: { fontSize: '10px', color: '#94a3b8' }
            }, `+${data.changes.length - 5} more changes`) : null
          ]) : null
        ],
        '#6b7280',
        '📊',
        'Result'
      );
    };
  }
};

/**
 * ActionCompleteNode - displays action_complete message
 * Green color (#22c55e) - represents output/end of flow
 */
export const ActionCompleteNode = {
  name: 'ActionCompleteNode',
  type: 'actionComplete',
  nodeType: 'output',
  props: ['id', 'type', 'data', 'selected'],
  setup(props) {
    return () => {
      const data = props.data || {};
      const summary = data.summary || {};
      
      return createNodeWrapper(
        props,
        [
          h('div', {
            style: {
              fontWeight: '600',
              color: '#64748b',
              fontSize: '11px',
              textTransform: 'uppercase',
              marginBottom: '4px'
            }
          }, 'Action:'),
          h('div', {
            style: {
              color: '#1e293b',
              fontSize: '13px',
              marginBottom: '8px',
              fontWeight: '500'
            }
          }, data.actionName || 'Unknown'),
          // Show summary
          Object.keys(summary).length > 0 ? h('div', {
            style: {
              marginTop: '8px',
              borderTop: '1px solid #e2e8f0',
              paddingTop: '8px'
            }
          }, [
            h('div', {
              style: {
                fontSize: '10px',
                color: '#64748b',
                marginBottom: '4px',
                textTransform: 'uppercase'
              }
            }, 'Summary:'),
            ...Object.entries(summary).map(([key, value]) => 
              h('div', {
                key: key,
                style: {
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  padding: '2px 0',
                  color: '#475569'
                }
              }, [
                h('span', { style: { color: '#64748b' } }, key),
                h('span', { style: { fontWeight: '500' } }, String(value))
              ])
            )
          ]) : null,
          // Stats row
          h('div', {
            style: {
              marginTop: '8px',
              display: 'flex',
              gap: '12px',
              fontSize: '11px',
              color: '#94a3b8'
            }
          }, [
            h('span', {}, `Steps: ${data.totalSteps || 0}`),
            h('span', {}, `Duration: ${data.duration || '0s'}`)
          ])
        ],
        '#22c55e',
        '✅',
        'Action Complete'
      );
    };
  }
};

/**
 * Register all custom node types
 */
export function registerCustomNodes() {
  return {
    taskInput: TaskInputNode,
    actionProposal: ActionProposalNode,
    subAction: SubActionNode,
    result: ResultNode,
    actionComplete: ActionCompleteNode
  };
}

/**
 * Get node type by protocol message type
 */
export function getNodeType(protocolType) {
  const nodeTypeMap = {
    'task_request': 'taskInput',
    'action_proposal': 'actionProposal',
    'action_executing': 'subAction',
    'step_result': 'result',
    'action_complete': 'actionComplete'
  };
  return nodeTypeMap[protocolType] || 'default';
}

/**
 * Get node color by protocol message type
 */
export function getNodeColor(protocolType) {
  const colorMap = {
    'task_request': '#22c55e',
    'action_proposal': '#eab308',
    'action_executing': '#3b82f6',
    'step_result': '#6b7280',
    'action_complete': '#22c55e'
  };
  return colorMap[protocolType] || '#6b7280';
}
