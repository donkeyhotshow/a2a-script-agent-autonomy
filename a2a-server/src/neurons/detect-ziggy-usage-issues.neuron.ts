import type { Neuron } from '../types/knowledge.types.js';

export const detectZiggyUsageIssuesNeuron: Neuron = {
  id: 'neuron-detect-ziggy-usage-issues',
  name: 'Detect Ziggy Usage Issues',
  category: 'custom_pattern',
  triggers: ["route(","ziggy","routes"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-ziggy-usage-issues-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
