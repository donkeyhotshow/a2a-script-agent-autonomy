import type { Neuron } from '../types/knowledge.types.js';

export const detectA11yMissingAltNeuron: Neuron = {
  id: 'neuron-detect-a11y-missing-alt',
  name: 'Detect A11y Missing Alt',
  category: 'custom_pattern',
  triggers: ["<img","alt=","image"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-a11y-missing-alt-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
