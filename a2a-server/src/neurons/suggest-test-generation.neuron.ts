import type { Neuron } from '../types/knowledge.types.js';

export const suggestTestGenerationNeuron: Neuron = {
  id: 'neuron-suggest-test-generation',
  name: 'Suggest Test Generation',
  category: 'custom_pattern',
  triggers: ["test","it(","describe"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-suggest-test-generation-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
