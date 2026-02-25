module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!jest.config.cjs'
  ],
  moduleNameMapping: {
    '^@libs/(.*)$': '<rootDir>/../$1'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};