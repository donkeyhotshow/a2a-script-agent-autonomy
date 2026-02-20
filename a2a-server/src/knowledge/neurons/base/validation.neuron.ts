import type { Neuron } from '../neuron.types.js';

export const validationNeuron: Neuron = {
  id: 'neuron-validation',
  name: 'Validation',
  category: 'validation',
  triggers: ['FormRequest', 'app/Http/Requests/', 'rules()', 'validate('],
  knowledge: {
    entities: ['FormRequest', 'Validator', 'rules'],
    relations: ['extends FormRequest', 'uses Validator'],
    description: 'Laravel 11 validation: FormRequest, rules, validate',
  },
  store: {
    paths: { requests: 'app/Http/Requests/' },
    conventions: ['authorize()', 'rules()'],
  },
};
