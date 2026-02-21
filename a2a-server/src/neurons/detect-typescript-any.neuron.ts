import type { Neuron } from '../types/knowledge.types.js';

export const detectTypescriptAnyNeuron: Neuron = {
  id: 'neuron-detect-typescript-any',
  name: 'Detect Typescript Any',
  category: 'custom_pattern',
  triggers: ["any",":","TypeScript"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-typescript-any-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
