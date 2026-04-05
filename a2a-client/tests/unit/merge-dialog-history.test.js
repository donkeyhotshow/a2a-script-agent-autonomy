import { describe, expect, it } from 'vitest';
import { mergeDialogHistoryForInvoke } from '../../packages/vite-plugin/routes/utils/builders.js';

describe('mergeDialogHistoryForInvoke', () => {
    it('appends user after assistant', () => {
        const ctx = {
            history: [
                { role: 'user', message: 'a' },
                { role: 'assistant', message: 'b' },
            ],
        };
        mergeDialogHistoryForInvoke(ctx, 'next');
        expect(ctx.history).toEqual([
            { role: 'user', message: 'a' },
            { role: 'assistant', message: 'b' },
            { role: 'user', message: 'next' },
        ]);
    });

    it('appends new user entry when text differs (accumulate history)', () => {
        const ctx = {
            history: [{ role: 'user', message: 'old' }],
        };
        mergeDialogHistoryForInvoke(ctx, 'new');
        expect(ctx.history).toEqual([
            { role: 'user', message: 'old' },
            { role: 'user', message: 'new' },
        ]);
    });

    it('no-op when last user matches (idempotent)', () => {
        const ctx = {
            history: [{ role: 'user', message: 'same' }],
        };
        mergeDialogHistoryForInvoke(ctx, 'same');
        expect(ctx.history).toEqual([{ role: 'user', message: 'same' }]);
    });

    it('appends new entry when content differs (accumulate history)', () => {
        const ctx = {
            history: [{ role: 'user', content: 'x' }],
        };
        mergeDialogHistoryForInvoke(ctx, 'y');
        expect(ctx.history).toEqual([
            { role: 'user', content: 'x' },
            { role: 'user', message: 'y' },
        ]);
    });
});
