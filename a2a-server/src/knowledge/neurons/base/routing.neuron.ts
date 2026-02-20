import type { Neuron } from '../neuron.types.js';

export const routingNeuron: Neuron = {
  id: 'neuron-routing',
  name: 'Routing',
  category: 'routing',
  triggers: ['routes/', 'Route::', 'Controller', 'app/Http/Controllers/'],
  knowledge: {
    entities: ['Route', 'Controller', 'Middleware'],
    relations: ['Route -> Controller', 'middleware chain'],
    description: 'Laravel 11 routing: routes, controllers, middleware',
  },
  store: {
    paths: { routes: 'routes/', controllers: 'app/Http/Controllers/' },
    conventions: ['web.php', 'api.php', 'resource'],
  },
};
