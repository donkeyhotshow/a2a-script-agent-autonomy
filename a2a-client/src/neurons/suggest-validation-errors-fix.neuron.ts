import type { Neuron } from '../types/knowledge.types.js';

export const suggestValidationErrorsFixNeuron: Neuron = {
  id: 'neuron-suggest-validation-errors-fix',
  name: 'Suggest Validation Errors Fix',
  category: 'custom_pattern',
  triggers: ["errors","validate","old("],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-suggest-validation-errors-fix-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
