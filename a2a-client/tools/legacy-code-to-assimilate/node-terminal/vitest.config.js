const {defineConfig} = require('vitest/config');
const path = require('path');

module.exports = defineConfig({
    test: {
        globals: true,
        environment: 'node',
        // setupFiles: ['./tests/setup.cjs'],
        include: [
            'tests/**/*.test.cjs',
            'tests/**/*.test.js',
            'tests/**/*.test.mjs'
        ],
        exclude: [
            'node_modules/**',
            'dist/**',
            'build/**'
        ],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/**',
                'tests/**',
                '**/*.test.js',
                '**/*.test.cjs',
                '**/*.test.mjs'
            ]
        },
        testTimeout: 30000,
        hookTimeout: 30000,
        teardownTimeout: 30000
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './'),
            '@tests': path.resolve(__dirname, './tests'),
            '@mcp': path.resolve(__dirname, './mcp'),
            '@libs': path.resolve(__dirname, '../../../libs')
        }
    },
    esbuild: {
        loader: 'js',
        include: /\.(js|cjs|mjs)$/,
    },
    ssr: {
        noExternal: true,
    },
    optimizeDeps: {
        include: ['vitest'],
        exclude: ['@libs/**']
    },
    define: {
        'process.env.NODE_ENV': '"test"',
        'process.env.MCP_TEST_MODE': '"true"'
    }
});
