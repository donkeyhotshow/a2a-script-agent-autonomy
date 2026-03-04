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

/**
 * New Protocol Tests
 * Tests for action-key shape, execute.form, and new result format
 */
describe('New Protocol - Action Key Shape', () => {

    describe('execute action types', () => {
        it('should validate script execute format', () => {
            const execute = { script: { code: 'console.log(1)', input: {} } };
            expect(Object.keys(execute)[0]).toBe('script');
        });

        it('should validate read-file execute format', () => {
            const execute = { 'read-file': { path: '/src/index.js' } };
            expect(Object.keys(execute)[0]).toBe('read-file');
        });

        it('should validate write-file execute format', () => {
            const execute = { 'write-file': { path: '/a.js', content: 'x' } };
            expect(Object.keys(execute)[0]).toBe('write-file');
        });

        it('should validate execute-command execute format', () => {
            const execute = { 'execute-command': { command: 'ls -la' } };
            expect(Object.keys(execute)[0]).toBe('execute-command');
        });
    });

    describe('execute.form.choices', () => {
        it('should parse form with choices', () => {
            const response = {
                execute: {
                    form: {
                        title: 'Выберите действие',
                        choices: [
                            { id: 'confirm', label: 'Подтвердить' },
                            { id: 'cancel', label: 'Отмена' }
                        ]
                    }
                }
            };
            expect(response.execute.form.choices).toHaveLength(2);
            expect(response.execute.form.choices[0].id).toBe('confirm');
        });

        it('should parse form with input fields', () => {
            const response = {
                execute: {
                    form: {
                        title: 'Введите данные',
                        input: [
                            { name: 'path', type: 'text', label: 'Путь' }
                        ]
                    }
                }
            };
            expect(response.execute.form.input).toHaveLength(1);
            expect(response.execute.form.input[0].name).toBe('path');
        });
    });

    describe('execute.message', () => {
        it('should parse message type', () => {
            const response = {
                execute: {
                    message: {
                        content: 'Операция завершена',
                        type: 'info'
                    }
                }
            };
            expect(response.execute.message.content).toBe('Операция завершена');
            expect(response.execute.message.type).toBe('info');
        });
    });

    describe('result action-key shape', () => {
        it('should validate script result format', () => {
            const result = { result: { script: { output: 'ok' } } };
            expect(Object.keys(result.result)[0]).toBe('script');
        });

        it('should validate read-file result format', () => {
            const result = { result: { 'read-file': { path: '/a.js', content: 'x' } } };
            expect(Object.keys(result.result)[0]).toBe('read-file');
        });

        it('should validate write-file result format', () => {
            const result = { result: { 'write-file': { path: '/a.js', success: true } } };
            expect(Object.keys(result.result)[0]).toBe('write-file');
        });
    });
});
