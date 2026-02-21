import type { Neuron } from '../types/knowledge.types.js';

export const generateUnitTestsNeuron: Neuron = {
  id: 'neuron-generate-unit-tests',
  name: 'Generate Unit Tests',
  category: 'custom_pattern',
  triggers: ["test","it(","describe"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-generate-unit-tests-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
