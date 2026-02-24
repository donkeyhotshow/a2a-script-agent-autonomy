import type { Neuron } from '../types/knowledge.types.js';

export const suggestRouteMiddlewareNeuron: Neuron = {
  id: 'neuron-suggest-route-middleware',
  name: 'Suggest Route Middleware',
  category: 'custom_pattern',
  triggers: ["Route::","middleware","auth"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-suggest-route-middleware-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
