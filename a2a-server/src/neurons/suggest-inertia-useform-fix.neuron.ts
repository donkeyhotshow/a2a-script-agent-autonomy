import type { Neuron } from '../types/knowledge.types.js';

export const suggestInertiaUseformFixNeuron: Neuron = {
  id: 'neuron-suggest-inertia-useform-fix',
  name: 'Suggest Inertia Useform Fix',
  category: 'custom_pattern',
  triggers: ["useForm","Inertia","form"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-suggest-inertia-useform-fix-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
