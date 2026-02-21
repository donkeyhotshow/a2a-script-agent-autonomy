import type { Neuron } from '../types/knowledge.types.js';

export const detectSecurityVHtmlNeuron: Neuron = {
  id: 'neuron-detect-security-v-html',
  name: 'Detect Security V Html',
  category: 'custom_pattern',
  triggers: ["v-html","innerHTML","dangerouslySetInnerHTML"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-security-v-html-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
