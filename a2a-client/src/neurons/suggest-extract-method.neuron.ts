import type { Neuron } from '../types/knowledge.types.js';

export const suggestExtractMethodNeuron: Neuron = {
  id: 'neuron-suggest-extract-method',
  name: 'Suggest Extract Method',
  category: 'custom_pattern',
  triggers: ["method","extract","refactor"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-suggest-extract-method-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
