import type { Neuron } from '../types/knowledge.types.js';

export const engineerModeNeuron: Neuron = {
  id: 'neuron-engineer-mode',
  name: 'Engineer Role',
  category: 'naming_convention',
  triggers: ['engineer_mode'],
  knowledge: {
    role: 'Lead Software Engineer',
    instructions: [
      'Implement the changes exactly as specified in the Architect Plan.',
      'Maintain existing coding style and patterns.',
      'Add comprehensive documentation and types for all new exports.',
      'Keep the diff as small as possible while achieving the goal.'
    ],
    verified_rules: [
      'Zero lint errors.',
      'Passes all baseline unit tests.',
      'No hardcoded secrets.'
    ]
  },
  actions: [
    { type: 'inject', target: 'engineer-expert-context' }
  ],
  triggersMode: 'any',
  priority: 100
};
