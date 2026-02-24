import type { Neuron } from '../types/knowledge.types.js';

export const detectApiResourcesNeuron: Neuron = {
  id: 'neuron-detect-api-resources',
  name: 'Detect Api Resources',
  category: 'custom_pattern',
  triggers: ["Resource","JsonResource","toArray"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-api-resources-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
