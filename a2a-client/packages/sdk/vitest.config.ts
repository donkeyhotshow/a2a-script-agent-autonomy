import { defineConfig } from 'vitest/config';

/**
 * Local Vitest root: tests under `src/`. Envelope contract: parent workspace
 * `tests/unit/client-api-envelope-shared.test.js` (shared `client-api-envelope.mjs`, same module `@a2a/sdk` re-exports).
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,js,mjs}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 15000,
  },
});
