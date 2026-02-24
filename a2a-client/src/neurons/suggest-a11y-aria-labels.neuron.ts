import type { Neuron } from '../types/knowledge.types.js';

export const suggestA11yAriaLabelsNeuron: Neuron = {
  id: 'neuron-suggest-a11y-aria-labels',
  name: 'Suggest A11y Aria Labels',
  category: 'custom_pattern',
  triggers: ["aria-","role=","label"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-suggest-a11y-aria-labels-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
