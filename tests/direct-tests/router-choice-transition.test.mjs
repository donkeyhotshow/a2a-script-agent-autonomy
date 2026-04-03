import { describe, expect, it } from 'vitest';
import {
  A2A_SERVER_URL,
  isRouterForm,
  pingA2AServerHealth,
  testAgentChoice,
  testRouterTransition,
  testTaskDecompositionChoice,
} from './router-choice-transition-core.mjs';

const serverLive = await pingA2AServerHealth();

describe('router choice transition (helpers)', () => {
  it('isRouterForm matches static router choices', () => {
    expect(
      isRouterForm({
        form: {
          choices: [{ id: 'dialog' }, { id: 'agent' }],
        },
      })
    ).toBe(true);
    expect(isRouterForm({ form: { choices: [{ id: 'other' }] } })).toBe(false);
  });
});

describe.skipIf(!serverLive)(
  `router choice transition (live server at ${A2A_SERVER_URL})`,
  () => {
    it(
      'dialog: initial router form, then choice exits router',
      async () => {
        await testRouterTransition();
      },
      120_000
    );

    it(
      'agent choice transitions out of router',
      async () => {
        await testAgentChoice();
      },
      120_000
    );

    it(
      'task-decomposition choice transitions out of router',
      async () => {
        await testTaskDecompositionChoice();
      },
      120_000
    );
  }
);
