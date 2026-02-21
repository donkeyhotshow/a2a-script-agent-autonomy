import type { Neuron } from '../neuron.types.js';

export const bootstrapNeuron: Neuron = {
  id: 'neuron-bootstrap',
  name: 'Bootstrap',
  category: 'architecture',
  triggers: [],
  activatesWhenEmpty: true,
  knowledge: {
    entities: [],
    relations: [],
    description: 'Generic discovery when no context available',
  },
  actions: [
    {
      type: 'request_files',
      items: ['composer.json', 'package.json', 'app/', 'resources/'],
    },
  ],
};
