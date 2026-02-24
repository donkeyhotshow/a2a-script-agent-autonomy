import type { Neuron } from '../types/knowledge.types.js';

export const detectPropDrillingNeuron: Neuron = {
  id: 'neuron-detect-prop-drilling',
  name: 'Detect Prop Drilling',
  category: 'custom_pattern',
  triggers: ["props","emit","provide","inject"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-prop-drilling-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
