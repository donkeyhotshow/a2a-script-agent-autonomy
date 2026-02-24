import type { Neuron } from '../types/knowledge.types.js';

export const detectTypescriptMissingPropsTypesNeuron: Neuron = {
  id: 'neuron-detect-typescript-missing-props-types',
  name: 'Detect Typescript Missing Props Types',
  category: 'custom_pattern',
  triggers: ["defineProps","interface","type"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-typescript-missing-props-types-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
