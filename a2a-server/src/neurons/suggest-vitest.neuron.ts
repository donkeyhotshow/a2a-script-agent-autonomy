import type { Neuron } from '../types/knowledge.types.js';

export const suggestVitestNeuron: Neuron = {
  id: 'neuron-suggest-vitest',
  name: 'Suggest Vitest',
  category: 'custom_pattern',
  triggers: ["vitest","test","describe"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-suggest-vitest-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
