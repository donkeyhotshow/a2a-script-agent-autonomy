import type { Neuron } from '../types/knowledge.types.js';

export const detectMassAssignmentRiskNeuron: Neuron = {
  id: 'neuron-detect-mass-assignment-risk',
  name: 'Detect Mass Assignment Risk',
  category: 'custom_pattern',
  triggers: ["$fillable","create","update","Model"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-mass-assignment-risk-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
