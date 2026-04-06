import {describe, expect, it} from 'vitest';
import {buildWebExecute} from '../../shared/web-execute-dto.mjs';

/** Web DTO must not forward arbitrary extra execute keys (single action-key contract for tools). */
describe('human-review: buildWebExecute', () => {
  it('strips unknown tool keys alongside known internal projections', () => {
    const out = buildWebExecute({
      'read-file': {path: 'a.ts'},
      'custom-vendor-tool': {payload: 'secret'},
    });
    expect(out).not.toHaveProperty('custom-vendor-tool');
  });
});
