import type { Neuron } from '../types/knowledge.types.js';

export const detectMissingCsrfTokenNeuron: Neuron = {
  id: 'neuron-detect-missing-csrf-token',
  name: 'Detect Missing Csrf Token',
  category: 'custom_pattern',
  triggers: ["csrf","POST","form"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-missing-csrf-token-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
