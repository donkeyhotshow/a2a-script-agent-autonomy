import type { Neuron } from '../types/knowledge.types.js';

export const suggestTypescriptTypesNeuron: Neuron = {
  id: 'neuron-suggest-typescript-types',
  name: 'Suggest Typescript Types',
  category: 'custom_pattern',
  triggers: ["any","interface","type"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-suggest-typescript-types-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
