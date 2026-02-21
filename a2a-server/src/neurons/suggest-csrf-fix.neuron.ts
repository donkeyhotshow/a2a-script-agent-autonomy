import type { Neuron } from '../types/knowledge.types.js';

export const suggestCsrfFixNeuron: Neuron = {
  id: 'neuron-suggest-csrf-fix',
  name: 'Suggest Csrf Fix',
  category: 'custom_pattern',
  triggers: ["csrf","@csrf","form"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-suggest-csrf-fix-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
