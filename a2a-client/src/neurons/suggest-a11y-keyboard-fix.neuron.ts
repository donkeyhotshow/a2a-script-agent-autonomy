import type { Neuron } from '../types/knowledge.types.js';

export const suggestA11yKeyboardFixNeuron: Neuron = {
  id: 'neuron-suggest-a11y-keyboard-fix',
  name: 'Suggest A11y Keyboard Fix',
  category: 'custom_pattern',
  triggers: ["tabindex","keydown","focus"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-suggest-a11y-keyboard-fix-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
