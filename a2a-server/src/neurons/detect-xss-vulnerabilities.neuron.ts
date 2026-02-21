import type { Neuron } from '../types/knowledge.types.js';

export const detectXssVulnerabilitiesNeuron: Neuron = {
  id: 'neuron-detect-xss-vulnerabilities',
  name: 'Detect Xss Vulnerabilities',
  category: 'custom_pattern',
  triggers: ["v-html","innerHTML","eval"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-xss-vulnerabilities-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
