import type { Neuron } from '../types/knowledge.types.js';

export const detectWeakValidationNeuron: Neuron = {
  id: 'neuron-detect-weak-validation',
  name: 'Detect Weak Validation',
  category: 'custom_pattern',
  triggers: ["validate","rules","sometimes"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-weak-validation-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
