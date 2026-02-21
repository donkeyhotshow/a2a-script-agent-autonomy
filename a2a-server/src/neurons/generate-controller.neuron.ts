import type { Neuron } from '../types/knowledge.types.js';

export const generateControllerNeuron: Neuron = {
  id: 'neuron-generate-controller',
  name: 'Generate Controller',
  category: 'custom_pattern',
  triggers: ["Controller","extends","Route"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-generate-controller-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
