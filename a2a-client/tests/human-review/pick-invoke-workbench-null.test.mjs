import {describe, expect, it} from 'vitest';
import {pickInvokeContextPatch} from '../../shared/context-invoke-patch.mjs';

/** Null workbench from upstream should mean “no patch”, not explicit null overwrite of local state. */
describe('human-review: pickInvokeContextPatch', () => {
  it('omits workbench when source workbench is null', () => {
    const p = pickInvokeContextPatch({task: 't', workbench: null});
    expect(p).not.toHaveProperty('workbench');
  });
});
