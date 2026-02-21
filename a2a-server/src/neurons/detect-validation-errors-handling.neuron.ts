import type { Neuron } from '../types/knowledge.types.js';

export const detectValidationErrorsHandlingNeuron: Neuron = {
  id: 'neuron-detect-validation-errors-handling',
  name: 'Detect Validation Errors Handling',
  category: 'custom_pattern',
  triggers: ["errors","validate","old("],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-validation-errors-handling-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
