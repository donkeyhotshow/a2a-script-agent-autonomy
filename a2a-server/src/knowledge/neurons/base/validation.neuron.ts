import type { Neuron } from '../neuron.types.js';

export const validationNeuron: Neuron = {
  id: 'neuron-validation',
  name: 'Validation',
  category: 'validation',
  triggers: ['FormRequest', 'rules()', 'validate(', 'Http\\Requests', 'validation', 'validate', 'rules'],
  knowledge: {
    entities: ['FormRequest', 'Validator', 'rules'],
    relations: ['extends FormRequest', 'uses Validator'],
    description: 'Laravel 11 validation: FormRequest, rules, validate',
  },
  actions: [
    { type: 'inject', target: 'neuron-context-validation' },
    { type: 'request_files', items: ['app/Http/Requests/*.php'] },
  ],
  store: {
    paths: { requests: 'app/Http/Requests/' },
    conventions: ['authorize()', 'rules()'],
  },
};
