import type { Neuron } from '../types/knowledge.types.js';

export const suggestServiceLayerNeuron: Neuron = {
  id: 'neuron-suggest-service-layer',
  name: 'Suggest Service Layer',
  category: 'custom_pattern',
  triggers: ["Controller","Service","logic"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-suggest-service-layer-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
