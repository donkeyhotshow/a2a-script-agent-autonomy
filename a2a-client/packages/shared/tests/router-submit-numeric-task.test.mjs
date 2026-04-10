import {describe, expect, it} from 'vitest';
import {buildSubmitResult} from '../../shared/router-submit.mjs';

/** Shorthand `task` from JSON is often a string; numeric IDs should not become non-string `message`. */
describe('human-review: buildSubmitResult', () => {
  it('coerces numeric task to string message for validateClientResultPayload compatibility', () => {
    const r = buildSubmitResult({body: {task: 42}, hasChoices: false});
    expect(typeof r.message).toBe('string');
    expect(r.message).toBe('42');
  });
});
