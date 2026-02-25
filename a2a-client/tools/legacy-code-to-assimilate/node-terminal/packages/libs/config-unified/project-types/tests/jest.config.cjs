const path = require('path');

module.exports = {
  ...require('../../../../config/jest.config.js'),
  rootDir: path.resolve(__dirname, './'),
  displayName: 'config-unified/project-types/tests',
  testMatch: [
    '<rootDir>/**/*.(test).js',
    '<rootDir>/**/*.(test).cjs',
    '<rootDir>/**/__tests__/**/*.(test).js',
    '<rootDir>/**/__tests__/**/*.(test).cjs',
  ],
};
