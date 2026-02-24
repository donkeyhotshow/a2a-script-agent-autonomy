import type { Neuron } from '../types/knowledge.types.js';

export const detectMemoryLeakPatternsNeuron: Neuron = {
  id: 'neuron-detect-memory-leak-patterns',
  name: 'Detect Memory Leak Patterns',
  category: 'custom_pattern',
  triggers: ["addEventListener","onUnmounted","watch"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-memory-leak-patterns-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
