import type { Neuron } from '../types/knowledge.types.js';

export const detectVueRefReactiveIssuesNeuron: Neuron = {
  id: 'neuron-detect-vue-ref-reactive-issues',
  name: 'Detect Vue Ref Reactive Issues',
  category: 'custom_pattern',
  triggers: ["ref","reactive","computed"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-vue-ref-reactive-issues-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
