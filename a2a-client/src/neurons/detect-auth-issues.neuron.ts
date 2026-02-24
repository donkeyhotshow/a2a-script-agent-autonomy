import type { Neuron } from '../types/knowledge.types.js';

export const detectAuthIssuesNeuron: Neuron = {
  id: 'neuron-detect-auth-issues',
  name: 'Detect Auth Issues',
  category: 'custom_pattern',
  triggers: ["auth","login","password","hash"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-auth-issues-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
