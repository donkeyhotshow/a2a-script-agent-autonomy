'use strict';

/**
 * Unit tests for terminal-handler-core.cjs
 * Tests the core functions that don't depend on external @libs
 */

const {
    resolvePathCore,
    analyzeDirectoryChangeCore,
    shouldPersistHistoryCore,
    checkHistoryLimitCore
} = require('../src/terminal-handler-core.cjs');

const {describe, it} = require('node:test');
const assert = require('node:assert');

// Mock getCurrentDirSync for tests
function mockGetCurrentDirSync() {
    return 'C:\\Users\\test\\project';
}

describe('terminal-handler-core', () => {

    describe('resolvePathCore', () => {

        it('should return absolute path as-is', () => {
            const result = resolvePathCore('C:\\Users\\test', null, mockGetCurrentDirSync);
            assert.strictEqual(result, 'C:\\Users\\test');
        });

        it('should resolve relative path against current cwd', () => {
            const result = resolvePathCore('./src', 'C:\\Users\\test\\project', mockGetCurrentDirSync);
            assert.strictEqual(result, 'C:\\Users\\test\\project\\src');
        });

        it('should resolve .. to parent directory', () => {
            const result = resolvePathCore('..', 'C:\\Users\\test\\project', mockGetCurrentDirSync);
            assert.strictEqual(result, 'C:\\Users\\test');
        });

        it('should resolve . to current directory', () => {
            const result = resolvePathCore('.', 'C:\\Users\\test\\project', mockGetCurrentDirSync);
            assert.strictEqual(result, 'C:\\Users\\test\\project');
        });

        it('should resolve ~ to user home directory', () => {
            const result = resolvePathCore('~', 'C:\\Users\\test\\project', mockGetCurrentDirSync);
            // Should use USERPROFILE or HOME environment variable
            assert.ok(result.includes('Users') || result.includes('home'));
        });

        it('should resolve ~/path correctly', () => {
            const result = resolvePathCore('~/documents', 'C:\\Users\\test\\project', mockGetCurrentDirSync);
            assert.ok(result.includes('documents'));
        });

        it('should use default cwd when null', () => {
            const result = resolvePathCore('./test', null, mockGetCurrentDirSync);
            assert.strictEqual(result, 'C:\\Users\\test\\project\\test');
        });
    });

    describe('analyzeDirectoryChangeCore', () => {

        it('should return null for non-directory commands', () => {
            const result = analyzeDirectoryChangeCore(
                'echo hello',
                'C:\\Users\\test',
                (p, c) => p,
                () => [],
                () => {
                },
                mockGetCurrentDirSync
            );
            assert.strictEqual(result, null);
        });

        it('should detect cd command', () => {
            const result = analyzeDirectoryChangeCore(
                'cd C:\\newdir',
                'C:\\Users\\test',
                (p, c) => p,
                () => [],
                () => {
                },
                mockGetCurrentDirSync
            );
            assert.strictEqual(result, 'C:\\newdir');
        });

        it('should detect PowerShell Set-Location command', () => {
            const result = analyzeDirectoryChangeCore(
                'Set-Location C:\\newdir',
                'C:\\Users\\test',
                (p, c) => p,
                () => [],
                () => {
                },
                mockGetCurrentDirSync
            );
            assert.strictEqual(result, 'C:\\newdir');
        });

        it('should detect cd with quoted path', () => {
            const result = analyzeDirectoryChangeCore(
                'cd "C:\\my docs"',
                'C:\\Users\\test',
                (p, c) => p.replace(/"/g, ''),
                () => [],
                () => {
                },
                mockGetCurrentDirSync
            );
            assert.strictEqual(result, 'C:\\my docs');
        });

        it('should handle cd with semicolon', () => {
            const result = analyzeDirectoryChangeCore(
                'cd C:\\newdir; ls',
                'C:\\Users\\test',
                (p, c) => p,
                () => [],
                () => {
                },
                mockGetCurrentDirSync
            );
            assert.strictEqual(result, 'C:\\newdir');
        });

        it('should handle pushd command', () => {
            let stack = [];
            const result = analyzeDirectoryChangeCore(
                'pushd C:\\newdir',
                'C:\\Users\\test',
                (p, c) => p,
                () => stack,
                (s) => {
                    stack = s;
                },
                mockGetCurrentDirSync
            );
            assert.strictEqual(result, 'C:\\newdir');
            assert.strictEqual(stack.length, 1);
            assert.strictEqual(stack[0], 'C:\\Users\\test');
        });

        it('should handle popd command', () => {
            let stack = ['C:\\Users\\test'];
            const result = analyzeDirectoryChangeCore(
                'popd',
                'C:\\Users\\test\\project',
                (p, c) => p,
                () => stack,
                (s) => {
                    stack = s;
                },
                mockGetCurrentDirSync
            );
            assert.strictEqual(result, 'C:\\Users\\test');
            assert.strictEqual(stack.length, 0);
        });

        it('should return null for popd with empty stack', () => {
            let stack = [];
            const result = analyzeDirectoryChangeCore(
                'popd',
                'C:\\Users\\test\\project',
                (p, c) => p,
                () => stack,
                (s) => {
                    stack = s;
                },
                mockGetCurrentDirSync
            );
            assert.strictEqual(result, null);
        });
    });

    describe('shouldPersistHistoryCore', () => {

        it('should return true by default', () => {
            const result = shouldPersistHistoryCore(undefined, null, 'C:\\test');
            assert.strictEqual(result, true);
        });

        it('should return false when history is disabled', () => {
            const config = {history: {enabled: false}};
            const result = shouldPersistHistoryCore(config, 'C:\\initial', 'C:\\test');
            assert.strictEqual(result, false);
        });

        it('should return false when restrictToInitialCwd is true and cwd changed', () => {
            const config = {history: {restrictToInitialCwd: true}};
            const result = shouldPersistHistoryCore(config, 'C:\\initial', 'C:\\changed');
            assert.strictEqual(result, false);
        });

        it('should return true when restrictToInitialCwd is true but cwd not changed', () => {
            const config = {history: {restrictToInitialCwd: true}};
            const result = shouldPersistHistoryCore(config, 'C:\\initial', 'C:\\initial');
            assert.strictEqual(result, true);
        });
    });

    describe('checkHistoryLimitCore', () => {

        it('should return true when under default limit (1000)', () => {
            const result = checkHistoryLimitCore(undefined, 500);
            assert.strictEqual(result, true);
        });

        it('should return false when at limit', () => {
            const result = checkHistoryLimitCore(undefined, 1000);
            assert.strictEqual(result, false);
        });

        it('should return false when over limit', () => {
            const result = checkHistoryLimitCore(undefined, 1500);
            assert.strictEqual(result, false);
        });

        it('should respect custom maxItems', () => {
            const config = {history: {maxItems: 100}};
            const result = checkHistoryLimitCore(config, 50);
            assert.strictEqual(result, true);

            const resultAtLimit = checkHistoryLimitCore(config, 100);
            assert.strictEqual(resultAtLimit, false);
        });
    });
});
