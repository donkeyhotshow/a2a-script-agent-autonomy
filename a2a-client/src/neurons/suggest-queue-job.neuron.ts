import type { Neuron } from '../types/knowledge.types.js';

export const suggestQueueJobNeuron: Neuron = {
  id: 'neuron-suggest-queue-job',
  name: 'Suggest Queue Job',
  category: 'custom_pattern',
  triggers: ["Job","dispatch","queue"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-suggest-queue-job-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
