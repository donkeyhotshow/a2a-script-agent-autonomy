import type { Neuron } from '../types/knowledge.types.js';

export const detectDuplicatedCodeNeuron: Neuron = {
  id: 'neuron-detect-duplicated-code',
  name: 'Detect Duplicated Code',
  category: 'custom_pattern',
  triggers: ["duplicate", "copy-paste", "repeated", "redundant", "DRY"],
  knowledge: {
    criticality: 'MEDIUM',
    ai_discovery_rule: 'Discovery-first: Search across sibling directories for similar method signatures or logic blocks.',
    refactoring_patterns: [
      {
        pattern: 'Extract Method',
        detail: 'Move repeated logic into a private or protected method within the same class.'
      },
      {
        pattern: 'Utility Class/Service',
        detail: 'If logic is repeated across different domains, move it to a shared Utility or Service.'
      },
      {
        pattern: 'Base Class/Mixin',
        detail: 'Use inheritance or traits for shared state and behavior.'
      }
    ],
    expert_advice: [
      'Avoid "Over-Abstraction": Only deduplicate if the logic is truly shared, not just coincidentally similar.',
      'Rule of Three: Deduplicate when the same logic appears for the third time.',
      'Test Coverage: Ensure existing tests pass before and after deduplication to prevent regressions.'
    ]
  },
  actions: [
    { type: 'inject', target: 'neuron-detect-duplicated-code-context' },
    { type: 'request_files', items: ['src/**/*.ts', 'app/**/*.php'] },
  ],
  triggersMode: 'any',
  priority: 6,
};
