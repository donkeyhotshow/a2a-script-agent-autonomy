import {describe, expect, it} from 'vitest';
import {parseA2aInvokeResponse} from '../../shared/client-api-envelope.mjs';

/**
 * Server-issued async id should win over any parallel client/transport field when both are present.
 */
describe('human-review: parseA2aInvokeResponse', () => {
  it('prefers data.promiseId over top-level promiseId when both are strings', () => {
    const p = parseA2aInvokeResponse({
      promiseId: 'client_transport_placeholder',
      data: {
        promiseId: 'prom_from_a2a_server',
        execute: {form: {title: 'x'}},
      },
    });
    expect(p.promiseId).toBe('prom_from_a2a_server');
  });
});
