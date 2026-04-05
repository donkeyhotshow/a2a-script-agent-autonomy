import {defineConfig} from 'vitest/config';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({path: path.resolve(process.cwd(), '.env')});

/** Suite under tests/human-review — not part of default `npm test`. */
export default defineConfig({
    test: {
        bail: 0,
        globals: true,
        environment: 'node',
        include: ['tests/human-review/**/*.test.ts'],
        exclude: ['**/node_modules/**', '**/dist/**'],
        setupFiles: ['tests/setup.ts'],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
});
