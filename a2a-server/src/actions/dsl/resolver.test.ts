/**
 * Tests for DSL Resolver
 */

import {describe, it, expect} from 'vitest';
import {DSLResolver} from './resolver.js';
import type {DSLAction, DSLMixin, DSLStep} from './parser.js';

describe('DSLResolver', () => {
    let resolver: DSLResolver;

    beforeEach(() => {
        resolver = new DSLResolver();
    });

    describe('resolve action', () => {
        it('should resolve action with no mixins', () => {
            const action: DSLAction = {
                id: 'simple-action',
                version: '1.0',
                steps: [
                    {
                        id: 'step1',
                        script: 'export default async function run() { return { result: 42 }; }',
                        output: 'step1_result',
                    },
                ],
            };

            const mixins = new Map<string, DSLMixin>();
            const result = resolver.resolve(action, mixins);

            expect(result.id).toBe('simple-action');
            expect(result.resolvedSteps).toHaveLength(1);
            expect(result.resolvedSteps[0].resolvedScript).toBe(action.steps[0].script);
        });

        it('should resolve mixin references', () => {
            const fileCollectorMixin: DSLMixin = {
                mixin: 'file-collector',
                script: 'export default async function run(input) { return { files: [] }; }',
                input: {
                    rootDir: {type: 'string'},
                    extensions: {type: 'array'},
                },
            };

            const action: DSLAction = {
                id: 'action-with-mixin',
                version: '1.0',
                mixins: ['file-collector'],
                steps: [
                    {
                        id: 'collect',
                        $mixin: 'file-collector',
                        input: {
                            rootDir: '/project',
                        },
                        output: 'files',
                    },
                ],
            };

            const mixins = new Map<string, DSLMixin>([['file-collector', fileCollectorMixin]]);
            const result = resolver.resolve(action, mixins);

            expect(result.resolvedMixins.has('file-collector')).toBe(true);
            expect(result.resolvedSteps[0].resolvedScript).toBe(fileCollectorMixin.script);
        });

        it('should merge mixin input defaults', () => {
            const mixin: DSLMixin = {
                mixin: 'test-mixin',
                script: 'export default async function run() { return {}; }',
                input: {
                    requiredParam: {type: 'string'},
                    optionalParam: {type: 'string', optional: true},
                    numberParam: {type: 'number'},
                },
            };

            const action: DSLAction = {
                id: 'test-action',
                version: '1.0',
                mixins: ['test-mixin'],
                steps: [
                    {
                        id: 'step1',
                        $mixin: 'test-mixin',
                        input: {
                            requiredParam: 'provided',
                        },
                        output: 'result',
                    },
                ],
            };

            const mixins = new Map<string, DSLMixin>([['test-mixin', mixin]]);
            const result = resolver.resolve(action, mixins);

            const resolvedInput = result.resolvedSteps[0].resolvedInput;
            expect(resolvedInput.requiredParam).toBe('provided');
            expect(resolvedInput.optionalParam).toBe('');  // Default for string
            expect(resolvedInput.numberParam).toBe(0);  // Default for number
        });

        it('should resolve variable interpolation', () => {
            const action: DSLAction = {
                id: 'interpolation-action',
                version: '1.0',
                steps: [
                    {
                        id: 'step1',
                        script: 'return { files: [] }',
                        output: 'files',
                    },
                    {
                        id: 'step2',
                        script: 'return {}',
                        input: {
                            files: '{{ step1.files }}',
                            count: '{{ step1.count }}',
                        },
                        output: 'result',
                    },
                ],
            };

            const mixins = new Map<string, DSLMixin>();
            const result = resolver.resolve(action, mixins);

            expect(result.resolvedSteps[1].resolvedInput.files).toBe('${inputs.step1.files}');
            expect(result.resolvedSteps[1].resolvedInput.count).toBe('${inputs.step1.count}');
        });
    });

    describe('merge actions', () => {
        it('should merge base and child actions', () => {
            const base: DSLAction = {
                id: 'base-action',
                version: '1.0',
                context: {framework: 'base'},
                steps: [
                    {id: 'base-step', script: 'return {}'},
                ],
            };

            const child: DSLAction = {
                id: 'child-action',
                version: '2.0',
                context: {language: 'typescript'},
                steps: [
                    {id: 'child-step', script: 'return {}'},
                ],
            };

            const result = resolver.mergeActions(base, child);

            expect(result.id).toBe('child-action');
            expect(result.version).toBe('2.0');
            expect(result.context).toEqual({framework: 'base', language: 'typescript'});
            expect(result.steps).toHaveLength(2);
            expect(result.steps[0].id).toBe('base-step');
            expect(result.steps[1].id).toBe('child-step');
        });

        it('should override base steps with child steps of same id', () => {
            const base: DSLAction = {
                id: 'base',
                version: '1.0',
                steps: [
                    {id: 'common-step', script: 'base implementation'},
                ],
            };

            const child: DSLAction = {
                id: 'child',
                version: '1.0',
                steps: [
                    {id: 'common-step', script: 'child implementation'},
                ],
            };

            const result = resolver.mergeActions(base, child);

            expect(result.steps).toHaveLength(1);
            expect(result.steps[0].script).toBe('child implementation');
        });
    });

    describe('resolve extends', () => {
        it('should return action as-is if no extends', async () => {
            const action: DSLAction = {
                id: 'no-extends',
                version: '1.0',
                steps: [{id: 'step1', script: 'return {}'}],
            };

            const result = await resolver.resolveExtends(action, async () => null);

            expect(result).toEqual(action);
        });

        it('should merge with base template', async () => {
            const base: DSLAction = {
                id: 'base-template',
                version: '1.0',
                steps: [
                    {id: 'init', script: 'base init'},
                ],
            };

            const child: DSLAction = {
                id: 'child-action',
                version: '1.0',
                extends: 'base-template',
                steps: [
                    {id: 'process', script: 'child process'},
                ],
            };

            const loadBase = async (name: string) => {
                if (name === 'base-template') return base;
                return null;
            };

            const result = await resolver.resolveExtends(child, loadBase);

            expect(result.steps).toHaveLength(2);
            expect(result.steps[0].id).toBe('init');
            expect(result.steps[1].id).toBe('process');
        });

        it('should throw error if base not found', async () => {
            const action: DSLAction = {
                id: 'orphan',
                version: '1.0',
                extends: 'missing-base',
                steps: [{id: 'step1', script: 'return {}'}],
            };

            await expect(
                resolver.resolveExtends(action, async () => null)
            ).rejects.toThrow('Base template not found: missing-base');
        });
    });

    describe('default values', () => {
        it('should provide correct default values', () => {
            const mixin: DSLMixin = {
                mixin: 'defaults-test',
                script: 'return {}',
                input: {
                    str: {type: 'string'},
                    num: {type: 'number'},
                    bool: {type: 'boolean'},
                    arr: {type: 'array'},
                    obj: {type: 'object'},
                    unknown: {type: 'custom'},
                },
            };

            const action: DSLAction = {
                id: 'defaults-action',
                version: '1.0',
                mixins: ['defaults-test'],
                steps: [
                    {
                        id: 'step1',
                        $mixin: 'defaults-test',
                        input: {},
                        output: 'result',
                    },
                ],
            };

            const mixins = new Map<string, DSLMixin>([['defaults-test', mixin]]);
            const result = resolver.resolve(action, mixins);

            const input = result.resolvedSteps[0].resolvedInput;
            expect(input.str).toBe('');
            expect(input.num).toBe(0);
            expect(input.bool).toBe(false);
            expect(input.arr).toEqual([]);
            expect(input.obj).toEqual({});
            expect(input.unknown).toBeNull();
        });
    });
});
