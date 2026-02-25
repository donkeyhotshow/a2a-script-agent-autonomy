const path = require('path');

export default {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js',
    '!**/root/projects-manager/ui/plugins/**/*.test.js' // Исключаем тесты Vitest
  ],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  verbose: true,
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  moduleFileExtensions: ['js', 'json'],
  testTimeout: 10000,
  rootDir: path.resolve(__dirname, '../../../../..'), // Устанавливаем rootDir на C:\apps
  moduleNameMapper: {
    '^@libs/(.*)$': '<rootDir>/libs/$1',
  },
};
