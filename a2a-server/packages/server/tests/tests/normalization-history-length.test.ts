import {describe, expect, it} from 'vitest';
import {resolveHistoryLength} from '../src/services/core/request-processor/normalization';

describe('resolveHistoryLength', () => {
    it('prefers root history when present', () => {
        expect(
            resolveHistoryLength({
                history: [{role: 'user'}],
                context: {history: [{}, {}, {}]},
            })
        ).toBe(1);
    });

    it('falls back to context.history', () => {
        expect(
            resolveHistoryLength({
                context: {history: [{}, {}]},
            })
        ).toBe(2);
    });

    it('returns 0 when missing', () => {
        expect(resolveHistoryLength({})).toBe(0);
        expect(resolveHistoryLength({context: {}})).toBe(0);
    });

    it('matches gray-room compress_history dual-write (root + context.history same length)', () => {
        const compressed = [{role: 'user', message: 'a'}];
        const ctx = {
            history: compressed,
            context: {history: compressed},
        };
        expect(resolveHistoryLength(ctx)).toBe(1);
    });
});
