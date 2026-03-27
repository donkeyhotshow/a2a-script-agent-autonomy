// @vitest-environment node
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const readFixture = (fixturePath) => {
    const fullPath = path.resolve(process.cwd(), '../../../', fixturePath);
    return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
};

describe('Web Execute DTO Contract Validation', () => {
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
        'run-script'
    ];

    const validateBaseStructure = (dto) => {
        expect(dto).toHaveProperty('projectId');
        expect(dto).toHaveProperty('sessionId');
        expect(dto).toHaveProperty('execute');
        expect(typeof dto.projectId).toBe('string');
        expect(typeof dto.sessionId).toBe('string');
        expect(typeof dto.execute).toBe('object');
        expect(dto.execute).not.toBeNull();

        // Ensure no client-only actions in execute
        clientOnlyActions.forEach(action => {
            expect(dto.execute).not.toHaveProperty(action);
        });
    };

    describe('Router Form Test', () => {
        it('should validate router form structure', () => {
            const dto = readFixture('simulations/dialog/1/received.json');
            validateBaseStructure(dto);

            expect(dto.execute).toHaveProperty('form');
            expect(dto.execute.form).toHaveProperty('title');
            expect(dto.execute.form).toHaveProperty('description');
            expect(dto.execute.form).toHaveProperty('choices');

            expect(typeof dto.execute.form.title).toBe('string');
            expect(typeof dto.execute.form.description).toBe('string');
            expect(Array.isArray(dto.execute.form.choices)).toBe(true);

            dto.execute.form.choices.forEach(choice => {
                expect(choice).toHaveProperty('id');
                expect(choice).toHaveProperty('label');
                expect(choice).toHaveProperty('description');
                expect(typeof choice.id).toBe('string');
                expect(typeof choice.label).toBe('string');
                expect(typeof choice.description).toBe('string');
            });

            expect(dto.execute.form.choices.length).toBeGreaterThan(0);
        });
    });

    describe('Dialog Input Test', () => {
        it('should validate dialog input form structure', () => {
            const dto = readFixture('simulations/dialog/2/received.json');
            validateBaseStructure(dto);

            expect(dto.execute).toHaveProperty('form');
            expect(dto.execute.form).toHaveProperty('input');
            expect(Array.isArray(dto.execute.form.input)).toBe(true);

            dto.execute.form.input.forEach(input => {
                expect(input).toHaveProperty('name');
                expect(input).toHaveProperty('type');
                expect(input).toHaveProperty('label');
                expect(input).toHaveProperty('required');
                expect(typeof input.name).toBe('string');
                expect(typeof input.type).toBe('string');
                expect(typeof input.label).toBe('string');
                expect(typeof input.required).toBe('boolean');
            });

            expect(dto.execute.form.input.length).toBeGreaterThan(0);
        });
    });

    describe('Message with Read Attachments Test', () => {
        it('should validate message with read files attachments', () => {
            const dto = readFixture('simulations/agent-auto-ai/5/received.json');
            validateBaseStructure(dto);

            expect(dto.execute).toHaveProperty('message');
            expect(dto.execute).toHaveProperty('attachments');
            expect(dto.execute.attachments).toHaveProperty('readFiles');

            expect(typeof dto.execute.message).toBe('string');
            expect(Array.isArray(dto.execute.attachments.readFiles)).toBe(true);

            dto.execute.attachments.readFiles.forEach(file => {
                expect(file).toHaveProperty('path');
                expect(typeof file.path).toBe('string');
            });

            expect(dto.execute.attachments.readFiles.length).toBeGreaterThan(0);
        });
    });

    describe('Message with Write Attachments Test', () => {
        it('should validate message with written files attachments', () => {
            const dto = readFixture('simulations/agent-auto-ai/6/received.json');
            validateBaseStructure(dto);

            expect(dto.execute).toHaveProperty('message');
            expect(dto.execute).toHaveProperty('attachments');
            expect(dto.execute.attachments).toHaveProperty('writtenFiles');

            expect(typeof dto.execute.message).toBe('string');
            expect(Array.isArray(dto.execute.attachments.writtenFiles)).toBe(true);

            dto.execute.attachments.writtenFiles.forEach(file => {
                expect(file).toHaveProperty('path');
                expect(typeof file.path).toBe('string');
            });

            expect(dto.execute.attachments.writtenFiles.length).toBeGreaterThan(0);
        });
    });

    describe('Confirmation Form Test', () => {
        it('should validate confirmation form structure', () => {
            const dto = readFixture('simulations/agent-auto-ai/7/received.json');
            validateBaseStructure(dto);

            expect(dto.execute).toHaveProperty('form');
            expect(dto.execute.form).toHaveProperty('title');
            expect(dto.execute.form).toHaveProperty('description');
            expect(dto.execute.form).toHaveProperty('choices');

            expect(typeof dto.execute.form.title).toBe('string');
            expect(typeof dto.execute.form.description).toBe('string');
            expect(Array.isArray(dto.execute.form.choices)).toBe(true);

            dto.execute.form.choices.forEach(choice => {
                expect(choice).toHaveProperty('id');
                expect(choice).toHaveProperty('label');
                expect(typeof choice.id).toBe('string');
                expect(typeof choice.label).toBe('string');
            });

            expect(dto.execute.form.choices.length).toBeGreaterThan(0);
        });
    });
});