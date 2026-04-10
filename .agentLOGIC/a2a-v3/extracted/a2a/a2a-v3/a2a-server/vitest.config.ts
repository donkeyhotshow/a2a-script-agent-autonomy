import {defineConfig} from 'vitest/config';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({path: path.resolve(process.cwd(), '.env')});

export default defineConfig({
    test: {
        bail: 1,
        globals: true,
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        // Stale suites: reference removed modules (neurons-v2, rag scorer, auto-ai-index, llm-client.service).
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            'tests/neurons-v2/**',
            'tests/services/rag-entity-integration.test.ts',
            'tests/unit/auto-ai-index.test.ts',
            'tests/unit/llm-client.service.test.ts',
            'tests/ollama-adapter.test.ts',
            'tests/simulation/context-pipeline.test.ts',
            'tests/unit/neuron-activator.service.test.ts',
            'tests/simulation/llm-requirements.test.ts',
            'tests/simulation/parser-new-sections.test.ts',
            'tests/unit/auth.middleware.test.ts',
            'tests/unit/definitions-load.test.ts',
        ],
        setupFiles: ['tests/setup.ts'],
        coverage: {
            provider: 'v8',
            include: ['src/**/*.ts'],
            exclude: ['src/**/*.d.ts'],
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
});
