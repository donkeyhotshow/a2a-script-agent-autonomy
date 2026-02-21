import type { Neuron } from '../types/knowledge.types.js';

export const generateApiEndpointNeuron: Neuron = {
  id: 'neuron-generate-api-endpoint',
  name: 'Generate Api Endpoint',
  category: 'custom_pattern',
  triggers: ["api","Route::","controller"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-generate-api-endpoint-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
