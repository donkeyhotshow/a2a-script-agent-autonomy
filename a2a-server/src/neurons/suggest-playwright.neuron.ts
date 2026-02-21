import type { Neuron } from '../types/knowledge.types.js';

export const suggestPlaywrightNeuron: Neuron = {
  id: 'neuron-suggest-playwright',
  name: 'Suggest Playwright',
  category: 'custom_pattern',
  triggers: ["playwright","e2e","test"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-suggest-playwright-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
