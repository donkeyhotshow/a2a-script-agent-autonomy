import {describe, expect, it} from 'vitest';
import {
    AdaptivePolling,
    DEFAULT_ADAPTIVE_POLLING,
} from '../../src/utils/adaptive-polling.js';

describe('AdaptivePolling', () => {
    it('increases interval after emptyThreshold empty polls', () => {
        const p = new AdaptivePolling({
            minInterval: 100,
            maxInterval: 10_000,
            backoffFactor: 2,
            accelerationFactor: 0.5,
            emptyThreshold: 2,
        });
        expect(p.onPollResult(false)).toBe(100);
        expect(p.onPollResult(false)).toBe(200);
        expect(p.getCurrentInterval()).toBe(200);
    });

    it('caps interval at maxInterval', () => {
        const p = new AdaptivePolling({
            minInterval: 1000,
            maxInterval: 1500,
            backoffFactor: 10,
            accelerationFactor: 0.5,
            emptyThreshold: 1,
        });
        p.onPollResult(false);
        p.onPollResult(false);
        expect(p.getCurrentInterval()).toBe(1500);
    });

    it('hasData resets empty streak and floors at minInterval', () => {
        const p = new AdaptivePolling({
            minInterval: 100,
            maxInterval: 5000,
            backoffFactor: 2,
            accelerationFactor: 0.5,
            emptyThreshold: 1,
        });
        p.onPollResult(false);
        expect(p.getCurrentInterval()).toBe(200);
        p.onPollResult(true);
        expect(p.getCurrentInterval()).toBe(100);
    });

    it('reset restores minInterval and empty streak', () => {
        const p = new AdaptivePolling({
            ...DEFAULT_ADAPTIVE_POLLING,
            minInterval: 50,
            emptyThreshold: 2,
            backoffFactor: 2,
        });
        p.onPollResult(false);
        p.onPollResult(false);
        expect(p.getCurrentInterval()).toBe(100);
        p.reset();
        expect(p.getCurrentInterval()).toBe(50);
        expect(p.onPollResult(false)).toBe(50);
    });
});
