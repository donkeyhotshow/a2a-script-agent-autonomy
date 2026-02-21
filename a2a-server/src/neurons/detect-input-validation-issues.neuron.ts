import type { Neuron } from '../types/knowledge.types.js';

export const detectInputValidationIssuesNeuron: Neuron = {
  id: 'neuron-detect-input-validation-issues',
  name: 'Detect Input Validation Issues',
  category: 'custom_pattern',
  triggers: ["input","validate","sanitize"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-input-validation-issues-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
