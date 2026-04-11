import {describe, expect, it} from 'vitest';
import {deepCloneJson} from '../../src/utils/deep-clone-json';

describe('deepCloneJson', () => {
    it('clones plain objects and arrays deeply', () => {
        const src = {a: 1, nested: {b: [2, 3]}};
        const c = deepCloneJson(src);
        expect(c).toEqual(src);
        expect(c).not.toBe(src);
        expect(c.nested).not.toBe(src.nested);
        expect(c.nested.b).not.toBe(src.nested.b);
    });

    it('throws on circular references (JSON.stringify)', () => {
        const a: {self?: unknown} = {};
        a.self = a;
        expect(() => deepCloneJson(a)).toThrow();
    });

    it('throws when top-level value is undefined (JSON.stringify)', () => {
        expect(() => deepCloneJson(undefined)).toThrow();
    });

    it('drops function values like JSON.stringify', () => {
        const c = deepCloneJson({fn: () => 1, x: 2} as {fn: () => number; x: number});
        expect(c).toEqual({x: 2});
    });
});
