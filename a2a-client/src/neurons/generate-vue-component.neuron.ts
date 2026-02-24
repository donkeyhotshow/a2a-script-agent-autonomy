import type { Neuron } from '../types/knowledge.types.js';

export const generateVueComponentNeuron: Neuron = {
  id: 'neuron-generate-vue-component',
  name: 'Generate Vue Component',
  category: 'custom_pattern',
  triggers: ["vue","component","defineComponent"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-generate-vue-component-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
