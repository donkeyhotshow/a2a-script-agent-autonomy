'use strict';

/**
 * Unit tests for terminal-handler.cjs
 * Tests the TerminalHandler class basic functionality
 */

const {TerminalHandler} = require('./terminal-handler.cjs');
const {describe, it} = require('node:test');
const assert = require('node:assert');

describe('TerminalHandler', () => {

    describe('constructor', () => {

        it('should create instance without server', () => {
            const handler = new TerminalHandler();
            assert.ok(handler);
            assert.ok(handler.server === undefined);
        });

        it('should accept server object', () => {
            const mockServer = { logger: console, errorHandler: null };
            const handler = new TerminalHandler(mockServer);
            assert.strictEqual(handler.server, mockServer);
        });

        it('should initialize session data', () => {
            const handler = new TerminalHandler();
            assert.ok(handler._sessionData);
            assert.ok(handler.SESSION_CWD_KEY);
            assert.ok(handler.SESSION_DIR_STACK_KEY);
        });
    });

    describe('session management', () => {

        it('should get and set session cwd', () => {
            const handler = new TerminalHandler();
            handler._setSessionCwd('/test/path');
            assert.strictEqual(handler._getSessionCwd(), '/test/path');
        });

        it('should manage directory stack', () => {
            const handler = new TerminalHandler();
            const stack = ['/dir1', '/dir2'];
            handler._setDirStack(stack);
            assert.deepStrictEqual(handler._getDirStack(), stack);
        });
    });
});
