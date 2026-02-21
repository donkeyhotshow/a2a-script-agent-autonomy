import type { Neuron } from '../types/knowledge.types.js';

export const detectTailwindInvalidClassesNeuron: Neuron = {
  id: 'neuron-detect-tailwind-invalid-classes',
  name: 'Detect Tailwind Invalid Classes',
  category: 'custom_pattern',
  triggers: ["class=","tailwind","className"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-tailwind-invalid-classes-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
