import type { Neuron } from '../types/knowledge.types.js';

export const suggestXssFixNeuron: Neuron = {
  id: 'neuron-suggest-xss-fix',
  name: 'Suggest Xss Fix',
  category: 'custom_pattern',
  triggers: ["v-html","innerHTML","escape"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-suggest-xss-fix-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
