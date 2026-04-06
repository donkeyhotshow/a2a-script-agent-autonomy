import {describe, expect, it} from 'vitest';
import {resolveResultObject} from '../../src/services/core/request-processor/normalization.js';

/** Nested context.result as array (bad envelope) must not crash merge; root result still wins. */
describe('human-review: resolveResultObject', () => {
    it('ignores array nested context.result and still returns root result', () => {
        const merged = resolveResultObject({
            context: {result: ['bad']},
            result: {message: 'from-root'},
        });
        expect(merged?.message).toBe('from-root');
    });
});
