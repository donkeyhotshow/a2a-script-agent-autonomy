import type { Neuron } from '../types/knowledge.types.js';

export const suggestTypescriptPropsTypesNeuron: Neuron = {
  id: 'neuron-suggest-typescript-props-types',
  name: 'Suggest Typescript Props Types',
  category: 'custom_pattern',
  triggers: ["defineProps","interface","type"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-suggest-typescript-props-types-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
