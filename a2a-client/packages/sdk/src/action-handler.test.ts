import { describe, it, expect } from 'vitest';
import { extractExecuteAction, handleExecuteAction } from './action-handler.js';
import type { HandleActionOptions } from './types.js';

describe('extractExecuteAction (T008)', () => {
    it('returns type and payload for a single execute key', () => {
        const a = extractExecuteAction({
            execute: { form: { title: 'x', choices: [{ id: 'a', label: 'A' }] } },
        });
        expect(a?.type).toBe('form');
        expect(a && 'payload' in a ? a.payload : null).toBeTruthy();
    });

    it('returns invalid when multiple execute keys', () => {
        const a = extractExecuteAction({
            execute: { message: 'hi', form: {} },
        });
        expect(a?.type).toBe('invalid');
    });
});

describe('handleExecuteAction multi-key guard', () => {
    it('fails safe when execute has two keys', async () => {
        const res = await handleExecuteAction(
            { execute: { message: 'a', script: { code: 'x', input: {}, output: 'o' } } },
            {} as HandleActionOptions
        );
        expect(res.handled).toBe(false);
        expect(res.error).toMatch(/exactly one action key/i);
    });
});
