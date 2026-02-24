import type { Neuron } from '../types/knowledge.types.js';

export const detectMissingFeatureTestsNeuron: Neuron = {
  id: 'neuron-detect-missing-feature-tests',
  name: 'Detect Missing Feature Tests',
  category: 'custom_pattern',
  triggers: ["test","Feature","Http"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-missing-feature-tests-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
