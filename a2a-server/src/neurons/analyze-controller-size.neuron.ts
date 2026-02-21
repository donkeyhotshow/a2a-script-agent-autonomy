import type { Neuron } from '../types/knowledge.types.js';

export const analyzeControllerSizeNeuron: Neuron = {
  id: 'neuron-analyze-controller-size',
  name: 'Analyze Controller Size',
  category: 'custom_pattern',
  triggers: ["Controller","class","method"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-analyze-controller-size-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
