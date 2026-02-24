import type { Neuron } from '../types/knowledge.types.js';

export const suggestSelectColumnsNeuron: Neuron = {
  id: 'neuron-suggest-select-columns',
  name: 'Suggest Select Columns',
  category: 'custom_pattern',
  triggers: ["select","get()","selectRaw"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-suggest-select-columns-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
