const baseConfig = require('../../tests/setup/jest-base.config.cjs');

export { ...baseConfig,
    // testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    collectCoverage: true,
    coverageDirectory: 'coverage',
    // coverageReporters: ['text', 'lcov'], // Удалено, так как наследуется из baseConfig (частично)
    verbose: true,
    moduleDirectories: ['node_modules', '<rootDir>/../../libs'], // Добавлено для корректного разрешения путей };
