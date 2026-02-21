import type { Neuron } from '../types/knowledge.types.js';

export const detectBladeIncludeIssuesNeuron: Neuron = {
  id: 'neuron-detect-blade-include-issues',
  name: 'Detect Blade Include Issues',
  category: 'custom_pattern',
  triggers: ["@include","Blade","components"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-blade-include-issues-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
