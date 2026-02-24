import type { Neuron } from '../types/knowledge.types.js';

export const suggestInertiaPagePropsTypesNeuron: Neuron = {
  id: 'neuron-suggest-inertia-page-props-types',
  name: 'Suggest Inertia Page Props Types',
  category: 'custom_pattern',
  triggers: ["Inertia","PageProps","Shared"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-suggest-inertia-page-props-types-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
