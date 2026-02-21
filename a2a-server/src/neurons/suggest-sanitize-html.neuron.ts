import type { Neuron } from '../types/knowledge.types.js';

export const suggestSanitizeHtmlNeuron: Neuron = {
  id: 'neuron-suggest-sanitize-html',
  name: 'Suggest Sanitize Html',
  category: 'custom_pattern',
  triggers: ["v-html","innerHTML","sanitize"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-suggest-sanitize-html-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
