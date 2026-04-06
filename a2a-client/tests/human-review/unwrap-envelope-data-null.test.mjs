import {describe, expect, it} from 'vitest';
import {unwrapEnvelope} from '../../shared/client-api-envelope.mjs';

/** `data: null` should not hide a valid `session` sibling (common partial JSON / cleared slot). */
describe('human-review: unwrapEnvelope', () => {
  it('uses session when data is null', () => {
    const inner = unwrapEnvelope({
      success: true,
      data: null,
      session: {id: 'sess_fallback', status: 'active'},
    });
    expect(inner?.id).toBe('sess_fallback');
  });
});
