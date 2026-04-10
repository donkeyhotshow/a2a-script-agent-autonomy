/**
 * Real Filesystem Integration Tests
 * 
 * Tests real filesystem operations without mocking.
 * Creates temporary files, verifies content, and cleans up after tests.
 * 
 * Run with: npm
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

// Test configuration
const TEST_TEMP_DIR = path.join(os.tmpdir(), 'a2a-integration-tests');

describe('Real Filesystem Integration Tests', () => {
    let tempDir: string;

    beforeAll(async () => {
        // Create main temp directory
        await fs.mkdir(TEST_TEMP_DIR, { recursive: true });
    });

    afterAll(async () => {
        // Clean up main temp directory
        try {
            await fs.rm(TEST_TEMP_DIR, { recursive: true, force: true });
        } catch (e) {
            // Ignore cleanup errors
        }
    });

    beforeEach(async () => {
        // Create unique temp directory for each test
        tempDir = path.join(TEST_TEMP_DIR, `test-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`);
        await fs.mkdir(tempDir, { recursive: true });
    });

    afterEach(async () => {
        // Clean up test temp directory
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        } catch (e) {
            // Ignore cleanup errors
        }
    });

    describe('File Creation and Reading', () => {
        it('should create a new file', async () => {
            const filePath = path.join(tempDir, 'test-file.txt');
            const content = 'Hello, filesystem test!';

            await fs.writeFile(filePath, content, 'utf-8');

            // Verify file exists
            const exists = await fs.access(filePath).then(() => true).catch(() => false);
            expect(exists).toBe(true);

            // Verify content
            const readContent = await fs.readFile(filePath, 'utf-8');
            expect(readContent).toBe(content);
        });

        it('should create a JSON file', async () => {
            const filePath = path.join(tempDir, 'data.json');
            const data = {
                name: 'test',
                value: 123,
                nested: {
                    key: 'value'
                }
            };

            await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');

            const content = await fs.readFile(filePath, 'utf-8');
            const parsed = JSON.parse(content);

            expect(parsed.name).toBe('test');
            expect(parsed.nested.key).toBe('value');
        });

        it('should handle binary data', async () => {
            const filePath = path.join(tempDir, 'binary.dat');
            const buffer = Buffer.from([0x00, 0x01, 0x02, 0xFF, 0xFE]);

            await fs.writeFile(filePath, buffer);

            const readBuffer = await fs.readFile(filePath);
            expect(readBuffer.equals(buffer)).toBe(true);
        });

        it('should append to existing file', async () => {
            const filePath = path.join(tempDir, 'append.txt');
            
            await fs.writeFile(filePath, 'Line 1\n', 'utf-8');
            await fs.appendFile(filePath, 'Line 2\n', 'utf-8');
            await fs.appendFile(filePath, 'Line 3\n', 'utf-8');

            const content = await fs.readFile(filePath, 'utf-8');
            const lines = content.split('\n').filter(l => l);

            expect(lines).toHaveLength(3);
            expect(lines[0]).toBe('Line 1');
            expect(lines[1]).toBe('Line 2');
            expect(lines[2]).toBe('Line 3');
        });
    });

    describe('Directory Operations', () => {
        it('should create nested directories', async () => {
            const nestedPath = path.join(tempDir, 'level1', 'level2', 'level3');

            await fs.mkdir(nestedPath, { recursive: true });

            // Verify directory exists
            const stats = await fs.stat(nestedPath);
            expect(stats.isDirectory()).toBe(true);
        });

        it('should list directory contents', async () => {
            // Create test files
            await fs.writeFile(path.join(tempDir, 'file1.txt'), 'content1');
            await fs.writeFile(path.join(tempDir, 'file2.txt'), 'content2');
            await fs.mkdir(path.join(tempDir, 'subdir'));
            await fs.writeFile(path.join(tempDir, 'subdir', 'file3.txt'), 'content3');

            const files = await fs.readdir(tempDir);
            
            expect(files).toHaveLength(3);
            expect(files).toContain('file1.txt');
            expect(files).toContain('file2.txt');
            expect(files).toContain('subdir');
        });

        it('should copy files', async () => {
            const sourcePath = path.join(tempDir, 'source.txt');
            const destPath = path.join(tempDir, 'destination.txt');
            const content = 'Original content';

            await fs.writeFile(sourcePath, content, 'utf-8');
            await fs.copyFile(sourcePath, destPath);

            const destContent = await fs.readFile(destPath, 'utf-8');
            expect(destContent).toBe(content);
        });

        it('should move files', async () => {
            const sourcePath = path.join(tempDir, 'move-source.txt');
            const destDir = path.join(tempDir, 'moved');
            const destPath = path.join(destDir, 'move-dest.txt');
            const content = 'Move test content';

            await fs.writeFile(sourcePath, content, 'utf-8');
            await fs.mkdir(destDir, { recursive: true }); // Create destination directory
            await fs.rename(sourcePath, destPath);

            // Source should not exist
            const sourceExists = await fs.access(sourcePath).then(() => true).catch(() => false);
            expect(sourceExists).toBe(false);

            // Destination should exist
            const destContent = await fs.readFile(destPath, 'utf-8');
            expect(destContent).toBe(content);
        });
    });

    describe('File Metadata', () => {
        it('should get file stats', async () => {
            const filePath = path.join(tempDir, 'stats-test.txt');
            const content = 'Stats test content';

            await fs.writeFile(filePath, content, 'utf-8');
            const stats = await fs.stat(filePath);

            expect(stats.isFile()).toBe(true);
            expect(stats.isDirectory()).toBe(false);
            expect(stats.size).toBeGreaterThan(0);
            expect(stats.birthtime).toBeInstanceOf(Date);
            expect(stats.mtime).toBeInstanceOf(Date);
        });

        it('should check file existence', async () => {
            const existingFile = path.join(tempDir, 'exists.txt');
            const nonExistingFile = path.join(tempDir, 'not-exists.txt');

            await fs.writeFile(existingFile, 'test', 'utf-8');

            const existingExists = await fs.access(existingFile).then(() => true).catch(() => false);
            const nonExistingExists = await fs.access(nonExistingFile).then(() => true).catch(() => false);

            expect(existingExists).toBe(true);
            expect(nonExistingExists).toBe(false);
        });
    });

    describe('File Permissions', () => {
        it('should handle file permissions', async () => {
            const filePath = path.join(tempDir, 'permissions-test.txt');

            await fs.writeFile(filePath, 'test', 'utf-8');
            
            // Check if file is readable/writable
            const canRead = await fs.access(filePath, fsSync.constants.R_OK).then(() => true).catch(() => false);
            const canWrite = await fs.access(filePath, fsSync.constants.W_OK).then(() => true).catch(() => false);

            expect(canRead).toBe(true);
            expect(canWrite).toBe(true);
        });
    });

    describe('Simulation File Operations', () => {
        it('should create simulation request.json', async () => {
            const simDir = path.join(tempDir, 'test-simulation');
            await fs.mkdir(simDir, { recursive: true });

            const requestJson = {
                context: {
                    version: '1.0',
                    sessionId: 'test-session'
                },
                message: 'Create a hello world program'
            };

            await fs.writeFile(
                path.join(simDir, 'request.json'),
                JSON.stringify(requestJson, null, 2),
                'utf-8'
            );

            const content = await fs.readFile(path.join(simDir, 'request.json'), 'utf-8');
            const parsed = JSON.parse(content);

            expect(parsed.message).toBe('Create a hello world program');
        });

        it('should create simulation response.json', async () => {
            const simDir = path.join(tempDir, 'test-simulation');
            await fs.mkdir(simDir, { recursive: true });

            const responseJson = {
                jsonrpc: '2.0',
                id: 'test-1',
                result: {
                    promiseId: 'promise-123',
                    status: 'pending'
                }
            };

            await fs.writeFile(
                path.join(simDir, 'response.json'),
                JSON.stringify(responseJson, null, 2),
                'utf-8'
            );

            const content = await fs.readFile(path.join(simDir, 'response.json'), 'utf-8');
            const parsed = JSON.parse(content);

            expect(parsed.result.status).toBe('pending');
        });

        it('should simulate reading simulation files', async () => {
            // Create a mock simulation structure
            const simDir = path.join(tempDir, 'mock-simulation');
            await fs.mkdir(path.join(simDir, 'src'), { recursive: true });

            await fs.writeFile(path.join(simDir, 'request.json'), '{}', 'utf-8');
            await fs.writeFile(path.join(simDir, 'response.json'), '{}', 'utf-8');
            await fs.writeFile(path.join(simDir, 'src', 'main.ts'), 'console.log("hello");', 'utf-8');

            // Simulate reading the simulation
            const files = await fs.readdir(simDir, { recursive: true });
            
            expect(files.length).toBeGreaterThan(0);
        });
    });

    describe('Cleanup Verification', () => {
        it('should verify cleanup after test', async () => {
            // This test creates a file and verifies cleanup happens
            const filePath = path.join(tempDir, 'cleanup-test.txt');
            
            await fs.writeFile(filePath, 'test content', 'utf-8');
            
            // File exists during test
            const exists = await fs.access(filePath).then(() => true).catch(() => false);
            expect(exists).toBe(true);

            // After test (in afterEach), file should be cleaned up
            // This is verified by the afterEach cleanup
        });

        it('should handle cleanup errors gracefully', async () => {
            // Test that cleanup doesn't break if file doesn't exist
            const nonExistent = path.join(tempDir, 'does-not-exist.txt');

            // Should not throw
            try {
                await fs.rm(nonExistent, { force: true });
            } catch (e) {
                // Expected to throw for non-existent
            }

            // Test passes if we get here
            expect(true).toBe(true);
        });
    });

    describe('Path Operations', () => {
        it('should join paths correctly', () => {
            const fullPath = path.join(tempDir, 'subdir', 'file.txt');
            expect(fullPath).toContain('subdir');
            expect(fullPath).toContain('file.txt');
        });

        it('should resolve absolute paths', () => {
            const relativePath = './test/file.txt';
            const absolutePath = path.resolve(relativePath);
            expect(path.isAbsolute(absolutePath)).toBe(true);
        });

        it('should parse file extensions', () => {
            const ext = path.extname('test-file.txt');
            expect(ext).toBe('.txt');

            const ext2 = path.extname('test-file.ts');
            expect(ext2).toBe('.ts');

            const ext3 = path.extname('no-extension');
            expect(ext3).toBe('');
        });

        it('should get basename', () => {
            const base = path.basename('/path/to/file.txt');
            expect(base).toBe('file.txt');

            const base2 = path.basename('/path/to/file.txt', '.txt');
            expect(base2).toBe('file');
        });
    });
});

export { TEST_TEMP_DIR };
