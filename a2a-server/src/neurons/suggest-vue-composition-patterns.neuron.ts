import type { Neuron } from '../types/knowledge.types.js';

export const suggestVueCompositionPatternsNeuron: Neuron = {
  id: 'neuron-suggest-vue-composition-patterns',
  name: 'Suggest Vue Composition Patterns',
  category: 'custom_pattern',
  triggers: ["ref","reactive","computed"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-suggest-vue-composition-patterns-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
