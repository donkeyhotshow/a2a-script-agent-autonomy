import {describe, expect, it} from 'vitest';
import {deepCloneJson} from '../../src/utils/deep-clone-json.js';

/** Callers relying on JSON clone for context patches must know undefined keys vanish. */
describe('human-review: deepCloneJson', () => {
    it('documents loss of undefined-valued keys after round-trip', () => {
        const src = {a: 1, b: undefined, c: {nested: undefined}};
        const clone = deepCloneJson(src);
        expect(Object.prototype.hasOwnProperty.call(clone, 'b')).toBe(false);
        expect(clone.c && Object.prototype.hasOwnProperty.call(clone.c, 'nested')).toBe(false);
    });
});
