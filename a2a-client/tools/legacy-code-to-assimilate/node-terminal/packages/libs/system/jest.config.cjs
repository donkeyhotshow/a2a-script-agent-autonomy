module.exports = {
    displayName: 'system',
    testMatch: ['<rootDir>/unified-daemon/tests/**/*.test.js'],
    moduleNameMapper: {
        '@libs/system/(.*)': '<rootDir>/$1',
        '@libs/logging-monitoring/(.*)': 'C:/apps/libs/logging-monitoring/$1',
        '@libs/system/file-operations': 'C:/apps/libs/system/file-operations/index.js'
    },
    testEnvironment: 'node',
    clearMocks: true
};
