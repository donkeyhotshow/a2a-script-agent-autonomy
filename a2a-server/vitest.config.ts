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
        exclude: ['**/node_modules/**', '**/dist/**'],
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
