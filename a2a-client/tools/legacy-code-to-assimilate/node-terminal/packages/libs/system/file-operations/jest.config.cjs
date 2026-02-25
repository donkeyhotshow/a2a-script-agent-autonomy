
const JestGuard = require('../../../../../projects-manager/jest-guard');

const guard = new JestGuard({
  enabled: true,
  showCommands: true,
  showFileCount: true,
  customMessage: 'Проект содержит 18+ тестовых файлов, запуск всех сразу может занять 5+ минут и перегрузить систему. Используйте JestGuard для безопасного запуска тестов.'
});

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: [],
  testTimeout: 10000,
  verbose: true,
  ...guard.jestConfig()
};
