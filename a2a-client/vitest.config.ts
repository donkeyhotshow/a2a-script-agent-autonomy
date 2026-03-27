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
    },
    server: {
      deps: {
        inline: ['@a2a/execution', '@a2a/rag']
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
    noExternal: ['@a2a/execution', '@a2a/rag']
  }
});
