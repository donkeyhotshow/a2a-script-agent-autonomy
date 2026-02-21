import type { Neuron } from '../types/knowledge.types.js';

export const suggestPasswordHashingNeuron: Neuron = {
  id: 'neuron-suggest-password-hashing',
  name: 'Suggest Password Hashing',
  category: 'custom_pattern',
  triggers: ["password","bcrypt","Hash::"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-suggest-password-hashing-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
