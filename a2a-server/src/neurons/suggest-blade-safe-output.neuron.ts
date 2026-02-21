import type { Neuron } from '../types/knowledge.types.js';

export const suggestBladeSafeOutputNeuron: Neuron = {
  id: 'neuron-suggest-blade-safe-output',
  name: 'Suggest Blade Safe Output',
  category: 'custom_pattern',
  triggers: ["{!!","Blade","html"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-suggest-blade-safe-output-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
