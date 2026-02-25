const baseConfig = require('../../tests/setup/jest-base.config.cjs');

export default {
  ...baseConfig,
  // testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.mjs'],
  transform: {
    '^.+\.m?js$': 'babel-jest',
  },
  collectCoverageFrom: [
    'index.js',
    '!**/node_modules/**',
    '!**/tests/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: [],
  moduleDirectories: ['node_modules', '<rootDir>/../../libs'], // Добавлено для корректного разрешения путей
};
