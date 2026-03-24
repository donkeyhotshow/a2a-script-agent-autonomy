import { describe, it, expect } from 'vitest';
import { buildWebExecute } from '../../vite-plugin-a2a/routes/utils/web-execute-dto.js';

describe('buildWebExecute', () => {
    it('maps rag-search to message + attachments.ragQuery', () => {
        const out = buildWebExecute({
            'rag-search': { query: 'express listen' },
        });
        expect(out['rag-search']).toBeUndefined();
        expect(out.message).toBe('Searching the codebase…');
        expect(out.attachments.ragQuery).toBe('express listen');
    });

    it('keeps server message and strips rag-search', () => {
        const out = buildWebExecute({
            message: 'Done.',
            'rag-search': { query: 'q' },
        });
        expect(out.message).toBe('Done.');
        expect(out.attachments.ragQuery).toBe('q');
    });

    it('maps read-file to readFiles', () => {
        const out = buildWebExecute({ 'read-file': { path: 'src/a.js' } });
        expect(out['read-file']).toBeUndefined();
        expect(out.message).toBe('Reading files…');
        expect(out.attachments.readFiles).toEqual([{ path: 'src/a.js' }]);
    });

    it('maps write-file to writtenFiles', () => {
        const out = buildWebExecute({
            'write-file': { path: 'out.md', content: 'x' },
        });
        expect(out['write-file']).toBeUndefined();
        expect(out.message).toBe('Updating files…');
        expect(out.attachments.writtenFiles).toEqual([{ path: 'out.md' }]);
    });

    it('maps script and execute-command', () => {
        expect(
            buildWebExecute({
                script: { code: 'return 1', input: {}, output: 'x' },
            }).attachments.pendingClientAction
        ).toBe('script');
        expect(
            buildWebExecute({
                'execute-command': { command: 'npm test' },
            }).attachments
        ).toMatchObject({
            pendingClientAction: 'execute-command',
            shellCommand: 'npm test',
        });
    });

    it('passes through form', () => {
        const form = { title: 'Pick', choices: [{ id: 'a', label: 'A' }] };
        const out = buildWebExecute({ form });
        expect(out.form).toEqual(form);
        expect(out.message).toBeUndefined();
    });
});
