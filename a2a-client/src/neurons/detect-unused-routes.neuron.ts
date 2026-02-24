import type { Neuron } from '../types/knowledge.types.js';

export const detectUnusedRoutesNeuron: Neuron = {
  id: 'neuron-detect-unused-routes',
  name: 'Detect Unused Routes',
  category: 'custom_pattern',
  triggers: ["Route::","routes/","web.php"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-unused-routes-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
