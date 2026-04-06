import {describe, expect, it, vi} from 'vitest';

vi.mock('../../src/utils/logger.js', () => ({
    logger: {info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn()},
}));

import {
    processBatchWithBackoff,
    resetGlobalMetrics,
    recordRetryAttempt,
    getGlobalRetryMetrics,
} from '../../src/utils/backoff.js';

describe('processBatchWithBackoff', () => {
    it('processes items in batches and returns flat results', async () => {
        const out = await processBatchWithBackoff({
            items: [1, 2, 3],
            processor: async (n) => n * 10,
            batchSize: 2,
            concurrency: 1,
        });
        expect(out.sort((a, b) => a - b)).toEqual([10, 20, 30]);
    });

    it('invokes onBatchError and rethrows when processor fails', async () => {
        const onBatchError = vi.fn();
        await expect(
            processBatchWithBackoff({
                items: [1],
                processor: async () => {
                    throw new Error('boom');
                },
                batchSize: 1,
                concurrency: 1,
                onBatchError,
                backoff: {maxRetries: 0, jitter: false, initialDelay: 1},
            })
        ).rejects.toThrow('boom');
        expect(onBatchError).toHaveBeenCalledTimes(1);
    });
});

describe('global retry metrics', () => {
    it('recordRetryAttempt updates getGlobalRetryMetrics', () => {
        resetGlobalMetrics();
        recordRetryAttempt(true, 100);
        recordRetryAttempt(false, 200);
        const m = getGlobalRetryMetrics();
        expect(m.totalAttempts).toBe(2);
        expect(m.successfulRetries).toBe(1);
        expect(m.failedRetries).toBe(1);
        resetGlobalMetrics();
        expect(getGlobalRetryMetrics().totalAttempts).toBe(0);
    });
});
