import type { Neuron } from '../types/knowledge.types.js';

export const generateMigrationNeuron: Neuron = {
  id: 'neuron-generate-migration',
  name: 'Generate Migration',
  category: 'custom_pattern',
  triggers: ["migration","Schema::","create"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-generate-migration-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
