import type { Neuron } from '../types/knowledge.types.js';

export const suggestTailwindResponsiveNeuron: Neuron = {
  id: 'neuron-suggest-tailwind-responsive',
  name: 'Suggest Tailwind Responsive',
  category: 'custom_pattern',
  triggers: ["sm:","md:","lg:","responsive"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-suggest-tailwind-responsive-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
