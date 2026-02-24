import type { Neuron } from '../types/knowledge.types.js';

export const detectEloquentSelectAllNeuron: Neuron = {
  id: 'neuron-detect-eloquent-select-all',
  name: 'Detect Eloquent Select All',
  category: 'custom_pattern',
  triggers: ["Model::all","get()","select"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-eloquent-select-all-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
