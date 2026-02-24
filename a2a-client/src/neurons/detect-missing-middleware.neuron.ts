import type { Neuron } from '../types/knowledge.types.js';

export const detectMissingMiddlewareNeuron: Neuron = {
  id: 'neuron-detect-missing-middleware',
  name: 'Detect Missing Middleware',
  category: 'custom_pattern',
  triggers: ["Route::","middleware","routes/"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-missing-middleware-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
