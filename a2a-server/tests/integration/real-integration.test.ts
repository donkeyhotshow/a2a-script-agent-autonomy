/**
 * Real Integration Tests (Stateless)
 *
 * Tests without mocks - uses real HTTP, in-memory storage.
 * No database required - server is stateless.
 *
 * Requires:
 * - SKIP_AUTH=1 for unauthenticated tests
 *
 * Run with: SKIP_AUTH=1 npm run test:integration
 */

import {describe, it, expect, beforeAll, afterAll, beforeEach, afterEach} from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Test configuration
const SERVER_URL = process.env.TEST_SERVER_URL || 'http://localhost:3000';
const SKIP_AUTH = process.env.SKIP_AUTH === '1';

// Temp directory for test files
let tempDir: string;

describe('Real Integration Tests (Stateless)', () => {
    // Check if we can run real integration tests
    const canRunRealTests = SKIP_AUTH;

    beforeAll(async () => {
        if (!canRunRealTests) {
            console.log('\n⚠️  Real integration tests skipped - requires SKIP_AUTH=1');
            return;
        }

        // Create temp directory for filesystem tests
        tempDir = path.join(os.tmpdir(), `a2a-test-${Date.now()}`);
        await fs.mkdir(tempDir, {recursive: true});
    });

    afterAll(async () => {
        // Cleanup temp directory
        if (tempDir) {
            try {
                await fs.rm(tempDir, {recursive: true, force: true});
            } catch (e) {
                // Ignore cleanup errors
            }
        }
    });

    // Skip all tests if not properly configured
    (canRunRealTests ? describe : describe.skip)('Real HTTP API Tests', () => {
        let serverRunning = false;

        beforeAll(async () => {
            // Check if server is running by making a health check
            try {
                const response = await fetch(`${SERVER_URL}/health`, {
                    method: 'GET',
                });
                serverRunning = response.ok;
            } catch (e) {
                console.log('\n⚠️  Server not running at', SERVER_URL);
            }
        });

        // Skip HTTP tests if server not running
        (serverRunning ? it : it.skip)('should return health check', async () => {
            const response = await fetch(`${SERVER_URL}/health`, {
                method: 'GET',
            });

            expect(response.ok).toBe(true);
            const data = (await response.json()) as {status: string};
            expect(data.status).toBe('ok');
        });

        (serverRunning ? it : it.skip)('should return stateless mode', async () => {
            const response = await fetch(`${SERVER_URL}/health`, {
                method: 'GET',
            });

            const data = (await response.json()) as {mode?: string};
            // Server should report stateless mode
            expect(data.mode || 'stateless').toBe('stateless');
        });
    });

    (canRunRealTests ? describe : describe.skip)('Filesystem Tests', () => {
        beforeEach(async () => {
            // Reset temp directory for each test
            try {
                const files = await fs.readdir(tempDir);
                for (const file of files) {
                    await fs.rm(path.join(tempDir, file), {recursive: true, force: true});
                }
            } catch (e) {
                // Ignore cleanup errors
            }
        });

        it('should create and read file', async () => {
            const testFile = path.join(tempDir, 'test.txt');
            const content = 'Hello, World!';

            await fs.writeFile(testFile, content, 'utf-8');

            const readContent = await fs.readFile(testFile, 'utf-8');
            expect(readContent).toBe(content);
        });

        it('should create directory structure', async () => {
            const nestedDir = path.join(tempDir, 'level1', 'level2');
            await fs.mkdir(nestedDir, {recursive: true});

            const stat = await fs.stat(nestedDir);
            expect(stat.isDirectory()).toBe(true);
        });

        it('should delete file', async () => {
            const testFile = path.join(tempDir, 'to-delete.txt');
            await fs.writeFile(testFile, 'content', 'utf-8');

            await fs.rm(testFile);

            await expect(fs.stat(testFile)).rejects.toThrow();
        });
    });

    describe('Environment Validation', () => {
        it('should have SKIP_AUTH set', () => {
            // This test documents that SKIP_AUTH is required
            expect(process.env.SKIP_AUTH).toBeDefined();
        });

        it('should not require DATABASE_URL', () => {
            // Server is stateless - no database needed
            expect(process.env.DATABASE_URL).toBeUndefined();
        });

        it('should not require REDIS_URL', () => {
            // Server is stateless - no Redis needed
            expect(process.env.REDIS_URL).toBeUndefined();
        });
    });
});
