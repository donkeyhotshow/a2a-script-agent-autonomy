import type { Neuron } from '../types/knowledge.types.js';

export const applyFormRequestNeuron: Neuron = {
  id: 'neuron-apply-form-request',
  name: 'Apply Form Request',
  category: 'custom_pattern',
  triggers: ["FormRequest","Request","validate"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-apply-form-request-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
