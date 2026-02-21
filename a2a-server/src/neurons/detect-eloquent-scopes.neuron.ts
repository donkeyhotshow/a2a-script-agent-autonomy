import type { Neuron } from '../types/knowledge.types.js';

export const detectEloquentScopesNeuron: Neuron = {
  id: 'neuron-detect-eloquent-scopes',
  name: 'Detect Eloquent Scopes',
  category: 'custom_pattern',
  triggers: ["scope","Model","query"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-eloquent-scopes-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
