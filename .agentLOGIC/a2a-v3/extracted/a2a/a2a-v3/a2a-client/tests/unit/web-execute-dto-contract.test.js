import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { sanitizeApiRecordExecuteFields } from '../../shared/web-execute-dto.mjs';

describe('WebExecuteDTOContract', () => {
    const clientOnlyActions = [
        'rag-search',
        'read-file',
        'write-file',
        'execute-command',
        'script',
        'list-directory',
        'grep-search',
        'file-exists',
        'edit-patch',
        'run-script',
    ];
    const allowedWebExecuteKeys = new Set(['message', 'llmMessage', 'form', 'attachments']);
    const simulationRoot = path.resolve(process.cwd(), '..', 'simulations', 'sync');
    const fixturePaths = [
        'dialog/1/received.json',
        'dialog/2/received.json',
        'dialog/3/received.json',
        'dialog/4/received.json',
        'agent-auto-ai/1/received.json',
        'agent-auto-ai/2/received.json',
        'agent-auto-ai/3/received.json',
        'agent-auto-ai/4/received.json',
        'agent-auto-ai/5/received.json',
        'agent-auto-ai/6/received.json',
        'agent-auto-ai/7/received.json',
    ];

    const readFixture = (relativePath) => {
        const fullPath = path.join(simulationRoot, relativePath);
        return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
    };

    const validateBaseStructure = (dto) => {
        expect(typeof dto.projectId).toBe('string');
        expect(typeof dto.sessionId).toBe('string');
        expect(dto.execute).toBeTruthy();
        expect(typeof dto.execute).toBe('object');

        Object.keys(dto.execute).forEach((key) => {
            expect(allowedWebExecuteKeys.has(key)).toBe(true);
        });

        clientOnlyActions.forEach((action) => {
            expect(dto.execute).not.toHaveProperty(action);
        });
    };

    const variantAssertions = {
        'dialog/1/received.json': (dto) => {
            expect(dto.execute.form.title).toBeTypeOf('string');
            expect(dto.execute.form.description).toBeTypeOf('string');
            expect(Array.isArray(dto.execute.form.choices)).toBe(true);
            expect(dto.execute.form.choices.length).toBeGreaterThan(0);
        },
        'dialog/2/received.json': (dto) => {
            expect(Array.isArray(dto.execute.form.input)).toBe(true);
            expect(dto.execute.form.input[0]).toMatchObject({
                name: expect.any(String),
                type: expect.any(String),
                label: expect.any(String),
                required: expect.any(Boolean),
            });
        },
        'dialog/3/received.json': (dto) => {
            expect(dto.execute.form.title).toBeTypeOf('string');
            expect(dto.execute.form.description).toBeTypeOf('string');
            expect(Array.isArray(dto.execute.form.input)).toBe(true);
        },
        'dialog/4/received.json': (dto) => {
            expect(dto.execute.form.title).toBeTypeOf('string');
            expect(dto.execute.form.description).toBeTypeOf('string');
            expect(Array.isArray(dto.execute.form.input)).toBe(true);
        },
        'agent-auto-ai/1/received.json': (dto) => {
            expect(Array.isArray(dto.execute.form.choices)).toBe(true);
            expect(dto.execute.form.choices[0]).toMatchObject({
                id: expect.any(String),
                label: expect.any(String),
                description: expect.any(String),
            });
        },
        'agent-auto-ai/2/received.json': (dto) => {
            expect(Array.isArray(dto.execute.form.input)).toBe(true);
            expect(dto.execute.form.input[0]).toMatchObject({
                name: expect.any(String),
                type: expect.any(String),
                label: expect.any(String),
                required: expect.any(Boolean),
            });
        },
        'agent-auto-ai/3/received.json': (dto) => {
            expect(dto.execute.message).toBeTypeOf('string');
            expect(dto.execute.attachments).toMatchObject({
                ragQuery: expect.any(String),
            });
        },
        'agent-auto-ai/4/received.json': (dto) => {
            expect(dto.execute.message).toBeTypeOf('string');
            expect(dto.execute.attachments).toMatchObject({
                listDirectoryPath: expect.any(String),
            });
        },
        'agent-auto-ai/5/received.json': (dto) => {
            expect(dto.execute.message).toBeTypeOf('string');
            expect(Array.isArray(dto.execute.attachments.readFiles)).toBe(true);
            expect(dto.execute.attachments.readFiles[0]).toMatchObject({
                path: expect.any(String),
            });
        },
        'agent-auto-ai/6/received.json': (dto) => {
            expect(dto.execute.message).toBeTypeOf('string');
            expect(Array.isArray(dto.execute.attachments.writtenFiles)).toBe(true);
            expect(dto.execute.attachments.writtenFiles[0]).toMatchObject({
                path: expect.any(String),
            });
        },
        'agent-auto-ai/7/received.json': (dto) => {
            expect(dto.execute.form.title).toBeTypeOf('string');
            expect(dto.execute.form.description).toBeTypeOf('string');
            expect(Array.isArray(dto.execute.form.choices)).toBe(true);
            expect(dto.execute.form.choices[0]).toMatchObject({
                id: expect.any(String),
                label: expect.any(String),
            });
        },
    };

    it.each(fixturePaths)('validates fixture matrix contract: %s', (fixturePath) => {
        const dto = readFixture(fixturePath);
        validateBaseStructure(dto);
        variantAssertions[fixturePath](dto);
    });

    it('keeps result action-key payload untouched while sanitizing execute', () => {
        const payload = {
            execute: { 'read-file': { path: 'src/app.js' } },
            currentExecute: { 'rag-search': { query: 'health route' } },
            result: {
                'read-file': { path: 'src/app.js', content: 'export {}' },
            },
        };

        const out = sanitizeApiRecordExecuteFields(payload);

        expect(out.execute).toMatchObject({
            message: 'Reading files…',
            attachments: { readFiles: [{ path: 'src/app.js' }] },
        });
        expect(out.currentExecute).toMatchObject({
            message: 'Searching the codebase…',
            attachments: { ragQuery: 'health route' },
        });
        expect(out.result).toEqual({
            'read-file': { path: 'src/app.js', content: 'export {}' },
        });
    });
});