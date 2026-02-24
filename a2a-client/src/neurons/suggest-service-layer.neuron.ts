import type { Neuron } from '../types/knowledge.types.js';

export const suggestServiceLayerNeuron: Neuron = {
  id: 'neuron-suggest-service-layer',
  name: 'Suggest Service Layer',
  category: 'naming_convention',
  triggers: ["Controller", "logic", "Model::create", "save()", "validate"],
  knowledge: {
    pattern_name: 'Service Layer (Domain Logic)',
    philosophy: 'Thin Controllers, Fat Services, Skinny Models.',
    why: 'Prevents business logic leakage into HTTP transport layer (Controllers). Enables code reuse for CLI, Jobs, and API.',
    implementation_guide: {
      folder: 'src/services/ or app/Services/',
      structure: 'Class-based services focusing on a single domain entity or use-case.',
      example_transformation: {
        before: 'Controller calls Model directly, handles validation, sends email, and redirects.',
        after: 'Controller validates input, calls Service.execute(), and maps the Result object to a Response.'
      }
    },
    expert_advice: [
      'Services should not know about Request or Response objects; pass raw data or DTOs.',
      'Use dependency injection (DI) to make services easily testable with mocks.',
      'Handle transactions within services to ensure data integrity across multiple model operations.'
    ],
    common_pitfalls: [
      'Creating "God Services" that handle too many unrelated domains.',
      'Leaking SQL logic into services; keep that in Repositories if using that pattern.'
    ]
  },
  actions: [
    { type: 'inject', target: 'neuron-suggest-service-layer-context' },
    { type: 'request_files', items: ['app/Http/Controllers/*.php', 'src/controllers/*.ts'] },
  ],
  triggersMode: 'any',
  priority: 7,
};
