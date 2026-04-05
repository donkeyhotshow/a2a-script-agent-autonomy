import { defineConfig } from 'vitest/config';

/**
 * Primary RAG unit suite is Vitest-based (tests/rag.test.js).
 * Legacy Jest TS suites under tests/functional etc. need ESM/Jest config work — use `npm run test:jest`.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/rag.test.js'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 15000,
  },
});
