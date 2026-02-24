import type { Neuron } from '../types/knowledge.types.js';

export const detectVifVshowMisuseNeuron: Neuron = {
  id: 'neuron-detect-vif-vshow-misuse',
  name: 'Detect Vif Vshow Misuse',
  category: 'custom_pattern',
  triggers: ["v-if","v-show","v-for"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-vif-vshow-misuse-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
