import type { Neuron } from '../types/knowledge.types.js';

export const detectVuePropsEmitsIssuesNeuron: Neuron = {
  id: 'neuron-detect-vue-props-emits-issues',
  name: 'Detect Vue Props Emits Issues',
  category: 'custom_pattern',
  triggers: ["defineProps","defineEmits","props"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-vue-props-emits-issues-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
