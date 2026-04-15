import {describe, expect, it} from 'vitest';
import {
    stripOuterMarkdownJsonFence,
    tryParseJsonFromLlmText,
} from '../../src/utils/strip-markdown-json-fence.js';

describe('stripOuterMarkdownJsonFence', () => {
    it('returns plain JSON unchanged', () => {
        expect(stripOuterMarkdownJsonFence('{"a":1}')).toBe('{"a":1}');
    });

    it('strips ```json … ``` wrapper', () => {
        const s = stripOuterMarkdownJsonFence('```json\n{"x":2}\n```');
        expect(s).toBe('{"x":2}');
    });

    it('strips ``` wrapper without json tag', () => {
        expect(stripOuterMarkdownJsonFence('```\n{}\n```')).toBe('{}');
    });

    it('strips opening fence case-insensitively (JSON tag)', () => {
        expect(stripOuterMarkdownJsonFence('```JSON\n{"k":1}\n```')).toBe('{"k":1}');
    });

    it('strips trailing fence on last line only (m flag)', () => {
        expect(stripOuterMarkdownJsonFence('```\na\nb\n```')).toBe('a\nb');
    });

    it('without closing fence only strips opening prefix', () => {
        expect(stripOuterMarkdownJsonFence('```json\n{"a":1}')).toBe('{"a":1}');
    });

    it('strips first line-ending ``` even when more lines follow ($m)', () => {
        expect(stripOuterMarkdownJsonFence('```json\n{"a":1}\n```\ntrailer')).toBe(
            '{"a":1}\n\ntrailer'
        );
    });
});

describe('tryParseJsonFromLlmText', () => {
    it('parses plain object', () => {
        expect(tryParseJsonFromLlmText('{"a":1}')).toEqual({a: 1});
    });

    it('parses fenced block', () => {
        expect(tryParseJsonFromLlmText('```json\n{"b":2}\n```')).toEqual({b: 2});
    });

    it('extracts object from prose', () => {
        const o = tryParseJsonFromLlmText('here: {"c":3} done');
        expect(o).toEqual({c: 3});
    });

    it('parses array slice', () => {
        expect(tryParseJsonFromLlmText('x [1,2] y')).toEqual([1, 2]);
    });

    it('returns null on garbage', () => {
        expect(tryParseJsonFromLlmText('not json')).toBeNull();
    });

    it('treats null/undefined input as empty and returns null', () => {
        expect(tryParseJsonFromLlmText(null as unknown as string)).toBeNull();
        expect(tryParseJsonFromLlmText(undefined as unknown as string)).toBeNull();
    });

    it('returns null on empty / whitespace-only', () => {
        expect(tryParseJsonFromLlmText('')).toBeNull();
        expect(tryParseJsonFromLlmText('   \n\t  ')).toBeNull();
    });

    it('parses JSON false and zero (non-null primitives)', () => {
        expect(tryParseJsonFromLlmText('false')).toBe(false);
        expect(tryParseJsonFromLlmText('0')).toBe(0);
    });

    it('JSON null text is indistinguishable from parse failure (p !== null guard)', () => {
        expect(tryParseJsonFromLlmText('null')).toBeNull();
        expect(tryParseJsonFromLlmText('  null  ')).toBeNull();
    });

    it('invalid fenced body falls through to object slice', () => {
        const o = tryParseJsonFromLlmText(
            '```json\nnot-json\n```\n\n{"fix": true}',
        );
        expect(o).toEqual({fix: true});
    });

    it('invalid fenced body falls through to array slice', () => {
        const a = tryParseJsonFromLlmText('```\nbroken\n```\n[9]');
        expect(a).toEqual([9]);
    });

    it('returns null when braces look like JSON but are invalid', () => {
        expect(tryParseJsonFromLlmText('x { oops y')).toBeNull();
        expect(tryParseJsonFromLlmText('x [1,2')).toBeNull();
    });

    it('parses first fenced block when multiple exist', () => {
        const o = tryParseJsonFromLlmText(
            '```json\n{"first":1}\n```\n```json\n{"second":2}\n```',
        );
        expect(o).toEqual({first: 1});
    });

    it('parses fenced block not at string start (regex branch)', () => {
        const o = tryParseJsonFromLlmText('Here:\n```json\n{"mid":1}\n```\nThanks');
        expect(o).toEqual({mid: 1});
    });

    it('prefers object slice over array when both appear', () => {
        const o = tryParseJsonFromLlmText('x [1] y {"pick":"obj"} z');
        expect(o).toEqual({pick: 'obj'});
    });

    it('outer strip leaves invalid JSON when inner content is not JSON', () => {
        expect(stripOuterMarkdownJsonFence('```json\nnot json\n```')).toBe('not json');
    });

    it('tryParseJsonFromLlmText parses JSON string primitive', () => {
        expect(tryParseJsonFromLlmText('"hello"')).toBe('hello');
    });

    it('parses JSON true as value', () => {
        expect(tryParseJsonFromLlmText('true')).toBe(true);
    });

    it('parses JSON number primitive', () => {
        expect(tryParseJsonFromLlmText('42')).toBe(42);
    });

    it('returns null when fenced inner body is empty or whitespace', () => {
        expect(tryParseJsonFromLlmText('```json\n```')).toBeNull();
        expect(tryParseJsonFromLlmText('```json\n   \n```')).toBeNull();
    });

    it('uses non-greedy fence when prose follows second fence', () => {
        const o = tryParseJsonFromLlmText(
            'Text\n```json\n{"in":"fence"}\n```\nmore ```not``` here'
        );
        expect(o).toEqual({in: 'fence'});
    });

    it('nested object survives first-to-last brace slice', () => {
        const o = tryParseJsonFromLlmText('k {"outer":{"inner":1}} end');
        expect(o).toEqual({outer: {inner: 1}});
    });

    it('returns null when brace span merges two objects into invalid JSON', () => {
        expect(
            tryParseJsonFromLlmText('a {"x":1} b {"y":2} c')
        ).toBeNull();
    });

    it('stripOuterMarkdownJsonFence handles CRLF after opening fence', () => {
        expect(stripOuterMarkdownJsonFence('```json\r\n{"k":1}\r\n```')).toBe(
            '{"k":1}'
        );
    });

    it('tryParse succeeds on outer strip when only leading fence (no closing)', () => {
        expect(tryParseJsonFromLlmText('```json\n{"solo":1}')).toEqual({solo: 1});
    });
});
