import type { Neuron } from '../types/knowledge.types.js';

export const suggestMigrationIndexesNeuron: Neuron = {
  id: 'neuron-suggest-migration-indexes',
  name: 'Suggest Migration Indexes',
  category: 'custom_pattern',
  triggers: ["migration","index","foreignId"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-suggest-migration-indexes-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
