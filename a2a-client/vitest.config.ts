import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: [
      'packages/**/*.{test,spec}.{js,ts}',
      'tests/**/*.{test,spec}.{js,ts,mjs}',
      'web/js/tests/**/*.{test,spec}.js',
      'tests/unit/**/*.{test,spec}.{js,ts,mjs}',
      'tests/integration/**/*.{test,spec}.{js,ts,mjs}'
    ],
    exclude: [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/node_modules/**',
        '**/tests/**',
        '**/*.test.{js,ts}'
      ]
    }
  },
  resolve: {
    alias: {
      '@': './src'
    }
  }
});
