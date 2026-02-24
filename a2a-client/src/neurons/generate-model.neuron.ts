import type { Neuron } from '../types/knowledge.types.js';

export const generateModelNeuron: Neuron = {
  id: 'neuron-generate-model',
  name: 'Generate Model',
  category: 'custom_pattern',
  triggers: ["Model","extends","Eloquent"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-generate-model-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
