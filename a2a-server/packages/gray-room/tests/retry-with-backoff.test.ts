/**
 * Tests for retry.ts: retryWithBackoff, calculateDelay (deterministic jitter off).
 */

import {afterEach, describe, expect, it, vi} from 'vitest';
import {
    calculateDelay,
    calculateDelaySequence,
    retryWithBackoff,
} from '../../src/utils/retry.js';

const noJitter = {
    jitter: false,
    initialDelay: 10,
    multiplier: 2,
    maxDelay: 1000,
    maxRetries: 5,
    jitterFactor: 0,
};

describe('calculateDelay', () => {
    it('exponential growth capped by maxDelay when jitter off', () => {
        expect(calculateDelay(0, noJitter)).toBe(10);
        expect(calculateDelay(1, noJitter)).toBe(20);
        expect(calculateDelay(2, noJitter)).toBe(40);
    });

    it('respects maxDelay', () => {
        expect(
            calculateDelay(99, {...noJitter, initialDelay: 1e9, multiplier: 2, maxDelay: 50})
        ).toBe(50);
    });

    it('calculateDelaySequence length equals maxRetries', () => {
        const seq = calculateDelaySequence({...noJitter, maxRetries: 3});
        expect(seq).toHaveLength(3);
        expect(seq[0]).toBe(10);
    });
});

describe('retryWithBackoff', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('retryIf false throws immediately without retry', async () => {
        let calls = 0;
        await expect(
            retryWithBackoff({
                fn: async () => {
                    calls++;
                    throw new Error('no-retry');
                },
                retryIf: () => false,
                backoff: {...noJitter, maxRetries: 5},
            })
        ).rejects.toThrow('no-retry');
        expect(calls).toBe(1);
    });

    it('retries then succeeds', async () => {
        vi.useFakeTimers();
        let calls = 0;
        const p = retryWithBackoff({
            fn: async () => {
                calls++;
                if (calls < 2) throw new Error('transient');
                return 7;
            },
            backoff: {...noJitter, initialDelay: 5, maxRetries: 5},
        });
        await vi.advanceTimersByTimeAsync(100);
        await expect(p).resolves.toBe(7);
        expect(calls).toBe(2);
    });

    it('invokes onFailure on final failure', async () => {
        vi.useFakeTimers();
        const onFailure = vi.fn();
        const p = retryWithBackoff({
            fn: async () => {
                throw new Error('always');
            },
            onFailure,
            backoff: {...noJitter, initialDelay: 1, maxRetries: 2},
        });
        const rejected = expect(p).rejects.toThrow('always');
        await vi.runAllTimersAsync();
        await rejected;
        expect(onFailure).toHaveBeenCalledTimes(1);
        const [attempt, err] = onFailure.mock.calls[0];
        expect(attempt).toBeGreaterThan(0);
        expect(err).toMatchObject({message: 'always'});
    });

    it('wraps non-Error throw as Error', async () => {
        vi.useFakeTimers();
        const p = retryWithBackoff({
            fn: async () => {
                throw 'string-throw';
            },
            backoff: {...noJitter, initialDelay: 1, maxRetries: 1},
        });
        const rejected = expect(p).rejects.toThrow('string-throw');
        await vi.runAllTimersAsync();
        await rejected;
    });

    it('calls onAttempt between retries', async () => {
        vi.useFakeTimers();
        let calls = 0;
        const onAttempt = vi.fn();
        const p = retryWithBackoff({
            fn: async () => {
                calls++;
                if (calls < 2) throw new Error('x');
                return 1;
            },
            onAttempt,
            backoff: {...noJitter, initialDelay: 3, maxRetries: 3},
        });
        await vi.advanceTimersByTimeAsync(500);
        await p;
        expect(onAttempt).toHaveBeenCalled();
        expect(onAttempt.mock.calls[0][0]).toBe(1);
        expect(typeof onAttempt.mock.calls[0][1]).toBe('number');
    });
});
