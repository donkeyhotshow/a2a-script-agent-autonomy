import type { Neuron } from '../types/knowledge.types.js';

export const detectSecretsInCodeNeuron: Neuron = {
  id: 'neuron-detect-secrets-in-code',
  name: 'Detect Secrets In Code',
  category: 'custom_pattern',
  triggers: ["password","secret","api_key","token"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-secrets-in-code-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
