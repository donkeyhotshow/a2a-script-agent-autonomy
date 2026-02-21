import type { Neuron } from '../types/knowledge.types.js';

export const detectInertiaPropsValidationNeuron: Neuron = {
  id: 'neuron-detect-inertia-props-validation',
  name: 'Detect Inertia Props Validation',
  category: 'custom_pattern',
  triggers: ["Inertia","props","page"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-inertia-props-validation-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
