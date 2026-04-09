import { describe, expect, it } from 'vitest';
import { mergeResponseContext } from '../../a2a-client/shared/a2a-invoke-builders.mjs';
import {
  assert,
  assertExecuteSingleKeyOrDialogMessageForm,
  assertGrayRoomSlot,
  assertSingleActionKey,
  assertWaitingPublicSessionShape,
  assertWebUiExecuteProjection,
  hasWebFormTextEntry,
  getRouterFormChoiceArray,
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

describe('assertWebUiExecuteProjection', () => {
  it('allows message+form+attachments (WEB_UI_PROTOCOL)', () => {
    assertWebUiExecuteProjection(
      { message: 'm', form: {}, attachments: { readFiles: [{ path: 'a' }] } },
      'x'
    );
  });

  it('rejects raw tool keys', () => {
    expectAssert(
      () => assertWebUiExecuteProjection({ message: 'm', 'read-file': { path: 'x' } }, 'x'),
      /extra: read-file/
    );
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

describe('hasWebFormTextEntry', () => {
  it('detects legacy form.input array', () => {
    expect(hasWebFormTextEntry({ input: [{ id: 'task' }] })).toBe(true);
  });

  it('detects Pattern A form.textarea object', () => {
    expect(hasWebFormTextEntry({ textarea: { placeholder: 'x' } })).toBe(true);
  });

  it('rejects empty', () => {
    expect(hasWebFormTextEntry(null)).toBe(false);
    expect(hasWebFormTextEntry({})).toBe(false);
  });

  it('detects form.inputs array (alias of form.input)', () => {
    expect(hasWebFormTextEntry({ inputs: [{ id: 'task' }] })).toBe(true);
  });

  it('detects non-empty textarea string', () => {
    expect(hasWebFormTextEntry({ textarea: 'Type here' })).toBe(true);
  });
});

describe('getRouterFormChoiceArray', () => {
  it('reads form.choices or form.meta.routerChoices', () => {
    expect(getRouterFormChoiceArray({ choices: [{ id: 'a' }] }).length).toBe(1);
    expect(getRouterFormChoiceArray({ meta: { routerChoices: [{ id: 'b' }] } }).length).toBe(1);
    expect(getRouterFormChoiceArray({})).toEqual([]);
  });
});

describe('mergeResponseContext workbench.slots', () => {
  it('preserves grayRoom when server patch omits slots', () => {
    const fallback = {
      workbench: {
        sections: { a: 1 },
        slots: { grayRoom: { status: 'completed', turn: 1 } },
      },
    };
    const serverLike = {
      success: true,
      data: {
        context: {
          workbench: {
            sections: { b: 2 },
          },
        },
      },
    };
    const merged = mergeResponseContext(fallback, serverLike);
    expect(merged.workbench?.slots?.grayRoom).toEqual({ status: 'completed', turn: 1 });
    expect(merged.workbench?.sections).toEqual({ b: 2 });
  });
});

describe('assert', () => {
  it('throws on false', () => {
    expectAssert(() => assert(false, 'nope'), /nope/);
  });
});
