import type { Neuron } from '../types/knowledge.types.js';

export const detectDuplicatedCodeNeuron: Neuron = {
  id: 'neuron-detect-duplicated-code',
  name: 'Detect Duplicated Code',
  category: 'custom_pattern',
  triggers: ["copy","duplicate","similar"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-duplicated-code-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
