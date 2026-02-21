import type { Neuron } from '../types/knowledge.types.js';

export const suggestTailwindAlternativesNeuron: Neuron = {
  id: 'neuron-suggest-tailwind-alternatives',
  name: 'Suggest Tailwind Alternatives',
  category: 'custom_pattern',
  triggers: ["style=","class=","tailwind"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-suggest-tailwind-alternatives-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
