import type { Neuron } from '../types/knowledge.types.js';

export const suggestVuePropsEmitsNeuron: Neuron = {
  id: 'neuron-suggest-vue-props-emits',
  name: 'Suggest Vue Props Emits',
  category: 'custom_pattern',
  triggers: ["defineProps","defineEmits","props"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-suggest-vue-props-emits-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
