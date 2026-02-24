import type { Neuron } from '../types/knowledge.types.js';

export const detectDockerIssuesNeuron: Neuron = {
  id: 'neuron-detect-docker-issues',
  name: 'Detect Docker Issues',
  category: 'custom_pattern',
  triggers: ["FROM", "RUN", "COPY", "Dockerfile", "docker-compose.yml"],
  knowledge: {
    criticality: 'MEDIUM',
    topic: 'Dockerfile Best Practices & Security',
    expert_audits: [
      {
        issue: 'Fat Images',
        detection: 'Large base images or many small RUN layers.',
        recommendation: 'Use Alpine or Distroless base images. Combine RUN commands using "&&" and clean up caches (e.g., rm -rf /var/lib/apt/lists/*).'
      },
      {
        issue: 'Missing .dockerignore',
        detection: 'Large context sent to Docker daemon.',
        recommendation: 'Always include a .dockerignore file to skip node_modules, .git, and build artifacts.'
      },
      {
        issue: 'Run as Root',
        detection: 'No USER instruction in Dockerfile.',
        recommendation: 'Create a non-privileged user and switch to it using "USER 1001" to reduce attack surface.'
      }
    ],
    multi_stage_builds: 'Use multi-stage builds to compile assets in one stage and copy only the final binaries to a minimal production stage.',
    healthchecks: 'Implement the HEALTHCHECK instruction to allow Docker/K8s to monitor app responsiveness.'
  },
  actions: [
    { type: 'inject', target: 'neuron-detect-docker-issues-context' },
    { type: 'request_files', items: ['Dockerfile', 'docker-compose.yml', '.dockerignore'] },
  ],
  triggersRegex: true,
  triggersMode: 'any',
  priority: 8,
};
