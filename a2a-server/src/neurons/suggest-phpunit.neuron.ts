import type { Neuron } from '../types/knowledge.types.js';

export const suggestPhpunitNeuron: Neuron = {
  id: 'neuron-suggest-phpunit',
  name: 'Suggest Phpunit',
  category: 'custom_pattern',
  triggers: ["phpunit","test","TestCase"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-suggest-phpunit-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
