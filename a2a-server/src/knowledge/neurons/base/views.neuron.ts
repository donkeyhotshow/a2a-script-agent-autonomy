import type { Neuron } from '../neuron.types.js';

export const viewsNeuron: Neuron = {
  id: 'neuron-views',
  name: 'Views',
  category: 'views',
  triggers: ['resources/views/', 'Inertia', 'resources/js/', '.vue'],
  knowledge: {
    entities: ['Inertia', 'Vue', 'Blade'],
    relations: ['Controller -> Inertia', 'Inertia -> Vue'],
    description: 'Laravel 11 views: Inertia, Vue, Blade',
  },
  store: {
    paths: { views: 'resources/views/', js: 'resources/js/' },
    stack: ['inertia', 'vue', 'tailwind'],
  },
};
