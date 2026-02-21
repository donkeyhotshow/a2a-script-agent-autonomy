import type { Neuron } from '../types/knowledge.types.js';

export const suggestVueLifecycleFixNeuron: Neuron = {
  id: 'neuron-suggest-vue-lifecycle-fix',
  name: 'Suggest Vue Lifecycle Fix',
  category: 'custom_pattern',
  triggers: ["onMounted","onUnmounted","watch"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-suggest-vue-lifecycle-fix-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
