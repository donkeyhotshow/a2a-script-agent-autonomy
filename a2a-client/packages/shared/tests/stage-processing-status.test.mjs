import {describe, expect, it} from 'vitest';
import {deriveSessionStage} from '../../packages/vite-plugin/routes/utils/session-stage-machine.js';

/**
 * Sessions often use status=processing while the hub works; UI should not treat that as a free-text dialog beat.
 */
describe('human-review: session stage vs async status', () => {
  it('maps status processing to awaiting-async when async is still logically in flight', () => {
    expect(
      deriveSessionStage({
        execute: null,
        context: null,
        asyncPending: false,
        status: 'processing',
      })
    ).toBe('awaiting-async');
  });
});
