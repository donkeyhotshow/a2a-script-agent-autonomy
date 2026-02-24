import type { Neuron } from '../types/knowledge.types.js';

export const detectMissingIndexesNeuron: Neuron = {
  id: 'neuron-detect-missing-indexes',
  name: 'Detect Missing Indexes',
  category: 'custom_pattern',
  triggers: ["migration","Schema::","foreignId"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-missing-indexes-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
