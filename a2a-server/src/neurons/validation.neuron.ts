/**
 * Validation neuron – activates for validation/FormRequest/Laravel context.
 * Etalon: docs/etalon-neuron-activation.md scenario B.
 */

import type { Neuron } from '../types/knowledge.types.js';

export const validationNeuron: Neuron = {
  id: 'neuron-validation-formrequest',
  name: 'Validation / FormRequest',
  category: 'framework',
  triggers: ['validation', 'formrequest', 'laravel'],
  knowledge: {
    description: 'Activates when task or architecture involves validation or FormRequest (Laravel)',
  },
  actions: [{ type: 'inject', target: 'validation-context' }],
  triggersMode: 'any',
  priority: 5,
};
