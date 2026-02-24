import type { Neuron } from '../types/knowledge.types.js';

export const suggestA11yAltNeuron: Neuron = {
  id: 'neuron-suggest-a11y-alt',
  name: 'Suggest A11y Alt',
  category: 'custom_pattern',
  triggers: ["<img","alt=","image"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-suggest-a11y-alt-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
