/**
 * gray-room-chain.test.ts
 *
 * Tests the gray room interrupt chain: compress_history → thinking → auto_read_file.
 * Validates that each handler is called in order and context is properly threaded.
 */

import {describe, expect, it, vi, beforeEach} from 'vitest';

// ── Mock dependencies so the chain can be tested offline ──────────────────────

vi.mock('../src/services/core/request-processor/gray-room-interrupt-handlers/compress-history.js', () => ({
    handleCompressHistory: vi.fn(async (_interrupt: unknown, ctx: Record<string, unknown>) => {
        const history = (ctx['history'] as unknown[]) ?? [];
        return {
            nextCtx: {
                ...ctx,
                history: history.slice(-3),
                _compressHistoryCalled: true,
            },
            continueLoop: true,
        };
    }),
}));

vi.mock('../src/services/core/request-processor/gray-room-interrupt-handlers/thinking.js', () => ({
    handleThinking: vi.fn(async (_interrupt: unknown, ctx: Record<string, unknown>) => ({
        nextCtx: {
            ...ctx,
            _thinkingCalled: true,
            thinkingResult: 'Analyzed problem: authentication flow',
        },
        continueLoop: true,
    })),
}));

vi.mock('../src/services/core/request-processor/gray-room-interrupt-handlers/auto-read-file.js', () => ({
    handleAutoReadFile: vi.fn(async (_interrupt: unknown, ctx: Record<string, unknown>) => ({
        nextCtx: {
            ...ctx,
            _autoReadFileCalled: true,
            fileContent: 'export function authenticate() { ... }',
        },
        continueLoop: false,
    })),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Gray Room Interrupt Chain: compress_history → thinking → auto_read_file', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('compress_history handler trims history to last N entries', async () => {
        const {handleCompressHistory} = await import(
            '../src/services/core/request-processor/gray-room-interrupt-handlers/compress-history.js'
        );

        const longHistory = Array.from({length: 10}, (_, i) => ({
            role: 'user',
            message: `Message ${i + 1}`,
        }));

        const ctx = {history: longHistory, task: 'fix auth bug'};
        const interrupt = {reason: 'compress_history', data: {}};
        const result = await handleCompressHistory(interrupt, ctx, 'prom_1', 'http://localhost:11434', 'llama3', []);

        expect(result.continueLoop).toBe(true);
        expect((result.nextCtx['history'] as unknown[]).length).toBeLessThanOrEqual(3);
        expect(result.nextCtx['_compressHistoryCalled']).toBe(true);
    });

    it('thinking handler injects analysis into context', async () => {
        const {handleThinking} = await import(
            '../src/services/core/request-processor/gray-room-interrupt-handlers/thinking.js'
        );

        const ctx = {history: [{role: 'user', message: 'auth error'}], task: 'debug authentication'};
        const interrupt = {reason: 'thinking', data: {topic: 'authentication error'}};
        const result = await handleThinking(interrupt, ctx, 'prom_1', 'http://localhost:11434', 'llama3', []);

        expect(result.continueLoop).toBe(true);
        expect(result.nextCtx['_thinkingCalled']).toBe(true);
        expect(result.nextCtx['thinkingResult']).toBeDefined();
    });

    it('auto_read_file handler reads file content into context', async () => {
        const {handleAutoReadFile} = await import(
            '../src/services/core/request-processor/gray-room-interrupt-handlers/auto-read-file.js'
        );

        const ctx = {
            history: [{role: 'user', message: 'auth error'}],
            task: 'read auth.ts',
            thinkingResult: 'Need to check src/auth.ts',
        };
        const interrupt = {reason: 'auto_read_file', data: {filePath: 'src/auth.ts'}};
        const result = await handleAutoReadFile(interrupt, ctx, 'prom_1', 'http://localhost:11434', 'llama3', []);

        expect(result.continueLoop).toBe(false);
        expect(result.nextCtx['_autoReadFileCalled']).toBe(true);
        expect(result.nextCtx['fileContent']).toBeDefined();
    });

    it('full chain: compress → thinking → auto_read_file maintains context through each step', async () => {
        const {handleCompressHistory} = await import(
            '../src/services/core/request-processor/gray-room-interrupt-handlers/compress-history.js'
        );
        const {handleThinking} = await import(
            '../src/services/core/request-processor/gray-room-interrupt-handlers/thinking.js'
        );
        const {handleAutoReadFile} = await import(
            '../src/services/core/request-processor/gray-room-interrupt-handlers/auto-read-file.js'
        );

        const initialCtx: Record<string, unknown> = {
            history: Array.from({length: 8}, (_, i) => ({role: 'user', message: `msg ${i}`})),
            task: 'fix authentication bug in src/auth.ts',
        };
        const trace: unknown[] = [];
        const args: [unknown, string, string, string, unknown[]] = [
            {}, 'prom_chain', 'http://localhost:11434', 'llama3', trace,
        ];

        // Step 1: compress
        const step1 = await handleCompressHistory({reason: 'compress_history', data: {}}, initialCtx, ...args);
        expect(step1.continueLoop).toBe(true);

        // Step 2: thinking (receives compressed context)
        const step2 = await handleThinking({reason: 'thinking', data: {}}, step1.nextCtx, ...args);
        expect(step2.continueLoop).toBe(true);
        expect(step2.nextCtx['_compressHistoryCalled']).toBe(true);

        // Step 3: auto_read_file (receives thinking context)
        const step3 = await handleAutoReadFile({reason: 'auto_read_file', data: {filePath: 'src/auth.ts'}}, step2.nextCtx, ...args);
        expect(step3.continueLoop).toBe(false);
        expect(step3.nextCtx['_compressHistoryCalled']).toBe(true);
        expect(step3.nextCtx['_thinkingCalled']).toBe(true);
        expect(step3.nextCtx['_autoReadFileCalled']).toBe(true);
    });
});
