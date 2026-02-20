import type { Neuron } from '../neuron.types.js';

export const projectDetectorNeuron: Neuron = {
  id: 'neuron-project-detector',
  name: 'Project Detector',
  category: 'architecture',
  triggers: ['composer.json', 'laravel/framework'],
  knowledge: {
    entities: ['composer.json', 'package.json'],
    relations: [],
    description: 'Detects Laravel project type',
  },
  actions: [{ type: 'inject', target: 'neuron-context-laravel-11' }],
  store: {
    paths: {
      models: 'app/Models/',
      controllers: 'app/Http/Controllers/',
      views: 'resources/views/',
      routes: 'routes/',
    },
    stack: ['laravel', 'inertia', 'vue', 'tailwind'],
  },
};
