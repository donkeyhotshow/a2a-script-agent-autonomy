import type { Neuron } from '../types/knowledge.types.js';

export const generateFormNeuron: Neuron = {
  id: 'neuron-generate-form',
  name: 'Generate Form',
  category: 'custom_pattern',
  triggers: ["form","FormRequest","validate"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-generate-form-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
