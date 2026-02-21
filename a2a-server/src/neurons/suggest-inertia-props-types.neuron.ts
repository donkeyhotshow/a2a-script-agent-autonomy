import type { Neuron } from '../types/knowledge.types.js';

export const suggestInertiaPropsTypesNeuron: Neuron = {
  id: 'neuron-suggest-inertia-props-types',
  name: 'Suggest Inertia Props Types',
  category: 'custom_pattern',
  triggers: ["Inertia","props","page"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-suggest-inertia-props-types-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
