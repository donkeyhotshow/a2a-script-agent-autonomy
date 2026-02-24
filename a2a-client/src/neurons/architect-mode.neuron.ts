import type { Neuron } from '../types/knowledge.types.js';

export const architectModeNeuron: Neuron = {
  id: 'neuron-architect-mode',
  name: 'Architect Role',
  category: 'naming_convention',
  triggers: ['architect_mode'],
  knowledge: {
    role: 'System Architect',
    instructions: [
      'Analyze the entire project structure using the Repo Map.',
      'Define clear boundaries between components.',
      'Create a step-by-step implementation plan with file paths.',
      'Ensure zero circular dependencies in the proposed plan.'
    ],
    output_format: 'Markdown Implementation Plan with Goals and Proposed Changes.'
  },
  actions: [
    { type: 'inject', target: 'architect-expert-context' }
  ],
  triggersMode: 'any',
  priority: 100
};
