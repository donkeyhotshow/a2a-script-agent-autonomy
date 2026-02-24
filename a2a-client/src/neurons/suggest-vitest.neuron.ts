import type { Neuron } from '../types/knowledge.types.js';

export const suggestVitestNeuron: Neuron = {
  id: 'neuron-suggest-vitest',
  name: 'Suggest Vitest',
  category: 'framework',
  triggers: ["test\\(", "it\\(", "expect\\(", "describe\\(", "jest", "mocha"],
  knowledge: {
    tool: 'Vitest',
    benefits: [
      'Lightning fast HMR (Hot Module Replacement) for tests during development.',
      'Shared configuration with Vite.',
      'Out-of-the-box support for TypeScript and JSX.',
      'Compatible with the Jest API, making migration easy.'
    ],
    expert_patterns: [
      {
        name: 'Spying and Mocking',
        example: 'vi.spyOn(service, "method") or vi.mock("./module")',
        advice: 'Use vi.clearAllMocks() in beforeEach to ensure test isolation.'
      },
      {
        name: 'Snapshot Testing',
        example: 'expect(result).toMatchSnapshot()',
        advice: 'Use snapshots for large data structures or UI components, but avoid them for simple logic tests.'
      }
    ],
    configuration_tips: [
      'Use "test.workspace.js" for monorepos.',
      'Enable globals in vitest.config.ts if you prefer not to import "describe", "it", etc. in every file.',
      'Use "coverage-v8" or "coverage-istanbul" for high-performance coverage reports.'
    ]
  },
  actions: [
    { type: 'inject', target: 'neuron-suggest-vitest-context' },
    { type: 'request_files', items: ['tests/**/*.ts', 'src/**/*.test.ts', 'package.json'] },
  ],
  triggersMode: 'any',
  priority: 7,
};
