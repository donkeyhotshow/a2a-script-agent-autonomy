const baseConfig = require('../../tests/setup/jest-base.config.cjs');

export default {
  ...baseConfig,
  // testEnvironment: 'node',
  verbose: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  // coverageReporters: ['text', 'lcov', 'clover'], // Удалено, так как наследуется из baseConfig (частично)
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testMatch: ['**/tests/**/*.test.js'],
  moduleFileExtensions: ['js', 'json'],
  roots: ['<rootDir>'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  moduleDirectories: ['node_modules', '<rootDir>/../../libs'], // Добавлено для корректного разрешения путей
};
