import type { Neuron } from '../types/knowledge.types.js';

export const analyzeControllerSizeNeuron: Neuron = {
  id: 'neuron-analyze-controller-size',
  name: 'Analyze Controller Size',
  category: 'naming_convention',
  // В строгом AND-режиме достаточно признаков "controller" и "method" в пуле контента
  triggers: ['controller', 'method'],
  knowledge: {
    thresholds: {
      max_lines: 300,
      max_methods: 10,
      complexity_warning: 'High cyclomatic complexity or method count indicates a Single Responsibility Principle (SRP) violation.'
    },
    expert_remediation: [
      {
        action: 'Move to Service Layer',
        trigger: 'Business logic (calculations, complex DB updates) found in controller.'
      },
      {
        action: 'Move to Form Request',
        trigger: 'Validation rules taking more than 5 lines in the controller method.'
      },
      {
        action: 'Use Resource/DTO',
        trigger: 'Manual array mapping for JSON response found in multiple methods.'
      }
    ],
    ai_best_practice_hint: 'Discovery-first: Before refactoring, map all controller dependencies to ensure the new Service doesn’t create circular imports.'
  },
  actions: [
    { type: 'inject', target: 'neuron-analyze-controller-size-context' },
    { type: 'request_files', items: ['app/Http/Controllers/*.php', 'src/controllers/*.ts'] },
  ],
  triggersRegex: false,
  triggersMode: 'all',
  priority: 5,
};
