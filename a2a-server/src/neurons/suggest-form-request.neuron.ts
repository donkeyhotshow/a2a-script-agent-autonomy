import type { Neuron } from '../types/knowledge.types.js';

export const suggestFormRequestNeuron: Neuron = {
  id: 'neuron-suggest-form-request',
  name: 'Suggest Form Request',
  category: 'custom_pattern',
  triggers: ["FormRequest","validate","rules"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-suggest-form-request-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
