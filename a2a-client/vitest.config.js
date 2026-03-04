/** @type {import('vitest').UserConfig} */
module.exports = {
    test: {
        bail: 1,
        globals: true,
        environment: 'node',
        include: ['packages/fs-utils/tests/**/*.test.js', 'packages/agent/**/*.test.js', 'packages/api-client/**/*.test.ts', 'packages/json/test/**/*.test.js', 'packages/rag/**/*.test.ts', 'tests/**/*.test.js'],
        setupFiles: ['tests/setup.js'],
        coverage: {
            provider: 'v8',
            include: ['packages/*/src/**/*.js'],
            exclude: ['**/node_modules/**', '**/tests/**'],
        },
    },
};
