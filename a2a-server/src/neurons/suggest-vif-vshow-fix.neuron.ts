import type { Neuron } from '../types/knowledge.types.js';

export const suggestVifVshowFixNeuron: Neuron = {
  id: 'neuron-suggest-vif-vshow-fix',
  name: 'Suggest Vif Vshow Fix',
  category: 'custom_pattern',
  triggers: ["v-if","v-show"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-suggest-vif-vshow-fix-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
