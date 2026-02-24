import type { Neuron } from '../types/knowledge.types.js';

export const detectBladeXssNeuron: Neuron = {
  id: 'neuron-detect-blade-xss',
  name: 'Detect Blade Xss',
  category: 'custom_pattern',
  triggers: ["{!!","Blade","html","@"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-blade-xss-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
