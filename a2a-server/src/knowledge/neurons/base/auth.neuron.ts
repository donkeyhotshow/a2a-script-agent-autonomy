import type { Neuron } from '../neuron.types.js';

export const authNeuron: Neuron = {
  id: 'neuron-auth',
  name: 'Auth',
  category: 'auth',
  triggers: ['Policy', 'Guard', 'app/Policies/', 'middleware(\'auth\')'],
  knowledge: {
    entities: ['Policy', 'Guard', 'Gate'],
    relations: ['implements Policy', 'uses Guard'],
    description: 'Laravel 11 auth: Policy, Guard, Gate',
  },
  store: {
    paths: { policies: 'app/Policies/' },
    conventions: ['before()', 'authorize()'],
  },
};
