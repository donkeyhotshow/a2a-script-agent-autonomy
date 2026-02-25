const baseConfig = require('../../tests/setup/jest-base.config.cjs');

export { ...baseConfig,
  // testEnvironment: "node",
  testMatch: [
    "**/tests/**/*.test.js"
  ],
  moduleDirectories: ['node_modules', '<rootDir>/../../libs'], // Добавлено для корректного разрешения путей };
