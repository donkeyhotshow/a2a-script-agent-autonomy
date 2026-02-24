import type { Neuron } from '../types/knowledge.types.js';

export const applyEagerLoadingNeuron: Neuron = {
  id: 'neuron-apply-eager-loading',
  name: 'Apply Eager Loading',
  category: 'custom_pattern',
  triggers: ["with(","eager","relation"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-apply-eager-loading-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
