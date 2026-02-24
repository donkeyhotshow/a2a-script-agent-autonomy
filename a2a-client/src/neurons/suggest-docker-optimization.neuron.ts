import type { Neuron } from '../types/knowledge.types.js';

export const suggestDockerOptimizationNeuron: Neuron = {
  id: 'neuron-suggest-docker-optimization',
  name: 'Suggest Docker Optimization',
  category: 'custom_pattern',
  triggers: ["ENV", "VOLUME", "EXPOSE", "ENTRYPOINT", "CMD"],
  knowledge: {
    topic: 'Docker Performance and Maintenance',
    layer_caching: [
      'Copy package.json and install dependencies BEFORE copying the rest of the source code to leverage Docker layer caching.',
      'Ordering matters: place layers that change infrequently at the top.'
    ],
    environment_management: [
      'Prefer ENTRYPOINT over CMD for defining the main executable of the container.',
      'Use Docker BuildKit for faster builds and better secret handling (e.g., --mount=type=secret).'
    ],
    orchestration_hints: [
      'For docker-compose, use "restart: unless-stopped" for resilience.',
      'Define resource limits (cpu, memory) in compose files to prevent container starvation.'
    ]
  },
  actions: [
    { type: 'inject', target: 'neuron-suggest-docker-optimization-context' },
    { type: 'request_files', items: ['Dockerfile', 'docker-compose.yml'] },
  ],
  triggersRegex: true,
  triggersMode: 'any',
  priority: 7,
};
