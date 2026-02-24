import type { Neuron } from '../types/knowledge.types.js';

export const detectN1QueriesNeuron: Neuron = {
  id: 'neuron-detect-n1-queries',
  name: 'Detect N1 Queries',
  category: 'custom_pattern',
  triggers: ["foreach", "->relation", "->load\\(", "with\\("],
  knowledge: {
    criticality: 'MEDIUM',
    description: 'N+1 query problem occurs when the code executes one query to fetch parent records and N additional queries to fetch related child records.',
    performance_impact: 'Exponentially increases DB load and latency as the number of records (N) grows.',
    expert_remediation: {
      laravel: 'Use ->with(["relation"]) for eager loading during the initial query.',
      prisma: 'Use { include: { relation: true } } or { select: { relation: true } }.'
    },
    detection_logic: 'Look for relation access inside loops or mapping functions without prior eager loading.'
  },
  actions: [
    { type: 'inject', target: 'neuron-detect-n1-queries-context' },
    { type: 'request_files', items: ['app/Http/Controllers/*.php', 'src/services/*.ts'] },
  ],
  triggersRegex: true,
  triggersMode: 'any',
  priority: 6,
};
