import {describe, expect, it} from 'vitest';
import {toPublicNextResponse} from '../../packages/vite-plugin/routes/utils/session-projection-dto.js';

/**
 * Invariant: public /next payloads must never prefer a raw top-level execute over the
 * already-projected session.execute (tool keys would leak to the browser).
 */
describe('human-review: toPublicNextResponse wire safety', () => {
  it('does not surface raw tool execute when session carries a safe projected execute', () => {
    const out = toPublicNextResponse({
      success: true,
      execute: {'read-file': {path: '/etc/passwd'}},
      session: {
        id: 'sess_x',
        execute: {form: {title: 'Next', choices: [{id: 'a', label: 'A'}]}},
        context: {execution: {action: 'router', step: 'router'}},
      },
    });
    const keys = Object.keys(out.execute || {});
    expect(keys).not.toContain('read-file');
    expect(keys).toContain('form');
  });
});
