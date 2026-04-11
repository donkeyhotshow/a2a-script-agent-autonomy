import {afterEach, describe, expect, it, vi} from 'vitest';

vi.mock('../../src/utils/logger', () => ({
    logger: {info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn()},
}));

import {
    CircuitBreaker,
    CircuitBreakerOpenError,
    withCircuitBreaker,
} from '../../src/utils/circuit-breaker';

describe('CircuitBreaker', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('opens after failureThreshold and rejects execute while OPEN', async () => {
        vi.useFakeTimers({now: 1_000_000});
        const cb = new CircuitBreaker({
            failureThreshold: 2,
            resetTimeout: 60_000,
            successThreshold: 1,
        });
        await expect(
            cb.execute(async () => {
                throw new Error('a');
            })
        ).rejects.toThrow('a');
        await expect(
            cb.execute(async () => {
                throw new Error('b');
            })
        ).rejects.toThrow('b');
        expect(cb.getState()).toBe('OPEN');
        await expect(cb.execute(async () => 1)).rejects.toBeInstanceOf(
            CircuitBreakerOpenError
        );
    });

    it('HALF_OPEN then successThreshold successes closes circuit', async () => {
        vi.useFakeTimers({now: 5_000_000});
        const cb = new CircuitBreaker({
            failureThreshold: 1,
            resetTimeout: 100,
            successThreshold: 2,
        });
        await expect(
            cb.execute(async () => {
                throw new Error('fail');
            })
        ).rejects.toThrow('fail');
        expect(cb.getState()).toBe('OPEN');
        vi.setSystemTime(5_000_200);
        expect(cb.getState()).toBe('HALF_OPEN');
        await expect(cb.execute(async () => 1)).resolves.toBe(1);
        await expect(cb.execute(async () => 2)).resolves.toBe(2);
        expect(cb.getState()).toBe('CLOSED');
    });

    it('CLOSED success clears failure streak', async () => {
        const cb = new CircuitBreaker({
            failureThreshold: 3,
            resetTimeout: 60_000,
            successThreshold: 1,
        });
        await expect(
            cb.execute(async () => {
                throw new Error('x');
            })
        ).rejects.toThrow('x');
        await expect(cb.execute(async () => 'ok')).resolves.toBe('ok');
        await expect(
            cb.execute(async () => {
                throw new Error('y');
            })
        ).rejects.toThrow('y');
        expect(cb.getState()).toBe('CLOSED');
    });

    it('forceOpen and forceClose', async () => {
        const cb = new CircuitBreaker({
            failureThreshold: 99,
            resetTimeout: 60_000,
            successThreshold: 1,
        });
        cb.forceOpen();
        await expect(cb.execute(async () => 1)).rejects.toBeInstanceOf(
            CircuitBreakerOpenError
        );
        cb.forceClose();
        await expect(cb.execute(async () => 2)).resolves.toBe(2);
    });

    it('getMetrics returns copy', async () => {
        const cb = new CircuitBreaker({
            failureThreshold: 1,
            resetTimeout: 60_000,
            successThreshold: 1,
        });
        await cb.execute(async () => 1);
        const m = cb.getMetrics();
        expect(m.totalAttempts).toBeGreaterThanOrEqual(1);
        m.totalAttempts = 999;
        expect(cb.getMetrics().totalAttempts).not.toBe(999);
    });
});

describe('withCircuitBreaker', () => {
    it('wraps fn and shares breaker instance', async () => {
        const {execute, breaker} = withCircuitBreaker(
            async () => 2,
            {failureThreshold: 5, resetTimeout: 60_000, successThreshold: 1}
        );
        await expect(execute()).resolves.toBe(2);
        expect(breaker.getState()).toBe('CLOSED');
    });
});
