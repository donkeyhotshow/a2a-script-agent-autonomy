import type { Neuron } from '../types/knowledge.types.js';

export const detectA11yMissingAriaNeuron: Neuron = {
  id: 'neuron-detect-a11y-missing-aria',
  name: 'Detect A11y Missing Aria',
  category: 'custom_pattern',
  triggers: ["aria-","role=","button"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-a11y-missing-aria-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
