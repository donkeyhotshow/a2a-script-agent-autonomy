import type { Neuron } from '../types/knowledge.types.js';

export const suggestLazyLoadingNeuron: Neuron = {
  id: 'neuron-suggest-lazy-loading',
  name: 'Suggest Lazy Loading',
  category: 'custom_pattern',
  triggers: ["img","loading","IntersectionObserver"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-suggest-lazy-loading-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
