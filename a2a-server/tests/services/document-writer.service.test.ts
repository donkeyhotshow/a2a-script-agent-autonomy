/**
 * Tests for Document Writer Service
 */

import {describe, it, expect, beforeEach} from 'vitest';
import {DocumentWriterService} from '../../src/services/document-writer.service.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDir = path.join(__dirname, '..', 'test-output');

describe('DocumentWriterService', () => {
    let service: DocumentWriterService;

    beforeEach(async () => {
        // Reset singleton
        (DocumentWriterService as unknown as {instance: DocumentWriterService | null}).instance = null;
        service = DocumentWriterService.getInstance();

        // Ensure test directory exists
        await fs.mkdir(testDir, {recursive: true});
    });

    describe('writeDocument', () => {
        it('should write a simple document', async () => {
            const filePath = path.join(testDir, 'test-doc.md');
            const content = '# Test Document\n\nThis is a test.';

            const result = await service.writeDocument({
                filePath,
                content,
                format: 'markdown',
            });

            expect(result.success).toBe(true);
            expect(result.bytesWritten).toBeGreaterThan(0);

            // Verify file was written
            const readContent = await fs.readFile(filePath, 'utf8');
            expect(readContent).toBe(content);
        });

        it('should create backup when requested', async () => {
            const filePath = path.join(testDir, 'backup-test.md');
            const originalContent = 'Original content';
            const newContent = 'New content';

            // Write original
            await service.writeDocument({
                filePath,
                content: originalContent,
            });

            // Overwrite with backup
            const result = await service.writeDocument({
                filePath,
                content: newContent,
                overwrite: true,
                createBackup: true,
            });

            expect(result.success).toBe(true);
            expect(result.backupPath).toBeDefined();

            // Verify backup exists
            if (result.backupPath) {
                const backupContent = await fs.readFile(result.backupPath, 'utf8');
                expect(backupContent).toBe(originalContent);
            }
        });

        it('should fail when file exists and overwrite is false', async () => {
            const filePath = path.join(testDir, 'no-overwrite.md');

            // Write first time
            await service.writeDocument({
                filePath,
                content: 'First content',
            });

            // Try to write without overwrite
            const result = await service.writeDocument({
                filePath,
                content: 'Second content',
                overwrite: false,
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('already exists');
        });
    });

    describe('validateContent', () => {
        it('should validate valid JSON', () => {
            const result = service.validateContent('{"key": "value"}', 'json');

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject invalid JSON', () => {
            const result = service.validateContent('{"key": invalid}', 'json');

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Invalid JSON format');
        });

        it('should reject empty content', () => {
            const result = service.validateContent('', 'markdown');

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Content is empty');
        });
    });

    describe('generateTaskReport', () => {
        it('should generate a task report', async () => {
            const context = {
                taskTitle: 'Test Task',
                taskDescription: 'This is a test task',
                subtasks: [
                    {title: 'Subtask 1', status: 'completed'},
                    {title: 'Subtask 2', status: 'in-progress'},
                    {title: 'Subtask 3', status: 'pending'},
                ],
                executionTime: 5000,
                sessionId: 'session-1',
            };

            const report = await service.generateTaskReport(context);

            expect(report).toContain('# Task Report: Test Task');
            expect(report).toContain('Subtask 1');
            expect(report).toContain('completed');
            expect(report).toContain('Execution Time: 5000ms');
        });
    });

    describe('generateApiDocumentation', () => {
        it('should generate API documentation', async () => {
            const context = {
                title: 'Test API',
                version: '1.0.0',
                endpoints: [
                    {
                        method: 'GET',
                        path: '/users',
                        description: 'Get all users',
                        parameters: [
                            {name: 'page', type: 'number', required: false, description: 'Page number'},
                        ],
                        responses: [
                            {code: 200, description: 'Success'},
                        ],
                    },
                ],
            };

            const doc = await service.generateApiDocumentation(context);

            expect(doc).toContain('# Test API');
            expect(doc).toContain('**Version:** 1.0.0');
            expect(doc).toContain('GET /users');
            expect(doc).toContain('Get all users');
        });
    });

    describe('templates', () => {
        it('should list default templates', () => {
            const templates = service.listTemplates();

            expect(templates.length).toBeGreaterThan(0);
            expect(templates.some(t => t.type === 'documentation')).toBe(true);
            expect(templates.some(t => t.type === 'report')).toBe(true);
        });

        it('should register custom template', () => {
            service.registerTemplate({
                id: 'custom-template',
                name: 'Custom Template',
                type: 'documentation',
                format: 'markdown',
                template: '# {{title}}\n\nCustom: {{description}}',
                variables: ['title', 'description'],
            });

            const template = service.getTemplate('custom-template');
            expect(template).toBeDefined();
            expect(template?.name).toBe('Custom Template');
        });
    });

    describe('appendToDocument', () => {
        it('should append content to existing file', async () => {
            const filePath = path.join(testDir, 'append-test.md');
            const originalContent = '# Header\n\n';
            const appendContent = 'Appended content';

            // Create initial file
            await service.writeDocument({
                filePath,
                content: originalContent,
            });

            // Append content
            const result = await service.appendToDocument(filePath, appendContent);

            expect(result.success).toBe(true);

            // Verify content
            const readContent = await fs.readFile(filePath, 'utf8');
            expect(readContent).toContain('Appended content');
        });
    });
});
