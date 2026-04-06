import { defineConfig } from 'vitest/config';

// Vitest: rag.test.js, protocol-integration, all src .test.ts. Jest: npm run test:jest.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'tests/rag.test.js',
      'tests/protocol-integration.test.ts',
      'src/**/*.test.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 15000,
  },
});
