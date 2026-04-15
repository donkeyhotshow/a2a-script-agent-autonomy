import { describe, it, expect } from 'vitest';
import { pickInvokeContextPatch } from '@a2a-client/shared/context-invoke-patch.mjs';

describe('pickInvokeContextPatch', () => {
    it('returns empty for non-objects', () => {
        expect(pickInvokeContextPatch(null)).toEqual({});
        expect(pickInvokeContextPatch(undefined)).toEqual({});
        expect(pickInvokeContextPatch([])).toEqual({});
        expect(pickInvokeContextPatch('x')).toEqual({});
    });

    it('keeps whitelisted fields only', () => {
        expect(
            pickInvokeContextPatch({
                task: 't1',
                execution: { action: 'a', step: 's' },
                history: [{ role: 'user', message: 'hi' }],
                files: { 'a.ts': 'code' },
                scratchpad: { done: true },
                workbench: { sections: { s1: 'y' } },
                ragResults: [1],
                junk: { nested: true },
                hugeBlob: 'x'.repeat(1000),
            })
        ).toEqual({
            task: 't1',
            execution: { action: 'a', step: 's' },
            history: [{ role: 'user', message: 'hi' }],
            files: { 'a.ts': 'code' },
            scratchpad: { done: true },
            workbench: { sections: { s1: 'y' } },
            ragResults: [1],
        });
    });

    it('omits empty task string', () => {
        expect(pickInvokeContextPatch({ task: '', execution: { action: 'a', step: 's' } })).toEqual({
            execution: { action: 'a', step: 's' },
        });
    });

    it('passes vite_config and aliases', () => {
        expect(
            pickInvokeContextPatch({
                vite_config: { root: '/' },
                aliases: { '@': 'src' },
            })
        ).toEqual({
            vite_config: { root: '/' },
            aliases: { '@': 'src' },
        });
    });

    it('passes llmModel when non-empty', () => {
        expect(pickInvokeContextPatch({ llmModel: 'qwen3:8b', junk: 1 })).toEqual({ llmModel: 'qwen3:8b' });
        expect(pickInvokeContextPatch({ llmModel: '' })).toEqual({});
    });
});
