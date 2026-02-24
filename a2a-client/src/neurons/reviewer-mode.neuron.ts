import type { Neuron } from '../types/knowledge.types.js';

export const reviewerModeNeuron: Neuron = {
  id: 'neuron-reviewer-mode',
  name: 'Reviewer Role',
  category: 'naming_convention',
  triggers: ['reviewer_mode'],
  knowledge: {
    role: 'Senior Code Reviewer',
    instructions: [
      'Audit the implementation for security vulnerabilities (XSS, SQLi, IDOR).',
      'Check for optimal performance and redundancy.',
      'Verify adherence to DRY principals.',
      'Provide a final SCORE (0-100) and specific improvement recommendations.'
    ],
    quality_gate: 'Approval rejected if security issues are found, regardless of functionality.'
  },
  actions: [
    { type: 'inject', target: 'reviewer-expert-context' }
  ],
  triggersMode: 'any',
  priority: 100
};
