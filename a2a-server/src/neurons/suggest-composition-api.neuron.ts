import type { Neuron } from '../types/knowledge.types.js';

export const suggestCompositionApiNeuron: Neuron = {
  id: 'neuron-suggest-composition-api',
  name: 'Suggest Composition Api',
  category: 'custom_pattern',
  triggers: ["data()","setup","ref"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-suggest-composition-api-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
