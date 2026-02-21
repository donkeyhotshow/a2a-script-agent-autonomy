import type { Neuron } from '../types/knowledge.types.js';

export const detectBladeComponentsNeuron: Neuron = {
  id: 'neuron-detect-blade-components',
  name: 'Detect Blade Components',
  category: 'custom_pattern',
  triggers: ["<x-","Blade","component"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-blade-components-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
