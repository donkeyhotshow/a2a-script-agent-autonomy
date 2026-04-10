import { defineConfig } from 'vitest/config';

/** Local config so `npm test` from this package finds `js/tests/*` (root a2a-client globs are monorepo-wide). */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['js/tests/**/*.{test,spec}.{js,ts,mjs}', '**/*.{test,spec}.{js,ts,mjs}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
