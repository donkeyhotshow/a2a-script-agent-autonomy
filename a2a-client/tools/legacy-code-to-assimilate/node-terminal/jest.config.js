module.exports = {
    testEnvironment: 'node',
    testMatch: [
        '**/tests/**/*.test.cjs',
        '**/tests/**/*.test.js',
        '!**/archive/**/*.test.*'  // Явно исключаем archive
    ],
    testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '/test-reports/'
        // archive/tests исключаются автоматически через testMatch (только tests/ в корне)
    ],
    collectCoverageFrom: [
        'src/**/*.js',
        'src/**/*.cjs',
        'mcp/**/*.cjs',
        'handlers/**/*.cjs',
        '!**/node_modules/**',
        '!**/tests/**',
        '!**/dist/**'
    ],
    // setupFilesAfterEnv: ['<rootDir>/tests/setup.cjs'], // Временно отключено
    // transform: {
    //     '^.+\\.(ts|tsx)$': 'ts-jest',
    //     '^.+\\.(js|mjs|cjs)$': 'babel-jest'
    // }, // Временно отключено для .cjs файлов
    transformIgnorePatterns: [
        'node_modules/(?!(ajv-formats)/)'
    ],
    moduleNameMapper: {
        '^@libs/(.*)\\.js$': '<rootDir>/../../../libs/$1.js',
        '^@libs/(.*)\\.cjs$': '<rootDir>/../../../libs/$1.cjs',
        '^@libs/(.*)$': '<rootDir>/../../../libs/$1/index.cjs',
        '^@/(.*)$': '<rootDir>/$1',
        '^@tests/(.*)$': '<rootDir>/tests/$1',
        '^@mcp/(.*)$': '<rootDir>/mcp/$1'
    },
    resolver: undefined,
    testTimeout: 30000,
    verbose: true
};

