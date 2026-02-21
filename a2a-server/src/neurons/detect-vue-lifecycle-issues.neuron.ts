import type { Neuron } from '../types/knowledge.types.js';

export const detectVueLifecycleIssuesNeuron: Neuron = {
  id: 'neuron-detect-vue-lifecycle-issues',
  name: 'Detect Vue Lifecycle Issues',
  category: 'custom_pattern',
  triggers: ["onMounted","onUnmounted","lifecycle"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-vue-lifecycle-issues-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
