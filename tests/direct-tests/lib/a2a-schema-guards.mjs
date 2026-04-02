/**
 * Pure A2A / Client API shape checks (no I/O).
 * Used by live runners in tests/direct-tests and by Vitest (a2a-schema-guards.test.mjs).
 */

export function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

/** At most one top-level action key under execute/result (A2A action-key shape). */
export function assertSingleActionKey(container, label) {
  if (container == null || typeof container !== 'object') return;
  const keys = Object.keys(container).filter((k) => !k.startsWith('_'));
  assert(
    keys.length <= 1,
    `${label}: expected at most one action key, got [${keys.join(', ')}]`
  );
}

/** Dialog sync execute may use legacy top-level `message` + `form` (WEB UI), not one action-type key. */
export function assertExecuteSingleKeyOrDialogMessageForm(execute, label) {
  if (execute == null || typeof execute !== 'object') return;
  const keys = Object.keys(execute).filter((k) => !k.startsWith('_'));
  if (keys.length <= 1) return;
  const s = new Set(keys);
  if (s.size === 2 && s.has('message') && s.has('form')) return;
  assert(
    false,
    `${label}: expected ≤1 action key or dialog {message,form}, got [${keys.join(', ')}]`
  );
}

/** Public session DTO (WEB_UI_PROTOCOL / SESSION-READ-MODEL — loader metadata). */
export function assertWaitingPublicSessionShape(pub, label) {
  assert(pub && typeof pub === 'object', `${label}: session object`);
  assert(typeof pub.asyncPending === 'boolean', `${label}: asyncPending boolean`);
  const ps = pub.promiseStatus;
  assert(ps === null || typeof ps === 'string', `${label}: promiseStatus null|string`);
  assert(!('promiseId' in pub), `${label}: promiseId must not appear on public session DTO`);
  assert(typeof pub.stage === 'string' && pub.stage.length > 0, `${label}: stage string`);
  if (!pub.asyncPending) {
    assert(pub.stage !== 'awaiting-async', `${label}: stage must not be awaiting-async when idle`);
  }
}

/** @returns {object} grayRoom slot (for callers that log after assert) */
export function assertGrayRoomSlot(session, label) {
  const ctx = session.session?.context ?? session.context;
  const grayRoom = ctx?.workbench?.slots?.grayRoom;
  assert(grayRoom && typeof grayRoom === 'object', `${label}: expected grayRoom slot in context.workbench.slots`);
  assert(typeof grayRoom.status === 'string', `${label}: expected grayRoom.status string`);
  assert(typeof grayRoom.turn === 'number' || grayRoom.turn === undefined, `${label}: expected grayRoom.turn number|undefined`);
  return grayRoom;
}
