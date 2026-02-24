import type { Neuron } from '../types/knowledge.types.js';

export const detectFormRequestDedupNeuron: Neuron = {
  id: 'neuron-detect-form-request-dedup',
  name: 'Detect Form Request Dedup',
  category: 'custom_pattern',
  triggers: ["FormRequest","rules","authorize"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-form-request-dedup-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
