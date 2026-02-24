import type { Neuron } from '../types/knowledge.types.js';

export const generateUnitTestsNeuron: Neuron = {
  id: 'neuron-generate-unit-tests',
  name: 'Generate Unit Tests',
  category: 'custom_pattern',
  triggers: ["generate test", "unit test", "spec", "coverage", "mock", "stub"],
  knowledge: {
    philosophy: 'Test-Driven Improvement (TDI)',
    ai_expert_instructions: [
      'Search-Before-Test: Read the target file and all imported modules to understand method signatures and dependencies.',
      'Isolate dependencies: Use mocks (vi.mock or jest.mock) for all external services and database calls.',
      'Edge-Case Focus: Specifically generate tests for null inputs, overflow/underflow, and error handling paths.'
    ],
    test_structure: {
      pattern: 'AAA (Arrange, Act, Assert)',
      naming: 'describe("ClassName", () => { it("should do X when Y", () => { ... }) })'
    },
    benchmarks: [
      '100% path coverage for business-critical logic.',
      'Clear failure messages: Assertions should explain WHY a test failed.',
      'Clean environment: Use beforeEach to reset mocks and local state.'
    ],
    proactive_verification: 'Immediately run the newly generated tests using `npm run test` or `vitest run` to verify correctness.'
  },
  actions: [
    { type: 'inject', target: 'neuron-generate-unit-tests-context' },
    { type: 'request_files', items: ['tests/**/*.test.ts', 'src/services/*.ts'] },
  ],
  triggersMode: 'any',
  priority: 8,
};
