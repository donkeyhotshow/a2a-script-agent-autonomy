import {describe, expect, it} from 'vitest';
import {
    parseActionContext,
    parseActionFromMarkdown,
    parsePrimitive,
    parseSubAction,
} from '../../src/actions/action-parser';

describe('parsePrimitive', () => {
    it('parses integers and floats', () => {
        expect(parsePrimitive('42')).toBe(42);
        expect(parsePrimitive('  3.5 ')).toBe(3.5);
    });

    it('does not treat non-numeric as number', () => {
        expect(parsePrimitive('12abc')).toBe('12abc');
    });

    it('empty and whitespace yield empty string branch', () => {
        expect(parsePrimitive('')).toBe('');
        expect(parsePrimitive('   ')).toBe('');
    });

    it('parses booleans case-insensitively', () => {
        expect(parsePrimitive('true')).toBe(true);
        expect(parsePrimitive('FALSE')).toBe(false);
    });
});

describe('parseActionContext', () => {
    it('reads English and Russian labels', () => {
        const c = parseActionContext(`Framework: Vue
Build tool: Vite
Aliases: a -> b, c -> d`);
        expect(c.framework).toBe('Vue');
        expect(c.buildTool).toBe('Vite');
        expect(c.aliases).toEqual({a: 'b', c: 'd'});
    });

    it('parses Russian section labels', () => {
        const c = parseActionContext(`Фреймворк: React
Инструмент сборки: webpack
псевдонимы: x -> y`);
        expect(c.framework).toBe('React');
        expect(c.buildTool).toBe('webpack');
        expect(c.aliases).toEqual({x: 'y'});
    });

    it('omits aliases when no valid pairs', () => {
        const c = parseActionContext('Framework: X\nAliases: nonsense');
        expect(c.aliases).toBeUndefined();
    });
});

describe('parseSubAction', () => {
    it('parses header id and numbered priority', () => {
        const s = parseSubAction(`### 5. my-action
First line title
Rest is description`);
        expect(s.id).toBe('my-action');
        expect(s.priority).toBe(5);
        expect(s.title).toBe('First line title');
    });

    it('parses DSL JSON block into script and input', () => {
        const s = parseSubAction(`### test-act
**DSL:**
\`\`\`json
{"script":"run.sh","input":{"k":1}}
\`\`\``);
        expect(s.dsl.script).toBe('run.sh');
        expect(s.dsl.input).toEqual({k: 1});
    });

    it('falls back to inline script: when JSON missing', () => {
        const s = parseSubAction(`### inline
**DSL:**
script: my-script
foo: bar`);
        expect(s.dsl.script).toBe('my-script');
        expect(s.dsl.input).toEqual({foo: 'bar'});
    });

    it('falls back to inline DSL when JSON fence is invalid', () => {
        const s = parseSubAction(`### bad-json
**DSL:**
\`\`\`json
{not valid json
\`\`\`
script: recover.sh
k: 2
`);
        expect(s.dsl.script).toBe('recover.sh');
        expect(s.dsl.input).toEqual({k: 2});
    });
});

describe('parseActionFromMarkdown', () => {
    it('uses filename when no top-level # id', () => {
        const a = parseActionFromMarkdown('no header', 'foo.md');
        expect(a.id).toBe('foo');
    });

    it('extracts id from first # line', () => {
        const a = parseActionFromMarkdown('# real-id\n\nbody', 'ignored.md');
        expect(a.id).toBe('real-id');
    });

    it('parses Sub-actions and Context sections', () => {
        const md = `# root

## Sub-actions

### 1. sub-one
Sub title

## Context
Framework: Nuxt
`;
        const a = parseActionFromMarkdown(md, 'x.md');
        expect(a.subActions).toHaveLength(1);
        expect(a.subActions[0].id).toBe('sub-one');
        expect(a.context.framework).toBe('Nuxt');
    });
});
