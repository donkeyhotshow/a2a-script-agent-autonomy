import type { Neuron } from '../types/knowledge.types.js';

export const suggestEagerLoadingNeuron: Neuron = {
  id: 'neuron-suggest-eager-loading',
  name: 'Suggest Eager Loading',
  category: 'custom_pattern',
  triggers: ["with(","load","eager","relation","belongsTo"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-suggest-eager-loading-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
