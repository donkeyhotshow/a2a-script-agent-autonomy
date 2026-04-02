import {describe, expect, it} from 'vitest';
import {resolveHistoryLength} from '../src/services/core/request-processor/normalization.js';

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
});
