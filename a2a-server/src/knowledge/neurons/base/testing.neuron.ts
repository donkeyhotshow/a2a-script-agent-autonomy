import type { Neuron } from '../neuron.types.js';

export const testingNeuron: Neuron = {
  id: 'neuron-testing',
  name: 'Testing',
  category: 'testing',
  triggers: ['tests/', 'Pest', 'PHPUnit', 'TestCase', 'factory('],
  knowledge: {
    entities: ['Pest', 'PHPUnit', 'TestCase', 'Factory'],
    relations: ['extends TestCase', 'uses factory'],
    description: 'Laravel 11 testing: Pest, PHPUnit, factories',
  },
  store: {
    paths: { tests: 'tests/', feature: 'tests/Feature/', unit: 'tests/Unit/' },
    conventions: ['it()', 'test()', 'expect()'],
  },
};
