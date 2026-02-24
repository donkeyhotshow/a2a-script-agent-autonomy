import type { Neuron } from '../types/knowledge.types.js';

export const detectCsrfIssuesNeuron: Neuron = {
  id: 'neuron-detect-csrf-issues',
  name: 'Detect Csrf Issues',
  category: 'custom_pattern',
  triggers: ["csrf","@csrf","VerifyCsrfToken"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-csrf-issues-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
