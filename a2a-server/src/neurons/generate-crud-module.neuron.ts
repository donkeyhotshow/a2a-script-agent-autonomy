import type { Neuron } from '../types/knowledge.types.js';

export const generateCrudModuleNeuron: Neuron = {
  id: 'neuron-generate-crud-module',
  name: 'Generate Crud Module',
  category: 'custom_pattern',
  triggers: ["CRUD","create","update","delete"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-generate-crud-module-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
