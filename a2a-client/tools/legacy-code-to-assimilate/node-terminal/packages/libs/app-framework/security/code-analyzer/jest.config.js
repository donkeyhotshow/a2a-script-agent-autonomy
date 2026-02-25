const baseConfig = require('../../tests/setup/jest-base.config.cjs');

export default {
  ...baseConfig,
  // testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.test.mjs'
  ],
  transform: {
    '^.+\.js$': 'babel-jest',
    '^.+\.mjs$': 'babel-jest'
  },
  moduleDirectories: ['node_modules', '<rootDir>/../../libs'], // Добавлено для корректного разрешения путей
};
