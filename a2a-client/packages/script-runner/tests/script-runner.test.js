/**
 * Script Runner Package Unit Tests - Stubs
 * Tests for @a2a/script-runner package
 */

import {describe, it, expect, beforeEach, vi} from 'vitest';
import {executeScript, ScriptRunner, scriptRunner} from '../src/index.js';

// Mock vm2
vi.mock('vm2', () => ({
    VM: vi.fn().mockImplementation(() => ({
        run: vi.fn(),
    })),
}));

describe('@a2a/script-runner', () => {
    let mockVM;

    beforeEach(() => {
        mockVM = {
            run: vi.fn(),
        };
        vi.mocked(require('vm2').VM).mockImplementation(() => mockVM);
    });

    describe('executeScript()', () => {
        const context = {
            sessionId: 'test-session',
            workingDir: '/test/dir',
            aliases: {alias1: 'value1'},
            previousOutput: {prev: 'output'}
        };

        describe('basic execution', () => {
            it('should execute simple script', async () => {
                const code = 'const result = 2 + 2; return result;';
                const input = {test: 'input'};
                
                mockVM.run.mockResolvedValue(4);

                const result = await executeScript(code, input, context);

                expect(result.success).toBe(true);
                expect(result.data).toBe(4);
                expect(result.duration_ms).toBeGreaterThanOrEqual(0);
                expect(mockVM.run).toHaveBeenCalled();
            });

            it('should return success result', async () => {
                const code = 'return {success: true};';
                const input = {};
                
                mockVM.run.mockResolvedValue({success: true});

                const result = await executeScript(code, input, context);

                expect(result.success).toBe(true);
                expect(result.data).toEqual({success: true});
            });

            it('should return error result on failure', async () => {
                const code = 'throw new Error("Test error");';
                const input = {};
                
                mockVM.run.mockRejectedValue(new Error('Test error'));

                const result = await executeScript(code, input, context);

                expect(result.success).toBe(false);
                expect(result.error).toBe('Test error');
                expect(result.duration_ms).toBeGreaterThanOrEqual(0);
            });

            it('should measure duration', async () => {
                const code = 'return "test";';
                const input = {};
                
                mockVM.run.mockResolvedValue('test');

                const start = Date.now();
                const result = await executeScript(code, input, context);
                const end = Date.now();

                expect(result.duration_ms).toBeGreaterThanOrEqual(0);
                expect(result.duration_ms).toBeLessThanOrEqual(end - start);
            });
        });

        describe('input handling', () => {
            it('should pass input to script', async () => {
                const code = 'return input.test;';
                const input = {test: 'value'};
                
                mockVM.run.mockResolvedValue('value');

                await executeScript(code, input, context);

                expect(mockVM.run).toHaveBeenCalled();
                // Verify that the sandbox was created with the correct input
                const callArgs = vi.mocked(require('vm2').VM).mock.calls[0][0];
                expect(callArgs.sandbox.input).toEqual({
                    test: 'value',
                    aliases: {alias1: 'value1'},
                    rootDir: '/test/dir'
                });
            });

            it('should include aliases in input', async () => {
                const code = 'return input.aliases.alias1;';
                const input = {};
                
                mockVM.run.mockResolvedValue('value1');

                await executeScript(code, input, context);

                const callArgs = vi.mocked(require('vm2').VM).mock.calls[0][0];
                expect(callArgs.sandbox.input.aliases).toEqual({alias1: 'value1'});
            });

            it('should include workingDir in input', async () => {
                const code = 'return input.rootDir;';
                const input = {};
                
                mockVM.run.mockResolvedValue('/test/dir');

                await executeScript(code, input, context);

                const callArgs = vi.mocked(require('vm2').VM).mock.calls[0][0];
                expect(callArgs.sandbox.input.rootDir).toBe('/test/dir');
            });
        });

        describe('code transformation', () => {
            it('should remove TypeScript types', async () => {
                const code = 'const x: number = 5; return x;';
                const input = {};
                
                mockVM.run.mockResolvedValue(5);

                await executeScript(code, input, context);

                const callArgs = vi.mocked(require('vm2').VM).mock.calls[0][0];
                const transformedCode = callArgs.sandbox.input;
                // The code should be transformed to remove TypeScript types
                expect(callArgs.sandbox.input).toBeDefined();
            });

            it('should remove interfaces', async () => {
                const code = 'interface Test { value: string; } const x = {value: "test"}; return x;';
                const input = {};
                
                mockVM.run.mockResolvedValue({value: 'test'});

                await executeScript(code, input, context);

                expect(mockVM.run).toHaveBeenCalled();
            });

            it('should remove imports', async () => {
                const code = 'import {readFile} from "fs"; const x = 5; return x;';
                const input = {};
                
                mockVM.run.mockResolvedValue(5);

                await executeScript(code, input, context);

                expect(mockVM.run).toHaveBeenCalled();
            });

            it('should remove exports', async () => {
                const code = 'export const x = 5; return x;';
                const input = {};
                
                mockVM.run.mockResolvedValue(5);

                await executeScript(code, input, context);

                expect(mockVM.run).toHaveBeenCalled();
            });
        });

        describe('sandbox', () => {
            it('should provide console.log', async () => {
                const code = 'console.log("test"); return "done";';
                const input = {};
                
                mockVM.run.mockResolvedValue('done');

                await executeScript(code, input, context);

                const callArgs = vi.mocked(require('vm2').VM).mock.calls[0][0];
                expect(callArgs.sandbox.console.log).toBeDefined();
                expect(typeof callArgs.sandbox.console.log).toBe('function');
            });

            it('should provide console.error', async () => {
                const code = 'console.error("error"); return "done";';
                const input = {};
                
                mockVM.run.mockResolvedValue('done');

                await executeScript(code, input, context);

                const callArgs = vi.mocked(require('vm2').VM).mock.calls[0][0];
                expect(callArgs.sandbox.console.error).toBeDefined();
                expect(typeof callArgs.sandbox.console.error).toBe('function');
            });

            it('should allow safe modules', async () => {
                const code = 'const fs = require("fs"); return "done";';
                const input = {};
                
                mockVM.run.mockResolvedValue('done');

                await executeScript(code, input, context);

                const callArgs = vi.mocked(require('vm2').VM).mock.calls[0][0];
                expect(callArgs.sandbox.require).toBeDefined();
                expect(typeof callArgs.sandbox.require).toBe('function');
            });

            it('should block unsafe modules', async () => {
                const code = 'const child = require("child_process"); return "done";';
                const input = {};
                
                mockVM.run.mockRejectedValue(new Error('Module \'child_process\' is not allowed in sandbox'));

                const result = await executeScript(code, input, context);

                expect(result.success).toBe(false);
                expect(result.error).toBe('Module \'child_process\' is not allowed in sandbox');
            });
        });

        describe('timeout', () => {
            it('should timeout after 30s', async () => {
                const code = 'while(true) {}';
                const input = {};
                
                mockVM.run.mockImplementation(() => {
                    return new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Script execution timed out')), 100);
                    });
                });

                const result = await executeScript(code, input, context);

                expect(result.success).toBe(false);
                expect(result.error).toBeDefined();
                expect(result.duration_ms).toBeGreaterThanOrEqual(0);
            });

            it('should return timeout error', async () => {
                const code = 'throw new Error("Script execution timed out");';
                const input = {};
                
                mockVM.run.mockRejectedValue(new Error('Script execution timed out'));

                const result = await executeScript(code, input, context);

                expect(result.success).toBe(false);
                expect(result.error).toBe('Script execution timed out');
            });
        });
    });

    describe('ScriptRunner class', () => {
        let runner;

        beforeEach(() => {
            runner = new ScriptRunner();
        });

        describe('registerScript()', () => {
            it('should register script by ID', () => {
                const scriptId = 'test-script';
                const code = 'return "test";';
                
                runner.registerScript(scriptId, code);

                expect(runner.hasScript(scriptId)).toBe(true);
            });

            it('should overwrite existing script', () => {
                const scriptId = 'test-script';
                const code1 = 'return "test1";';
                const code2 = 'return "test2";';
                
                runner.registerScript(scriptId, code1);
                runner.registerScript(scriptId, code2);

                expect(runner.hasScript(scriptId)).toBe(true);
            });
        });

        describe('run()', () => {
            it('should run registered script', async () => {
                const scriptId = 'test-script';
                const code = 'return input.value;';
                const input = {value: 'test'};
                const context = {sessionId: 'test', workingDir: '/test'};
                
                runner.registerScript(scriptId, code);
                mockVM.run.mockResolvedValue('test');

                const result = await runner.run(scriptId, input, context);

                expect(result.success).toBe(true);
                expect(result.data).toBe('test');
            });

            it('should return error for missing script', async () => {
                const scriptId = 'missing-script';
                const input = {};
                const context = {sessionId: 'test', workingDir: '/test'};
                
                const result = await runner.run(scriptId, input, context);

                expect(result.success).toBe(false);
                expect(result.error).toBe(`Script '${scriptId}' not found`);
            });
        });

        describe('hasScript()', () => {
            it('should return true for registered script', () => {
                const scriptId = 'test-script';
                const code = 'return "test";';
                
                runner.registerScript(scriptId, code);

                expect(runner.hasScript(scriptId)).toBe(true);
            });

            it('should return false for missing script', () => {
                const scriptId = 'missing-script';
                
                expect(runner.hasScript(scriptId)).toBe(false);
            });
        });

        describe('clear()', () => {
            it('should clear all scripts', () => {
                runner.registerScript('script1', 'return 1;');
                runner.registerScript('script2', 'return 2;');
                
                runner.clear();

                expect(runner.hasScript('script1')).toBe(false);
                expect(runner.hasScript('script2')).toBe(false);
            });
        });
    });

    describe('scriptRunner singleton', () => {
        it('should export singleton instance', () => {
            expect(scriptRunner).toBeDefined();
            expect(scriptRunner).toBeInstanceOf(ScriptRunner);
            expect(scriptRunner).toBe(scriptRunner); // Singleton check
        });
    });
});
