import type { Neuron } from '../types/knowledge.types.js';

export const detectLaravelRoutesJsMismatchNeuron: Neuron = {
  id: 'neuron-detect-laravel-routes-js-mismatch',
  name: 'Detect Laravel Routes Js Mismatch',
  category: 'custom_pattern',
  triggers: ["route(","ziggy","routes"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-laravel-routes-js-mismatch-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
