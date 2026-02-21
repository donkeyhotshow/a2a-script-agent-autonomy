import type { Neuron } from '../types/knowledge.types.js';

export const detectN1QueriesNeuron: Neuron = {
  id: 'neuron-detect-n1-queries',
  name: 'Detect N1 Queries',
  category: 'custom_pattern',
  triggers: ["with(","->load","N+1","eager","relation"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-n1-queries-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
