export default {
  testEnvironment: 'node',
  transform: {
    '^.+\.js$': 'babel-jest',
  },
  roots: [
    "<rootDir>/src",
    "<rootDir>/tests"
  ],
  testMatch: [
    "<rootDir>/tests/**/*.test.js"
  ],
        moduleNameMapper: {
          '^@mcp/core-logger-core/(.*)$': '<rootDir>/../logger-core/src/$1',
          '^@mcp/core-error-handling/(.*)$': '<rootDir>/../error-handling/src/$1',
          '^@mcp/core-config-manager/(.*)$': '<rootDir>/../config-manager/src/$1',
          '^@mcp/core-file-utils/(.*)$': '<rootDir>/../file-utils/src/$1',
          '^@mcp/shared/general-utils.js$': '<rootDir>/../shared/general-utils.js',
          '^@libs/core/shared$': '<rootDir>/../../../core/shared/index.js',
          '^@libs/(.*)$': '<rootDir>/../../../$1',
          '^ore/(.*)$': '<rootDir>/../../../$1',
        },
  moduleDirectories: ['node_modules', '<rootDir>/../', '<rootDir>/../../../libs']
};