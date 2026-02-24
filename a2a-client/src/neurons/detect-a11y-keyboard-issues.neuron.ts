import type { Neuron } from '../types/knowledge.types.js';

export const detectA11yKeyboardIssuesNeuron: Neuron = {
  id: 'neuron-detect-a11y-keyboard-issues',
  name: 'Detect A11y Keyboard Issues',
  category: 'custom_pattern',
  triggers: ["tabindex","keydown","focus"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-a11y-keyboard-issues-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
