import { defineConfig } from 'vitest/config';

/** Local Vitest root: tests colocated under src/ (not a2a-client/tests). */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,js,mjs}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 15000,
  },
});
