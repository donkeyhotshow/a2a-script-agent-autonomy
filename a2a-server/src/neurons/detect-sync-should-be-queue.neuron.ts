import type { Neuron } from '../types/knowledge.types.js';

export const detectSyncShouldBeQueueNeuron: Neuron = {
  id: 'neuron-detect-sync-should-be-queue',
  name: 'Detect Sync Should Be Queue',
  category: 'custom_pattern',
  triggers: ["dispatch","Mail::","sync","queue"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-sync-should-be-queue-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
