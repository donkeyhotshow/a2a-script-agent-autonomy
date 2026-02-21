import type { Neuron } from '../types/knowledge.types.js';

export const generateTsTypesNeuron: Neuron = {
  id: 'neuron-generate-ts-types',
  name: 'Generate Ts Types',
  category: 'custom_pattern',
  triggers: ["interface","type","TypeScript"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-generate-ts-types-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
