'use strict';

/**
 * Unit tests for command-executor-wrapper.cjs
 * Tests the CommandExecutor wrapper functionality
 */

const { CommandExecutor } = require('../src/command-executor-wrapper.cjs');
const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('CommandExecutor', () => {
    
    describe('constructor', () => {
        
        it('should create instance with default logger', () => {
            const executor = new CommandExecutor();
            assert.ok(executor);
            assert.ok(executor.logger);
        });
        
        it('should accept custom logger', () => {
            const customLogger = { info: () => {}, error: () => {} };
            const executor = new CommandExecutor(customLogger);
            assert.strictEqual(executor.logger, customLogger);
        });
        
        it('should accept custom errorHandler', () => {
            const customHandler = { handleError: () => {} };
            const executor = new CommandExecutor(null, customHandler);
            assert.strictEqual(executor.errorHandler, customHandler);
        });
    });
    
    describe('runCommand', () => {
        
        it('should have runCommand method', () => {
            const executor = new CommandExecutor();
            assert.ok(typeof executor.runCommand === 'function');
        });
        
        it('should have execute method', () => {
            const executor = new CommandExecutor();
            assert.ok(typeof executor.execute === 'function');
        });
    });
});
