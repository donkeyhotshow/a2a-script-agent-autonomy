import { describe, it, expect } from 'vitest';
import { isActivePromiseStatus, isPromisePollComplete } from '../../packages/vite-plugin/storage/promise-status.js';
import { mergeDialogHistoryForInvoke } from '../../shared/dialog-invoke-history.mjs';

describe('isPromisePollComplete', () => {
    it('true when execute or terminal status', () => {
        expect(isPromisePollComplete({ execute: { message: 'x' } })).toBe(true);
        expect(isPromisePollComplete({ status: 'completed' })).toBe(true);
        expect(isPromisePollComplete({ status: 'done' })).toBe(true);
    });
    it('false when still pending or invalid', () => {
        expect(isPromisePollComplete({ status: 'pending' })).toBe(false);
        expect(isPromisePollComplete({ status: 'processing' })).toBe(false);
        expect(isPromisePollComplete(null)).toBe(false);
    });
});

describe('isActivePromiseStatus', () => {
    it('treats pending and processing as active', () => {
        expect(isActivePromiseStatus('pending')).toBe(true);
        expect(isActivePromiseStatus('processing')).toBe(true);
    });
    it('treats completed and missing status as inactive', () => {
        expect(isActivePromiseStatus('completed')).toBe(false);
        expect(isActivePromiseStatus(undefined)).toBe(false);
    });
});

describe('mergeDialogHistoryForInvoke', () => {
    it('appends user after assistant', () => {
        const ctx = {
            history: [
                { role: 'user', message: 'a' },
                { role: 'assistant', message: 'b' },
            ],
        };
        mergeDialogHistoryForInvoke(ctx, 'c');
        expect(ctx.history).toEqual([
            { role: 'user', message: 'a' },
            { role: 'assistant', message: 'b' },
            { role: 'user', message: 'c' },
        ]);
    });
    it('appends new user entry when text changes (accumulate history)', () => {
        const ctx = { history: [{ role: 'user', message: 'old' }] };
        mergeDialogHistoryForInvoke(ctx, 'new');
        expect(ctx.history).toEqual([
            { role: 'user', message: 'old' },
            { role: 'user', message: 'new' },
        ]);
    });
    it('appends new entry when content differs (accumulate history)', () => {
        const ctx = { history: [{ role: 'user', content: 'x' }] };
        mergeDialogHistoryForInvoke(ctx, 'y');
        expect(ctx.history).toEqual([
            { role: 'user', content: 'x' },
            { role: 'user', message: 'y' },
        ]);
    });
    it('no-op for null context or empty task', () => {
        expect(() => mergeDialogHistoryForInvoke(null, 'x')).not.toThrow();
        const ctx = { history: [] };
        mergeDialogHistoryForInvoke(ctx, '');
        mergeDialogHistoryForInvoke(ctx, undefined);
        expect(ctx.history).toEqual([]);
    });
});
