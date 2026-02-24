import type { Neuron } from '../types/knowledge.types.js';

export const suggestTailwindValidClassesNeuron: Neuron = {
  id: 'neuron-suggest-tailwind-valid-classes',
  name: 'Suggest Tailwind Valid Classes',
  category: 'custom_pattern',
  triggers: ["class=","tailwind"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-suggest-tailwind-valid-classes-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
