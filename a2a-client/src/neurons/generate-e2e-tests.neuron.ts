import type { Neuron } from '../types/knowledge.types.js';

export const generateE2eTestsNeuron: Neuron = {
  id: 'neuron-generate-e2e-tests',
  name: 'Generate E2e Tests',
  category: 'custom_pattern',
  triggers: ["test","e2e","playwright","cypress"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-generate-e2e-tests-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
