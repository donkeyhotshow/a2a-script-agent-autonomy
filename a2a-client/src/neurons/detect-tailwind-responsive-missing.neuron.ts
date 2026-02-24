import type { Neuron } from '../types/knowledge.types.js';

export const detectTailwindResponsiveMissingNeuron: Neuron = {
  id: 'neuron-detect-tailwind-responsive-missing',
  name: 'Detect Tailwind Responsive Missing',
  category: 'custom_pattern',
  triggers: ["sm:","md:","lg:","responsive"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-tailwind-responsive-missing-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
