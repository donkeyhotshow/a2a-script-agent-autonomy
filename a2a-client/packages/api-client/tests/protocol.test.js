const {
    buildNewTaskContext,
    buildContinueContext,
    buildConfirmContext,
    serializeFileBlock,
    parseFileBlock,
    parseMessage,
} = require('../dist/index.js');

describe('protocol', () => {
    describe('buildNewTaskContext', () => {
        it('builds context with new_task', () => {
            const ctx = buildNewTaskContext('sid-1', ['task text']);
            expect(ctx.version).toBe('1.0');
            expect(ctx.session_id).toBe('sid-1');
            expect(ctx.new_task).toEqual(['task text']);
        });
        it('adds architectural_features when provided', () => {
            const ctx = buildNewTaskContext('sid-1', ['task'], ['Services in app/Domain']);
            expect(ctx.architectural_features).toEqual(['Services in app/Domain']);
        });
    });

    describe('buildContinueContext', () => {
        it('sets continue: true', () => {
            const ctx = buildContinueContext('sid-1');
            expect(ctx.continue).toBe(true);
        });
    });

    describe('buildConfirmContext', () => {
        it('sets confirm: true', () => {
            const ctx = buildConfirmContext('sid-1');
            expect(ctx.confirm).toBe(true);
        });
    });

    describe('serializeFileBlock', () => {
        it('serializes full file', () => {
            const s = serializeFileBlock('app/Service.php', '<?php');
            expect(s).toContain('```file:app/Service.php');
            expect(s).toContain('<?php');
        });
        it('serializes with line range', () => {
            const s = serializeFileBlock('a.php', 'x', 1, 5);
            expect(s).toContain('```file:a.php:1-5');
        });
    });

    describe('parseFileBlock', () => {
        it('parses full file block', () => {
            const text = '```file:app/x.php\ncontent\n```';
            const r = parseFileBlock(text);
            expect(r).toEqual({path: 'app/x.php', content: 'content'});
        });
        it('parses range block', () => {
            const text = '```file:app/x.php:10-20\nlines\n```';
            const r = parseFileBlock(text);
            expect(r.startLine).toBe(10);
            expect(r.endLine).toBe(20);
        });
    });

    describe('parseMessage', () => {
        it('parses context + files', () => {
            const msg = '```context\n{"version":"1.0","session_id":"s1"}\n```\n\n```file:a.php\nx\n```';
            const r = parseMessage(msg);
            expect(r.context.session_id).toBe('s1');
            expect(r.files).toHaveLength(1);
            expect(r.files[0].path).toBe('a.php');
        });
    });
});
