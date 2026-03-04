/**
 * Tests for protocol-result.stub.ts
 */

import { readFileForResult, writeFileForResult, listDirectoryForResult } from '../src/protocol-result.stub';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('protocol-result.stub', () => {
    let tempDir;

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fs-utils-test-'));
    });

    afterEach(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    describe('readFileForResult', () => {
        it('should read file and return protocol shape', async () => {
            const testFile = path.join(tempDir, 'test.txt');
            const testContent = 'Hello, World!';
            
            await fs.writeFile(testFile, testContent, 'utf8');

            const result = await readFileForResult(testFile);

            expect(result).toEqual({
                path: testFile,
                content: testContent
            });
        });

        it('should handle different encodings', async () => {
            const testFile = path.join(tempDir, 'test.txt');
            const testContent = 'Hello, World!';
            
            await fs.writeFile(testFile, testContent, 'utf8');

            const result = await readFileForResult(testFile, { encoding: 'utf8' });

            expect(result.path).toBe(testFile);
            expect(result.content).toBe(testContent);
        });

        it('should throw error for non-existent file', async () => {
            const nonExistentFile = path.join(tempDir, 'non-existent.txt');

            await expect(readFileForResult(nonExistentFile))
                .rejects
                .toThrow('Failed to read file');
        });

        it('should handle binary content', async () => {
            const testFile = path.join(tempDir, 'binary.txt');
            const testContent = 'Binary content: \x00\x01\x02';
            
            await fs.writeFile(testFile, testContent, 'utf8');

            const result = await readFileForResult(testFile);

            expect(result.path).toBe(testFile);
            expect(result.content).toBe(testContent);
        });
    });

    describe('writeFileForResult', () => {
        it('should write file and return protocol shape', async () => {
            const testFile = path.join(tempDir, 'test-write.txt');
            const testContent = 'This is test content';

            const result = await writeFileForResult(testFile, testContent);

            expect(result).toEqual({
                path: testFile,
                written: true
            });

            // Verify file was actually written
            const writtenContent = await fs.readFile(testFile, 'utf8');
            expect(writtenContent).toBe(testContent);
        });

        it('should create directory if it does not exist', async () => {
            const testFile = path.join(tempDir, 'subdir', 'nested', 'test.txt');
            const testContent = 'Nested content';

            const result = await writeFileForResult(testFile, testContent);

            expect(result).toEqual({
                path: testFile,
                written: true
            });

            // Verify file was written and directory was created
            const writtenContent = await fs.readFile(testFile, 'utf8');
            expect(writtenContent).toBe(testContent);
        });

        it('should overwrite existing file', async () => {
            const testFile = path.join(tempDir, 'overwrite.txt');
            const originalContent = 'Original content';
            const newContent = 'New content';
            
            // Write original content
            await fs.writeFile(testFile, originalContent, 'utf8');

            // Overwrite with new content
            const result = await writeFileForResult(testFile, newContent);

            expect(result).toEqual({
                path: testFile,
                written: true
            });

            // Verify content was overwritten
            const writtenContent = await fs.readFile(testFile, 'utf8');
            expect(writtenContent).toBe(newContent);
        });

        it('should throw error for invalid path', async () => {
            const invalidPath = 'C:\\invalid\\path\\file<>:"/\\|?.txt';
            const testContent = 'Test content';

            await expect(writeFileForResult(invalidPath, testContent))
                .rejects
                .toThrow('Failed to write file');
        });
    });

    describe('listDirectoryForResult', () => {
        it('should list directory and return protocol shape', async () => {
            // Create test files and directories
            const testFile1 = path.join(tempDir, 'file1.txt');
            const testFile2 = path.join(tempDir, 'file2.js');
            const testDir = path.join(tempDir, 'subdir');
            
            await fs.writeFile(testFile1, 'content1', 'utf8');
            await fs.writeFile(testFile2, 'content2', 'utf8');
            await fs.mkdir(testDir);

            const result = await listDirectoryForResult(tempDir);

            expect(result.path).toBe(tempDir);
            expect(result.entries).toHaveLength(3);

            // Check that all entries are present
            const entryNames = result.entries.map(e => e.name).sort();
            expect(entryNames).toEqual(['file1.txt', 'file2.js', 'subdir']);

            // Check types
            const file1Entry = result.entries.find(e => e.name === 'file1.txt');
            const file2Entry = result.entries.find(e => e.name === 'file2.js');
            const dirEntry = result.entries.find(e => e.name === 'subdir');

            expect(file1Entry?.type).toBe('file');
            expect(file2Entry?.type).toBe('file');
            expect(dirEntry?.type).toBe('directory');

            // Check sizes for files
            expect(file1Entry?.size).toBeGreaterThan(0);
            expect(file2Entry?.size).toBeGreaterThan(0);
            expect(dirEntry?.size).toBeUndefined();
        });

        it('should handle empty directory', async () => {
            const result = await listDirectoryForResult(tempDir);

            expect(result.path).toBe(tempDir);
            expect(result.entries).toHaveLength(0);
        });

        it('should handle non-existent directory', async () => {
            const nonExistentDir = path.join(tempDir, 'non-existent');

            await expect(listDirectoryForResult(nonExistentDir))
                .rejects
                .toThrow('Failed to list directory');
        });

        it('should handle directory with mixed content', async () => {
            // Create various types of files
            const testFile = path.join(tempDir, 'test.txt');
            const testDir = path.join(tempDir, 'test-dir');
            
            await fs.writeFile(testFile, 'test content', 'utf8');
            await fs.mkdir(testDir);

            const result = await listDirectoryForResult(tempDir);

            expect(result.path).toBe(tempDir);
            expect(result.entries).toHaveLength(2);

            const fileEntry = result.entries.find(e => e.name === 'test.txt');
            const dirEntry = result.entries.find(e => e.name === 'test-dir');

            expect(fileEntry?.type).toBe('file');
            expect(dirEntry?.type).toBe('directory');
            expect(fileEntry?.size).toBeGreaterThan(0);
        });
    });
});