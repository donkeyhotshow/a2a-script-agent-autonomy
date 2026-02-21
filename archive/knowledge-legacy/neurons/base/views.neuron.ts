import type { Neuron } from '../neuron.types.js';

export const viewsNeuron: Neuron = {
  id: 'neuron-views',
  name: 'Views',
  category: 'views',
  triggers: ['Inertia', '.vue', 'resources/js', 'Inertia\\'],
  knowledge: {
    entities: ['Inertia', 'Vue', 'Blade'],
    relations: ['Controller -> Inertia', 'Inertia -> Vue'],
    description: 'Laravel 11 views: Inertia, Vue, Blade',
  },
  actions: [{ type: 'inject', target: 'neuron-context-views' }],
  store: {
    paths: { views: 'resources/views/', js: 'resources/js/' },
    stack: ['inertia', 'vue', 'tailwind'],
  },
};
