import type { Neuron } from '../types/knowledge.types.js';

export const detectAnyTypesNeuron: Neuron = {
  id: 'neuron-detect-any-types',
  name: 'Detect Any Types',
  category: 'custom_pattern',
  triggers: ["any","unknown","TypeScript"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-any-types-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
