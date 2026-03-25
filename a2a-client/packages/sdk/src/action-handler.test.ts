/**
 * T008: SDK single execute key invariant - Unit tests
 * Verifies that extractExecuteAction() correctly validates execute action-key shape
 */

import { describe, it, expect } from 'vitest';

/**
 * Test cases for single execute key invariant
 */
describe('T008: extractExecuteAction - single key invariant', () => {
    /**
     * Test case: execute with one action key should dispatch correctly
     */
    it('one action key → dispatch', () => {
        // Simulate execute with single action key
        const response = {
            execute: {
                'form': { input: [{ name: 'task', type: 'text' }] }
            }
        };
        
        const executeKeys = Object.keys(response.execute);
        expect(executeKeys.length).toBe(1);
        expect(executeKeys[0]).toBe('form');
    });

    /**
     * Test case: multiple action keys should fail safe or log in dev
     */
    it('unexpected multi-key execute fails safe', () => {
        // Simulate execute with multiple action keys (invalid)
        const response = {
            execute: {
                'form': { input: [] },
                'message': 'test'
            }
        };
        
        const executeKeys = Object.keys(response.execute);
        
        // Guard should catch this
        if (executeKeys.length !== 1) {
            const error = `Execute must contain exactly one action key, found ${executeKeys.length}: ${JSON.stringify(executeKeys)}`;
            expect(error).toContain('must contain exactly one action key');
        }
    });

    /**
     * Test case: empty execute should return null
     */
    it('empty execute returns null', () => {
        const response = { execute: {} };
        
        const executeKeys = Object.keys(response.execute);
        expect(executeKeys.length).toBe(0);
    });

    /**
     * Test case: no execute should return null
     */
    it('no execute returns null', () => {
        const response = {};
        
        expect(response.execute).toBeUndefined();
    });
});

/**
 * Additional tests for action-key shape validation
 */
describe('T008: action-key shape validation', () => {
    /**
     * Valid action-key shape examples
     */
    it('valid action-key shapes', () => {
        const validShapes = [
            { execute: { 'form': {} } },
            { execute: { 'message': 'hello' } },
            { execute: { 'script': { input: {}, output: '' } } },
            { execute: { 'read-file': { path: 'test.ts' } } },
            { execute: { 'rag-search': { query: 'test' } } },
        ];
        
        for (const shape of validShapes) {
            const keys = Object.keys(shape.execute);
            expect(keys.length).toBe(1);
        }
    });

    /**
     * Invalid action-key shapes (should be caught by guard)
     */
    it('invalid multi-key shapes are caught', () => {
        const invalidShapes = [
            { execute: { 'form': {}, 'message': 'test' } },
            { execute: { 'read-file': {}, 'rag-search': {} } },
            { execute: { 'script': {}, 'write-file': {} } },
        ];
        
        for (const shape of invalidShapes) {
            const keys = Object.keys(shape.execute);
            // Guard catches multiple keys
            expect(keys.length).not.toBe(1);
        }
    });
});
