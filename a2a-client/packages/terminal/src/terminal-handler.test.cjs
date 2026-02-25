'use strict';

/**
 * Unit tests for terminal-handler.cjs
 * Tests the TerminalHandler class basic functionality
 */

const { TerminalHandler } = require('./terminal-handler.cjs');
const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('TerminalHandler', () => {
    
    describe('constructor', () => {
        
        it('should create instance with default config', () => {
            const handler = new TerminalHandler();
            assert.ok(handler);
            assert.ok(handler.config);
        });
        
        it('should accept custom config', () => {
            const customConfig = { timeout: 60 };
            const handler = new TerminalHandler(customConfig);
            assert.strictEqual(handler.config.timeout, 60);
        });
    });
    
    describe('getPrompt', () => {
        
        it('should return default prompt', () => {
            const handler = new TerminalHandler();
            const prompt = handler.getPrompt();
            assert.ok(typeof prompt === 'string');
        });
    });
    
    describe('terminalHelp', () => {
        
        it('should return help string', () => {
            const handler = new TerminalHandler();
            const help = handler.terminalHelp();
            assert.ok(typeof help === 'string');
            assert.ok(help.length > 0);
            assert.ok(help.includes('terminal'));
        });
    });
});
