import { describe, expect, it } from 'vitest';
import {
  assert,
  assertExecuteSingleKeyOrDialogMessageForm,
  assertGrayRoomSlot,
  assertSingleActionKey,
  assertWaitingPublicSessionShape,
} from './lib/a2a-schema-guards.mjs';

function expectAssert(fn, re) {
  expect(fn).toThrow(re);
}

describe('assertSingleActionKey', () => {
  it('allows null/empty object', () => {
    assertSingleActionKey(null, 'x');
    assertSingleActionKey(undefined, 'x');
    assertSingleActionKey({}, 'x');
  });

  it('allows one action key', () => {
    assertSingleActionKey({ script: {} }, 'x');
    assertSingleActionKey({ _meta: 1, form: {} }, 'x');
  });

  it('rejects multiple action keys', () => {
    expectAssert(() => assertSingleActionKey({ script: {}, form: {} }, 'exec'), /at most one action key/);
  });
});

describe('assertExecuteSingleKeyOrDialogMessageForm', () => {
  it('allows message+form', () => {
    assertExecuteSingleKeyOrDialogMessageForm({ message: 'hi', form: {} }, 'd');
  });

  it('allows single key', () => {
    assertExecuteSingleKeyOrDialogMessageForm({ form: {} }, 'd');
  });

  it('rejects message+form+extra', () => {
    expectAssert(
      () => assertExecuteSingleKeyOrDialogMessageForm({ message: 'm', form: {}, script: {} }, 'd'),
      /≤1 action key or dialog/
    );
  });
});

describe('assertWaitingPublicSessionShape', () => {
  it('accepts minimal valid public session', () => {
    assertWaitingPublicSessionShape(
      { asyncPending: false, promiseStatus: null, stage: 'idle' },
      'p'
    );
  });

  it('rejects promiseId on DTO', () => {
    expectAssert(
      () =>
        assertWaitingPublicSessionShape(
          { asyncPending: false, promiseStatus: null, stage: 'idle', promiseId: 'x' },
          'p'
        ),
      /promiseId must not appear/
    );
  });

  it('rejects awaiting-async when not pending', () => {
    expectAssert(
      () =>
        assertWaitingPublicSessionShape(
          { asyncPending: false, promiseStatus: null, stage: 'awaiting-async' },
          'p'
        ),
      /awaiting-async when idle/
    );
  });
});

describe('assertGrayRoomSlot', () => {
  it('accepts nested session.context', () => {
    assertGrayRoomSlot(
      {
        session: {
          context: { workbench: { slots: { grayRoom: { status: 'ready', turn: 1 } } } },
        },
      },
      'g'
    );
  });

  it('accepts top-level context', () => {
    assertGrayRoomSlot(
      { context: { workbench: { slots: { grayRoom: { status: 'completed' } } } } },
      'g'
    );
  });

  it('rejects missing slot', () => {
    expectAssert(() => assertGrayRoomSlot({ session: { context: {} } }, 'g'), /grayRoom slot/);
  });
});

describe('assert', () => {
  it('throws on false', () => {
    expectAssert(() => assert(false, 'nope'), /nope/);
  });
});
