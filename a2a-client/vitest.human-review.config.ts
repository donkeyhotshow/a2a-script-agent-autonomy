import {defineConfig} from 'vitest/config';

/** Suite under tests/human-review — not part of default `npm test`. */
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    testTimeout: 15000,
    include: ['tests/human-review/**/*.{test,spec}.{js,ts,mjs}'],
    exclude: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
    server: {
      deps: {
        inline: ['@a2a/execution', '@a2a/rag'],
      },
    },
  },
  resolve: {
    extensions: ['.ts', '.mts', '.cts', '.tsx', '.js', '.mjs', '.cjs', '.json'],
    alias: {
      '@': './src',
      '@shared': './shared',
    },
  },
  ssr: {
    noExternal: ['@a2a/execution', '@a2a/rag'],
  },
});
