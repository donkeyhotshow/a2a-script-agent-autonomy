/**
 * Retry/backoff utilities tests
 */

import { describe, it, expect } from 'vitest';
import { sleep, backoffDelay, withRetry } from '../../src/utils/retry.utils.js';

describe('retry.utils', () => {
  describe('backoffDelay', () => {
    it('returns delayMs for attempt 0', () => {
      expect(backoffDelay(0, 100, 2)).toBe(100);
    });
    it('applies exponential backoff', () => {
      expect(backoffDelay(1, 100, 2)).toBe(200);
      expect(backoffDelay(2, 100, 2)).toBe(400);
    });
    it('backoff 1 gives fixed delay', () => {
      expect(backoffDelay(0, 50, 1)).toBe(50);
      expect(backoffDelay(1, 50, 1)).toBe(50);
    });
  });

  describe('sleep', () => {
    it('resolves after delay', async () => {
      const start = Date.now();
      await sleep(10);
      expect(Date.now() - start).toBeGreaterThanOrEqual(8);
    });
  });

  describe('withRetry', () => {
    it('returns result on first success', async () => {
      const result = await withRetry(async () => 42);
      expect(result).toBe(42);
    });
    it('retries and succeeds on second attempt', async () => {
      let attempts = 0;
      const result = await withRetry(async () => {
        attempts++;
        if (attempts < 2) throw new Error('fail');
        return 'ok';
      }, { maxAttempts: 3, delayMs: 5 });
      expect(result).toBe('ok');
      expect(attempts).toBe(2);
    });
    it('throws after maxAttempts exhausted', async () => {
      let attempts = 0;
      await expect(
        withRetry(async () => {
          attempts++;
          throw new Error('always fail');
        }, { maxAttempts: 3, delayMs: 5 })
      ).rejects.toThrow('always fail');
      expect(attempts).toBe(3);
    });
    it('respects shouldRetry', async () => {
      let attempts = 0;
      await expect(
        withRetry(
          async () => {
            attempts++;
            throw new Error('do not retry');
          },
          { maxAttempts: 3, delayMs: 5, shouldRetry: () => false }
        )
      ).rejects.toThrow('do not retry');
      expect(attempts).toBe(1);
    });
  });
});
