const baseConfig = require('../../tests/setup/jest-base.config.cjs');

export default {
  ...baseConfig,
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.test.mjs'
  ],
  transform: {
    '^.+\.m?js$': 'babel-jest'
  },
  moduleDirectories: ['node_modules', '<rootDir>/../../libs', '<rootDir>/../config-manager/node_modules'],
};
