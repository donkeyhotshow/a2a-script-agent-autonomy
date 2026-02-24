import type { Neuron } from '../types/knowledge.types.js';

export const suggestProvideInjectNeuron: Neuron = {
  id: 'neuron-suggest-provide-inject',
  name: 'Suggest Provide Inject',
  category: 'custom_pattern',
  triggers: ["props","provide","inject"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-suggest-provide-inject-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
