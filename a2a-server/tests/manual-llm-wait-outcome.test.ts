import {describe, it, expect, afterEach} from 'vitest';
import {
    isManualLlmModeEnabled,
    storePendingManualLlm,
    getPendingManualLlm,
    removePendingManualLlm,
} from '../src/services/core/request/manual-llm.service.js';

describe('manual-llm.service', () => {
    const orig = process.env.A2A_MANUAL_LLM_MODE;

    afterEach(() => {
        if (orig === undefined) delete process.env.A2A_MANUAL_LLM_MODE;
        else process.env.A2A_MANUAL_LLM_MODE = orig;
        removePendingManualLlm('test-pid');
    });

    it('isManualLlmModeEnabled reads env', () => {
        delete process.env.A2A_MANUAL_LLM_MODE;
        expect(isManualLlmModeEnabled()).toBe(false);
        process.env.A2A_MANUAL_LLM_MODE = '1';
        expect(isManualLlmModeEnabled()).toBe(true);
    });

    it('store and get pending', () => {
        storePendingManualLlm({
            promiseId: 'test-pid',
            messages: [{role: 'user', content: 'hi'}],
            schemaName: 'dialog/1',
            ctxSnapshot: {},
            outputDir: '/tmp',
            createdAt: new Date(),
        });
        expect(getPendingManualLlm('test-pid')?.schemaName).toBe('dialog/1');
        expect(removePendingManualLlm('test-pid')).toBe(true);
        expect(getPendingManualLlm('test-pid')).toBeUndefined();
    });
});
