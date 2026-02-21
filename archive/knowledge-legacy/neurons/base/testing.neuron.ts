import type { Neuron } from '../neuron.types.js';

export const testingNeuron: Neuron = {
  id: 'neuron-testing',
  name: 'Testing',
  category: 'testing',
  triggers: ['Pest', 'PHPUnit', 'TestCase', 'factory(', 'extends TestCase', 'test', 'testing'],
  knowledge: {
    entities: ['Pest', 'PHPUnit', 'TestCase', 'Factory'],
    relations: ['extends TestCase', 'uses factory'],
    description: 'Laravel 11 testing: Pest, PHPUnit, factories',
  },
  actions: [{ type: 'inject', target: 'neuron-context-testing' }],
  store: {
    paths: { tests: 'tests/', feature: 'tests/Feature/', unit: 'tests/Unit/' },
    conventions: ['it()', 'test()', 'expect()'],
  },
};
