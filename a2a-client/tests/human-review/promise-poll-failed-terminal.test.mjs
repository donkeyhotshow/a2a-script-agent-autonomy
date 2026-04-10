import {describe, expect, it} from 'vitest';
import {normalizePromisePollStatus} from '../../shared/client-api-envelope.mjs';

/**
 * Failed + no future retry should be terminal (not left “pending” by status fallback).
 */
describe('human-review: normalizePromisePollStatus', () => {
  it('marks explicit failed as terminal when retryAfter is absent', () => {
    const n = normalizePromisePollStatus({status: 'failed'});
    expect(n.failed).toBe(true);
    expect(n.asyncPending).toBe(false);
    expect(n.status).toBe('failed');
  });
});
