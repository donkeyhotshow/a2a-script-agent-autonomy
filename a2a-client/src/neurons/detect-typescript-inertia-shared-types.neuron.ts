import type { Neuron } from '../types/knowledge.types.js';

export const detectTypescriptInertiaSharedTypesNeuron: Neuron = {
  id: 'neuron-detect-typescript-inertia-shared-types',
  name: 'Detect Typescript Inertia Shared Types',
  category: 'custom_pattern',
  triggers: ["Inertia","PageProps","Shared"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-typescript-inertia-shared-types-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
