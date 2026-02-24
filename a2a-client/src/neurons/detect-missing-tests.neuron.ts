import type { Neuron } from '../types/knowledge.types.js';

export const detectMissingTestsNeuron: Neuron = {
  id: 'neuron-detect-missing-tests',
  name: 'Detect Missing Tests',
  category: 'custom_pattern',
  triggers: ["test","it(","describe","phpunit"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-missing-tests-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
