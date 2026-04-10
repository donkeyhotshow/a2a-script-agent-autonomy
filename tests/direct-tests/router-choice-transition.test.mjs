import { describe, expect, it } from 'vitest';
import {
  A2A_SERVER_URL,
  isRouterForm,
  pingA2AServerHealth,
  scriptedRouterChoiceNoStickyRouter,
  validateServerInvokeRequest,
} from './router-choice-transition-lib.mjs';

const serverLive = await pingA2AServerHealth();

describe('server invoke schema (router flows)', () => {
  it('allows first-request { task } only', () => {
    expect(validateServerInvokeRequest({ task: 'hello' })).toBe(true);
  });

  it('rejects unknown root property sync (async-only API)', () => {
    expect(validateServerInvokeRequest({ task: 'hello', sync: true })).toBe(false);
  });

  it('allows follow-up { context: { task, execution }, result }', () => {
    expect(
      validateServerInvokeRequest({
        context: {
          session_id: 'srv_sess_x',
          task: 'hello',
          execution: { action: 'task', step: 'router' },
        },
        result: { choice: 'dialog' },
      })
    ).toBe(true);
  });
});

describe.skipIf(!serverLive)(`router sticky check (live server ${A2A_SERVER_URL})`, () => {
  it(
    'scripted router choice does not re-emit router form',
    async () => {
      await scriptedRouterChoiceNoStickyRouter();
    },
    0
  );
});

describe('router helpers', () => {
  it('isRouterForm detects choices', () => {
    expect(isRouterForm({ form: { choices: [{ id: 'dialog' }] } })).toBe(true);
    expect(isRouterForm({ form: {} })).toBe(false);
  });
});
