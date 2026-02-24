import type { Neuron } from '../types/knowledge.types.js';

export const suggestPlaywrightNeuron: Neuron = {
  id: 'neuron-suggest-playwright',
  name: 'Suggest Playwright',
  category: 'framework',
  triggers: ["e2e", "browser", "Puppeteer", "Cypress", "page.goto", "selector"],
  knowledge: {
    tool: 'Playwright',
    philosophy: 'Resilient and fast browser automation for modern web apps.',
    expert_features: [
      'Auto-waiting: No more hardcoded timeouts (sleep/wait).',
      'Trace Viewer: GUI to inspect what happened during a test failure.',
      'UI Mode: Explore and debug tests interactively.',
      'Cross-browser: Native support for Chromium, WebKit (Safari), and Firefox.'
    ],
    best_practices: [
      'Use locators (e.g., page.getByRole("button")) instead of CSS/XPath selectors for better stability.',
      'Keep tests isolated; use "fixtures" to set up state (auth, db) before tests.',
      'Run tests in parallel to significantly reduce CI execution time.',
      'Implement the Page Object Model (POM) to keep test scripts clean and maintainable.'
    ],
    ci_integration: 'Playwright produces standard JUnit/HTML reports that integrate seamlessly with GitHub Actions or GitLab CI.'
  },
  actions: [
    { type: 'inject', target: 'neuron-suggest-playwright-context' },
    { type: 'request_files', items: ['playwright.config.ts', 'tests/e2e/**/*.spec.ts'] },
  ],
  triggersMode: 'any',
  priority: 6,
};
