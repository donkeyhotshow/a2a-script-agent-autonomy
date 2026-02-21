import type { Neuron } from '../types/knowledge.types.js';

export const detectMissingLazyLoadingNeuron: Neuron = {
  id: 'neuron-detect-missing-lazy-loading',
  name: 'Detect Missing Lazy Loading',
  category: 'custom_pattern',
  triggers: ["img","loading","lazy"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-missing-lazy-loading-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
