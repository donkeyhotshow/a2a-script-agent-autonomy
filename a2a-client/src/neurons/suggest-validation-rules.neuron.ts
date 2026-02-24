import type { Neuron } from '../types/knowledge.types.js';

export const suggestValidationRulesNeuron: Neuron = {
  id: 'neuron-suggest-validation-rules',
  name: 'Suggest Validation Rules',
  category: 'custom_pattern',
  triggers: ["validate","rules","Request"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-suggest-validation-rules-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
