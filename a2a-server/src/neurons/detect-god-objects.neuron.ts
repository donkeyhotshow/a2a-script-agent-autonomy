import type { Neuron } from '../types/knowledge.types.js';

export const detectGodObjectsNeuron: Neuron = {
  id: 'neuron-detect-god-objects',
  name: 'Detect God Objects',
  category: 'custom_pattern',
  triggers: ["class","method","Controller"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-god-objects-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
