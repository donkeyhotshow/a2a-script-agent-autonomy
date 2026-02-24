import type { Neuron } from '../types/knowledge.types.js';

export const detectVueLifecycleIssuesNeuron: Neuron = {
  id: 'neuron-detect-vue-lifecycle-issues',
  name: 'Detect Vue Lifecycle Issues',
  category: 'framework',
  triggers: ["onMounted", "onUnmounted", "addEventListener", "setInterval", "setTimeout", "window.on"],
  knowledge: {
    common_pitfalls: [
      {
        issue: 'Memory Leaks',
        description: 'Global event listeners or intervals not cleared in onUnmounted.',
        solution: 'Use onUnmounted(() => { /* cleanup */ }) to remove event listeners or clear intervals.'
      },
      {
        issue: 'Async onMounted',
        description: 'Assuming state is ready immediately after an async call in onMounted.',
        solution: 'Use loading states or check for null/undefined in the template and other methods.'
      }
    ],
    expert_rules: [
      'Prefer using "watchEffect" or "watch" with "immediate: true" instead of complex onMounted logic where possible.',
      'Keep lifecycle hooks clean; delegate complex logic to separate functions or composables.'
    ],
    remediation: 'Verify that every addEventListener in onMounted has a corresponding removeEventListener in onUnmounted.'
  },
  actions: [
    { type: 'inject', target: 'neuron-detect-vue-lifecycle-issues-context' },
    { type: 'request_files', items: ['resources/js/**/*.vue', 'src/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 7,
};
