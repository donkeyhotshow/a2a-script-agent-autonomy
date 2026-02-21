import type { Neuron } from '../types/knowledge.types.js';

export const detectInertiaUseformIssuesNeuron: Neuron = {
  id: 'neuron-detect-inertia-useform-issues',
  name: 'Detect Inertia Useform Issues',
  category: 'custom_pattern',
  triggers: ["useForm","Inertia","form"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-inertia-useform-issues-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
