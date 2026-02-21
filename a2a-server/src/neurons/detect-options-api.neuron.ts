import type { Neuron } from '../types/knowledge.types.js';

export const detectOptionsApiNeuron: Neuron = {
  id: 'neuron-detect-options-api',
  name: 'Detect Options Api',
  category: 'custom_pattern',
  triggers: ["data()","methods","mounted"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-options-api-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
