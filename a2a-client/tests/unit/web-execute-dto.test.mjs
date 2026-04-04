import { describe, it, expect } from 'vitest';
import { buildWebExecute } from '../../shared/web-execute-dto.mjs';

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

    it('adds Running script message when script + form (SCHEMA.md Web DTO)', () => {
        const form = { title: 'Message', description: 'Continue.' };
        const out = buildWebExecute({
            form,
            script: { code: 'return 1', input: {}, output: 'x' },
        });
        expect(out.script).toBeUndefined();
        expect(out.message).toBe('Running script…');
        expect(out.attachments.pendingClientAction).toBe('script');
        expect(out.form).toEqual(form);
    });

    it('augments form-only execute from autoScriptTrigger workbench (post run-script)', () => {
        const form = { title: 'Message', description: 'Patch applied.' };
        const context = {
            workbench: {
                sections: {
                    autoScriptTrigger: {
                        scriptId: 'fix-vue-imports',
                        lastOutput: "Replaced './Missing' with '@/components/Missing' in Example.vue.",
                        filesModified: ['resources/js/components/Example.vue'],
                    },
                },
            },
        };
        const out = buildWebExecute({ form }, { context });
        expect(out.message).toBe('Running script…');
        expect(out.attachments.runScriptId).toBe('fix-vue-imports');
        expect(out.form).toEqual(form);
    });

    it('maps list-directory and grep-search', () => {
        const a = buildWebExecute({ 'list-directory': { path: 'src/' } });
        expect(a['list-directory']).toBeUndefined();
        expect(a.attachments.listDirectoryPath).toBe('src/');
        expect(a.message).toBe('Listing directory…');

        const b = buildWebExecute({
            'grep-search': { pattern: 'foo', path: 'app', glob: '*.ts' },
        });
        expect(b.attachments).toMatchObject({
            grepPattern: 'foo',
            grepPath: 'app',
            grepGlob: '*.ts',
        });
        expect(b.message).toBe('Searching in files…');
    });

    it('maps file-exists, edit-patch, run-script', () => {
        expect(
            buildWebExecute({ 'file-exists': { path: 'x.txt' } }).attachments.fileExistsPath
        ).toBe('x.txt');
        expect(
            buildWebExecute({ 'edit-patch': { path: 'f.ts', operations: [] } }).attachments
                .editPatchPath
        ).toBe('f.ts');
        const r = buildWebExecute({ 'run-script': { scriptId: 'lint' } });
        expect(r.attachments.runScriptId).toBe('lint');
        expect(r.attachments.pendingClientAction).toBe('run-script');
    });
});
