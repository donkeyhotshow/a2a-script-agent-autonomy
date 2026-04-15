import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    /** RAG indexer + full matrix need headroom under parallel workers (Windows). */
    testTimeout: 15000,
    include: [
      'packages/**/*.{test,spec}.{js,ts}',
      'tests/**/*.{test,spec}.{js,ts,mjs}',
      'packages/web/js/tests/**/*.{test,spec}.js',
      'tests/unit/**/*.{test,spec}.{js,ts,mjs}',
      'tests/integration/**/*.{test,spec}.{js,ts,mjs}'
    ],
    exclude: [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      /** Exploratory suite: `npm run test:human-review` in a2a-client */
      '**/tests/human-review/**',
      /** Playwright specs; use `npm run test:e2e`. */
      '**/tests/e2e/**',
      /** Playwright script; run with `node tests/single-scene.test.js`. */
      '**/tests/single-scene.test.js',
      /** Imports removed web/js/core/* paths. */
      '**/tests/unit/dialog-components.test.js',
      /** Source module removed; RAG package Jest suite only. */
      '**/packages/rag/tests/rag-improvements.test.js',
      /** Jest `jest.mock` API; run via `npm run test --prefix packages/rag` (Jest) or migrate to vi.mock. */
      '**/packages/rag/tests/edge-cases/**',
      '**/packages/rag/tests/accuracy/**',
      '**/packages/rag/tests/functional/integration.test.ts',
      '**/packages/rag/tests/functional/search.test.ts',
      '**/packages/rag/tests/performance/**',
      /** No package sources — only dist stub */
      '**/packages/embedding/tests/**',
      /** Duplicate of validator.test.ts (CommonJS + dist) */
      '**/packages/json/tests/validator.test.js',
      /** Fixture modules under tests/mocks never landed in repo */
      '**/packages/shared/tests/mock-fetch.test.ts',
      '**/packages/shared/tests/mock-storage.test.ts',
      '**/packages/shared/tests/mocks.test.ts'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/node_modules/**',
        '**/tests/**',
        '**/*.test.{js,ts}'
      ]
    },
    server: {
      deps: {
        inline: ['@a2a/execution', '@a2a/rag', '@a2a-client/storage']
      }
    }
  },
  resolve: {
    extensions: ['.ts', '.mts', '.cts', '.tsx', '.js', '.mjs', '.cjs', '.json'],
    alias: {
      '@': './src',
      '@shared': './shared'
    }
  },
  ssr: {
    noExternal: ['@a2a/execution', '@a2a/rag', '@a2a-client/storage']
  }
});
