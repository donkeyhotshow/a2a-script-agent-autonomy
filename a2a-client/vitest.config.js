/** @type {import('vitest').UserConfig} */
module.exports = {
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/fs-utils/tests/**/*.test.js', 'packages/graph/tests/**/*.test.js', 'packages/agent/**/*.test.js', 'packages/api-client/**/*.test.js', 'tests/**/*.test.js'],
    setupFiles: ['tests/setup.js'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.js'],
      exclude: ['**/node_modules/**', '**/tests/**'],
    },
  },
};
