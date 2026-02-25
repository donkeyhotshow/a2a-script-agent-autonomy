const path = require('path');

module.exports = {
  rootDir: path.resolve(__dirname, './'),
  displayName: 'config-unified/ports/tests',
  testEnvironment: 'node',
  testEnvironmentOptions: {
      experimentalVmModules: true,
  },
  // Добавлено для работы с ES модулями и Vitest
  setupFiles: ['<rootDir>/setup-vitest.js'],
  testMatch: [
    '<rootDir>/**/*.(test).js',
    '<rootDir>/**/*.(test).cjs',
    '<rootDir>/**/__tests__/**/*.(test).js',
    '<rootDir>/**/__tests__/**/*.(test).cjs',
  ],
  roots: [
    "<rootDir>",
    "<rootDir>/../.." // Для доступа к корневой директории config-unified
  ],
  collectCoverageFrom: [
    "<rootDir>/**/*.js",
    "<rootDir>/**/*.cjs",
    "!**/node_modules/**",
    "!**/coverage/**"
  ],
  transform: {
    '^.+\\.(js|cjs)$' : ['babel-jest', { configFile: path.resolve(__dirname, '../../../../libs/babel.config.js') }],
  },
  moduleFileExtensions: ['js', 'cjs', 'mjs', 'ts'],
  moduleDirectories: [
    'node_modules',
    path.resolve(__dirname, '../../..') // Для доступа к libs
  ],
  moduleNameMapper: {
    '^@libs/(.*)$': path.resolve(__dirname, '../../..' , '$1'),
    '^(.*)/logging-monitoring/logging$': path.resolve(__dirname, '../../..' , 'logging-monitoring/logging/index.cjs'),
    '^vitest$': path.resolve(__dirname, '../../../../node_modules/vitest'),
  },
  transformIgnorePatterns: [
    "node_modules/(?!(execa|@jest|axios|vue|primevue|vitest)/)"
  ],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
  clearMocks: true,
  "resetMocks": true,
  "restoreMocks": true,
};
