export default {
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(nanoid)/)'
  ],
  moduleNameMapper: {
    '^execa$': '<rootDir>/node_modules/execa',
  },
  collectCoverage: true,
  coverageDirectory: './coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/CommandErrors.js',
    '/CommandEnums.js',
    '/StructuredLogger.js',
    '/ExecutionContext.js',
    '/CommandValidator.js',
    '/CommandRunner.js',
  ],
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  testTimeout: 30000,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  maxWorkers: '50%',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};
