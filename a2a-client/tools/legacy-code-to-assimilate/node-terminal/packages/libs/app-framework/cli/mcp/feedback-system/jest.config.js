module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: [
        "**/tests/**/*.test.ts",
        "**/tests/**/*.test.tsx",
        "**/src/**/*.test.ts",
        "**/src/**/*.test.tsx"
    ],
    moduleFileExtensions: [
        "ts",
        "tsx",
        "js",
        "jsx",
        "json",
        "node"
    ],
    transform: {
        "^.+\\.(ts|tsx)$": ['ts-jest', {
            tsconfig: {
                target: 'es2020',
                module: 'commonjs',
                lib: ['es2020'],
                allowJs: true,
                skipLibCheck: true,
                esModuleInterop: true,
                allowSyntheticDefaultImports: true,
                strict: true,
                forceConsistentCasingInFileNames: true,
                moduleResolution: 'node',
                resolveJsonModule: true,
                isolatedModules: true,
                noEmit: false,
                declaration: true,
                declarationMap: true,
                sourceMap: true
            }
        }]
    },
    // Test timeout for performance tests
    testTimeout: 30000,
    // Coverage configuration
    collectCoverage: false, // Disable coverage for now to focus on tests
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/*.test.{ts,tsx}',
        '!src/**/*.spec.{ts,tsx}'
    ],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        }
    },
    // Ensure that mocks for CommonJS modules (like DebugSystem.cjs) are properly handled
    transformIgnorePatterns: [
        "node_modules/(?!(\\@mcp|other-esm-modules-if-any)/)"
    ],
    moduleNameMapper: {
        "^../../../../root/mcp/node-terminal/mcp/DebugSystem.cjs$": "<rootDir>/tests/unit/mocks/DebugSystem.cjs.mock.js"
    },
    // Setup files
    setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    // Test suites organization
    projects: [
        {
            displayName: 'unit',
            testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
            preset: 'ts-jest',
            testEnvironment: 'node',
            transform: {
                "^.+\\.(ts|tsx)$": ['ts-jest', {
                    tsconfig: {
                        target: 'es2020',
                        module: 'commonjs',
                        lib: ['es2020'],
                        allowJs: true,
                        skipLibCheck: true,
                        esModuleInterop: true,
                        allowSyntheticDefaultImports: true,
                        strict: true,
                        forceConsistentCasingInFileNames: true,
                        moduleResolution: 'node',
                        resolveJsonModule: true,
                        isolatedModules: true,
                        noEmit: false,
                        declaration: true,
                        declarationMap: true,
                        sourceMap: true
                    }
                }]
            },
            moduleNameMapper: {
                "^../../../../root/mcp/node-terminal/mcp/DebugSystem.cjs$": "<rootDir>/tests/unit/mocks/DebugSystem.cjs.mock.js"
            }
        },
        {
            displayName: 'integration',
            testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
            preset: 'ts-jest',
            testEnvironment: 'node',
            transform: {
                "^.+\\.(ts|tsx)$": ['ts-jest', {
                    tsconfig: {
                        target: 'es2020',
                        module: 'commonjs',
                        lib: ['es2020'],
                        allowJs: true,
                        skipLibCheck: true,
                        esModuleInterop: true,
                        allowSyntheticDefaultImports: true,
                        strict: true,
                        forceConsistentCasingInFileNames: true,
                        moduleResolution: 'node',
                        resolveJsonModule: true,
                        isolatedModules: true,
                        noEmit: false,
                        declaration: true,
                        declarationMap: true,
                        sourceMap: true
                    }
                }]
            },
            moduleNameMapper: {
                "^../../../../root/mcp/node-terminal/mcp/DebugSystem.cjs$": "<rootDir>/tests/unit/mocks/DebugSystem.cjs.mock.js"
            }
        },
        {
            displayName: 'performance',
            testMatch: ['<rootDir>/tests/performance/**/*.test.ts'],
            preset: 'ts-jest',
            testEnvironment: 'node',
            testTimeout: 60000,
            transform: {
                "^.+\\.(ts|tsx)$": ['ts-jest', {
                    tsconfig: {
                        target: 'es2020',
                        module: 'commonjs',
                        lib: ['es2020'],
                        allowJs: true,
                        skipLibCheck: true,
                        esModuleInterop: true,
                        allowSyntheticDefaultImports: true,
                        strict: true,
                        forceConsistentCasingInFileNames: true,
                        moduleResolution: 'node',
                        resolveJsonModule: true,
                        isolatedModules: true,
                        noEmit: false,
                        declaration: true,
                        declarationMap: true,
                        sourceMap: true
                    }
                }]
            },
            moduleNameMapper: {
                "^../../../../root/mcp/node-terminal/mcp/DebugSystem.cjs$": "<rootDir>/tests/unit/mocks/DebugSystem.cjs.mock.js"
            }
        },
        {
            displayName: 'edge-cases',
            testMatch: ['<rootDir>/tests/edge-cases/**/*.test.ts'],
            preset: 'ts-jest',
            testEnvironment: 'node',
            transform: {
                "^.+\\.(ts|tsx)$": ['ts-jest', {
                    tsconfig: {
                        target: 'es2020',
                        module: 'commonjs',
                        lib: ['es2020'],
                        allowJs: true,
                        skipLibCheck: true,
                        esModuleInterop: true,
                        allowSyntheticDefaultImports: true,
                        strict: true,
                        forceConsistentCasingInFileNames: true,
                        moduleResolution: 'node',
                        resolveJsonModule: true,
                        isolatedModules: true,
                        noEmit: false,
                        declaration: true,
                        declarationMap: true,
                        sourceMap: true
                    }
                }]
            },
            moduleNameMapper: {
                "^../../../../root/mcp/node-terminal/mcp/DebugSystem.cjs$": "<rootDir>/tests/unit/mocks/DebugSystem.cjs.mock.js"
            }
        }
    ]
};
