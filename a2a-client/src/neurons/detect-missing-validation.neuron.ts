import type { Neuron } from '../types/knowledge.types.js';

export const detectMissingValidationNeuron: Neuron = {
  id: 'neuron-detect-missing-validation',
  name: 'Detect Missing Validation',
  category: 'custom_pattern',
  triggers: ["validate","rules","Request","validator"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-missing-validation-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
