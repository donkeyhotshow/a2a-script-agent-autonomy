/**
 * Tests for DSL Validator
 */

import {describe, it, expect, beforeEach} from 'vitest';
import {DSLValidator} from './validator.js';
import type {DSLAction, DSLMixin, DSLBase, DSLAST} from './parser.js';

describe('DSLValidator', () => {
    let validator: DSLValidator;

    beforeEach(() => {
        validator = new DSLValidator();
    });

    describe('validate action', () => {
        it('should validate a valid action', () => {
            const action: DSLAction = {
                id: 'test-action',
                version: '1.0',
                steps: [
                    {
                        id: 'step1',
                        script: 'export default async function run() { return {}; }',
                        output: 'result',
                    },
                ],
            };

            const ast: DSLAST = {
                type: 'action',
                data: action,
                raw: JSON.stringify(action),
                path: '/test/action.yaml',
            };

            const result = validator.validate(ast);

            expect(result.valid).toBe(true);
            expect(result.errors.filter(e => e.severity === 'error')).toHaveLength(0);
        });

        it('should fail for action without id', () => {
            const action = {
                version: '1.0',
                steps: [{id: 'step1', script: 'return {}'}],
            } as DSLAction;

            const ast: DSLAST = {
                type: 'action',
                data: action,
                raw: JSON.stringify(action),
                path: '/test/action.yaml',
            };

            const result = validator.validate(ast);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.path === 'action.id' && e.severity === 'error')).toBe(true);
        });

        it('should fail for action without steps', () => {
            const action = {
                id: 'no-steps',
                version: '1.0',
                steps: [],
            } as DSLAction;

            const ast: DSLAST = {
                type: 'action',
                data: action,
                raw: JSON.stringify(action),
                path: '/test/action.yaml',
            };

            const result = validator.validate(ast);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.path === 'action.steps' && e.severity === 'error')).toBe(true);
        });

        it('should fail for step without id', () => {
            const action = {
                id: 'bad-step',
                version: '1.0',
                steps: [
                    {
                        script: 'return {}',
                    } as any,
                ],
            } as DSLAction;

            const ast: DSLAST = {
                type: 'action',
                data: action,
                raw: JSON.stringify(action),
                path: '/test/action.yaml',
            };

            const result = validator.validate(ast);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.path.includes('steps[0].id') && e.severity === 'error')).toBe(true);
        });

        it('should fail for step without mixin or script', () => {
            const action = {
                id: 'no-executor',
                version: '1.0',
                steps: [
                    {
                        id: 'bad-step',
                    } as any,
                ],
            } as DSLAction;

            const ast: DSLAST = {
                type: 'action',
                data: action,
                raw: JSON.stringify(action),
                path: '/test/action.yaml',
            };

            const result = validator.validate(ast);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.path.includes('steps[0]') && e.severity === 'error')).toBe(true);
        });

        it('should warn for non-kebab-case id', () => {
            const action: DSLAction = {
                id: 'notKebabCase',
                version: '1.0',
                steps: [{id: 'step1', script: 'return {}'}],
            };

            const ast: DSLAST = {
                type: 'action',
                data: action,
                raw: JSON.stringify(action),
                path: '/test/action.yaml',
            };

            const result = validator.validate(ast);

            expect(result.errors.some(e => e.path === 'action.id' && e.severity === 'warning')).toBe(true);
        });

        it('should fail for duplicate step ids', () => {
            const action: DSLAction = {
                id: 'duplicate-steps',
                version: '1.0',
                steps: [
                    {id: 'step1', script: 'return {}'},
                    {id: 'step1', script: 'return {}'},
                ],
            };

            const ast: DSLAST = {
                type: 'action',
                data: action,
                raw: JSON.stringify(action),
                path: '/test/action.yaml',
            };

            const result = validator.validate(ast);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes('Duplicate step id'))).toBe(true);
        });
    });

    describe('validate mixin', () => {
        it('should validate a valid mixin', () => {
            const mixin: DSLMixin = {
                mixin: 'test-mixin',
                version: '1.0',
                description: 'A test mixin',
                input: {
                    rootDir: {type: 'string'},
                },
                output: {
                    files: {type: 'array'},
                },
                script: 'export default async function run() { return {}; }',
            };

            const ast: DSLAST = {
                type: 'mixin',
                data: mixin,
                raw: JSON.stringify(mixin),
                path: '/test/mixin.yaml',
            };

            const result = validator.validate(ast);

            expect(result.valid).toBe(true);
        });

        it('should fail for mixin without name', () => {
            const mixin = {
                version: '1.0',
                description: 'No name',
            } as DSLMixin;

            const ast: DSLAST = {
                type: 'mixin',
                data: mixin,
                raw: JSON.stringify(mixin),
                path: '/test/mixin.yaml',
            };

            const result = validator.validate(ast);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.path === 'mixin.mixin' && e.severity === 'error')).toBe(true);
        });

        it('should warn for field without type', () => {
            const mixin: DSLMixin = {
                mixin: 'bad-fields',
                input: {
                    rootDir: {optional: true} as any,
                },
            };

            const ast: DSLAST = {
                type: 'mixin',
                data: mixin,
                raw: JSON.stringify(mixin),
                path: '/test/mixin.yaml',
            };

            const result = validator.validate(ast);

            expect(result.errors.some(e => e.path.includes('input.rootDir') && e.severity === 'warning')).toBe(true);
        });
    });

    describe('validate base template', () => {
        it('should validate a valid base template', () => {
            const base: DSLBase = {
                base: 'test-base',
                version: '1.0',
                description: 'A test base',
                abstract: true,
                steps: [
                    {id: 'init', script: 'return {}'},
                ],
            };

            const ast: DSLAST = {
                type: 'base',
                data: base,
                raw: JSON.stringify(base),
                path: '/test/base.yaml',
            };

            const result = validator.validate(ast);

            expect(result.valid).toBe(true);
        });

        it('should fail for base without name', () => {
            const base = {
                version: '1.0',
                abstract: true,
                steps: [{id: 'step1', script: 'return {}'}],
            } as DSLBase;

            const ast: DSLAST = {
                type: 'base',
                data: base,
                raw: JSON.stringify(base),
                path: '/test/base.yaml',
            };

            const result = validator.validate(ast);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.path === 'base.base' && e.severity === 'error')).toBe(true);
        });

        it('should fail for base without steps', () => {
            const base = {
                base: 'no-steps',
                version: '1.0',
                abstract: true,
                steps: [],
            } as DSLBase;

            const ast: DSLAST = {
                type: 'base',
                data: base,
                raw: JSON.stringify(base),
                path: '/test/base.yaml',
            };

            const result = validator.validate(ast);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.path === 'base.steps' && e.severity === 'error')).toBe(true);
        });

        it('should warn for non-kebab-case base name', () => {
            const base: DSLBase = {
                base: 'NotKebabCase',
                version: '1.0',
                abstract: true,
                steps: [{id: 'step1', script: 'return {}'}],
            };

            const ast: DSLAST = {
                type: 'base',
                data: base,
                raw: JSON.stringify(base),
                path: '/test/base.yaml',
            };

            const result = validator.validate(ast);

            expect(result.errors.some(e => e.path === 'base.base' && e.severity === 'warning')).toBe(true);
        });

        it('should warn for non-abstract base without abstract flag', () => {
            const base: DSLBase = {
                base: 'concrete-base',
                version: '1.0',
                steps: [{id: 'step1', script: 'return {}'}],
            };

            const ast: DSLAST = {
                type: 'base',
                data: base,
                raw: JSON.stringify(base),
                path: '/test/base.yaml',
            };

            const result = validator.validate(ast);

            expect(result.errors.some(e => e.path === 'base.abstract' && e.severity === 'warning')).toBe(true);
        });
    });

    describe('step condition validation', () => {
        it('should warn for invalid condition syntax', () => {
            const action: DSLAction = {
                id: 'conditional-action',
                version: '1.0',
                steps: [
                    {
                        id: 'step1',
                        script: 'return {}',
                        if: '{{ unclosed',  // Invalid - unclosed braces
                    },
                ],
            };

            const ast: DSLAST = {
                type: 'action',
                data: action,
                raw: JSON.stringify(action),
                path: '/test/action.yaml',
            };

            const result = validator.validate(ast);

            expect(result.errors.some(e => e.path.includes('if') && e.severity === 'warning')).toBe(true);
        });

        it('should pass for valid condition syntax', () => {
            const action: DSLAction = {
                id: 'conditional-action',
                version: '1.0',
                steps: [
                    {
                        id: 'step1',
                        script: 'return {}',
                        if: '{{ step0.result }}',
                    },
                ],
            };

            const ast: DSLAST = {
                type: 'action',
                data: action,
                raw: JSON.stringify(action),
                path: '/test/action.yaml',
            };

            const result = validator.validate(ast);

            expect(result.errors.filter(e => e.path.includes('if'))).toHaveLength(0);
        });
    });
});
