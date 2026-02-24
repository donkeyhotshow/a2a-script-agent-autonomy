import type { Neuron } from '../types/knowledge.types.js';

export const detectTailwindInlineStylesNeuron: Neuron = {
  id: 'neuron-detect-tailwind-inline-styles',
  name: 'Detect Tailwind Inline Styles',
  category: 'custom_pattern',
  triggers: ["style=","class=","tailwind"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-tailwind-inline-styles-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
