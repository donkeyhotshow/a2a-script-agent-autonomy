#!/usr/bin/env node
/**
 * E2E / schema-oriented direct tests (Client API + optional invoke).
 *
 * Usage:
 *   node scripts/direct-tests/e2e-dialog-test.js
 *   node scripts/direct-tests/e2e-dialog-test.js --list
 *   node scripts/direct-tests/e2e-dialog-test.js --only=invokeHello,agentSeed,clientProjects
 *
 * Env: A2A_SERVER_URL, CLIENT_API_URL
 */

const SERVER_URL = process.env.A2A_SERVER_URL || 'http://localhost:3000';
const CLIENT_API_URL = process.env.CLIENT_API_URL || 'http://localhost:5173';

function parseArgs(argv) {
  const list = argv.includes('--list');
  const onlyArg = argv.find((a) => a.startsWith('--only='));
  const only = onlyArg
    ? onlyArg.slice('--only='.length).split(',').map((s) => s.trim()).filter(Boolean)
    : null;
  return { list, only };
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

/** At most one top-level action key under execute/result (A2A action-key shape). */
function assertSingleActionKey(container, label) {
  if (container == null || typeof container !== 'object') return;
  const keys = Object.keys(container).filter((k) => !k.startsWith('_'));
  assert(
    keys.length <= 1,
    `${label}: expected at most one action key, got [${keys.join(', ')}]`
  );
}

async function createSession(body = {}) {
  const response = await fetch(`${CLIENT_API_URL}/api/a2a/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Failed to create session: ${response.status}`);
  }
  const session = await response.json();
  const sessionId =
    session.session?.id || session.id || session.sessionId || session.ID;
  return { sessionId, raw: session };
}

async function sendNext(sessionId, body) {
  const response = await fetch(
    `${CLIENT_API_URL}/api/a2a/sessions/${sessionId}/next`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`next failed: ${response.status} - ${error}`);
  }
  return response.json();
}

async function getSession(sessionId) {
  const response = await fetch(`${CLIENT_API_URL}/api/a2a/sessions/${sessionId}`);
  if (!response.ok) {
    throw new Error(`Failed to get session: ${response.status}`);
  }
  return response.json();
}

async function pollAsyncSettled(sessionId, maxWaitMs = 120_000, stepMs = 500) {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const r = await fetch(`${CLIENT_API_URL}/api/a2a/sessions/${sessionId}/async`);
    if (!r.ok) break;
    const j = await r.json();
    if (!j.asyncPending) return j;
    await sleep(stepMs);
  }
  return null;
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${url}: ${response.status} ${text}`);
  }
  return response.json();
}

async function invokeDirect(task, context = {}) {
  const body = { task, sync: true };
  if (context.execution) {
    body.context = {
      task,
      execution: context.execution,
    };
  }
  const response = await fetch(`${SERVER_URL}/api/v1/invoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Invoke failed: ${response.status} - ${error}`);
  }
  return response.json();
}

/** POST /api/v1/invoke — returns status + parsed body (for 4xx tests). */
async function postInvokeRaw(payload) {
  const response = await fetch(`${SERVER_URL}/api/v1/invoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  let body;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { status: response.status, body };
}

// --- cases ---

async function caseClientProjects() {
  const r = await fetch(`${CLIENT_API_URL}/api/a2a/projects`);
  assert(r.ok, `Client API projects: ${r.status}`);
}

async function caseServerHealth() {
  const r = await fetch(`${SERVER_URL}/health`);
  assert(r.ok, `Server health: ${r.status}`);
}

async function caseServerHealthJsonShape() {
  const j = await fetchJson(`${SERVER_URL}/health`);
  assert(j && typeof j === 'object', 'health JSON object');
  assert(j.status === 'ok', 'health.status === ok');
  assert(j.mode === 'stateless', 'health.mode stateless');
}

async function caseInvokeEmptyBody400() {
  const { status, body } = await postInvokeRaw({});
  assert(status === 400, `expected 400 empty invoke, got ${status}`);
  assert(body?.success === false, 'invoke validation success false');
}

async function caseInvokeUnknownRootProperty400() {
  const { status, body } = await postInvokeRaw({ task: 'x', notAllowed: true });
  assert(status === 400, `expected 400 extra root key, got ${status}`);
  assert(body?.success === false, 'invoke validation success false');
}

async function caseInvokeContextFollowupShape() {
  const { status, body } = await postInvokeRaw({
    sync: true,
    context: {
      task: 'follow-up invoke schema',
      execution: { action: 'dialog', step: 'init' },
    },
  });
  assert(status === 200, `context-only invoke: ${status}`);
  assert(body?.success !== false, 'follow-up invoke success');
  const data = body?.data;
  if (data?.execute && typeof data.execute === 'object') {
    assertSingleActionKey(data.execute, 'follow-up data.execute');
  }
}

async function caseRequestsStatusMissingIds400() {
  const r = await fetch(`${SERVER_URL}/api/v1/requests/status`);
  assert(r.status === 400, `requests/status without ids: ${r.status}`);
}

async function caseRequestsBatchStatusFakeId() {
  const fakeId = 'prom_direct_test_nonexistent';
  const j = await fetchJson(
    `${SERVER_URL}/api/v1/requests/status?ids=${encodeURIComponent(fakeId)}`
  );
  assert(j.success === true, 'batch status success');
  const items = j.data?.items;
  assert(Array.isArray(items) && items.length === 1, 'batch one item');
  assert(items[0].found === false, 'unknown promiseId found false');
}

async function caseRequestsSingleStatus404() {
  const r = await fetch(`${SERVER_URL}/api/v1/requests/prom_missing_xyz/status`);
  assert(r.status === 404, `single status 404: ${r.status}`);
}

async function caseInvokeSyncResponseEnvelope() {
  const invokeResult = await invokeDirect('Envelope probe');
  assert(invokeResult.success === true, 'sync envelope success');
  const data = invokeResult.data;
  assert(data && data.sync === true, 'data.sync true');
  assert(
    data.execute !== undefined || data.message !== undefined || data.context !== undefined,
    'data has execute, message, or context'
  );
}

async function caseClientSessionsList() {
  const j = await fetchJson(`${CLIENT_API_URL}/api/a2a/sessions`);
  assert(Array.isArray(j.sessions), 'expected { sessions: array }');
}

async function caseAgentExecutionSeed() {
  const { raw } = await createSession({
    execution: { action: 'agent', step: 'new' },
    task: 'execution object seed',
  });
  const ctx = raw.session?.context ?? raw.context;
  assert(ctx?.execution?.action === 'agent', 'expected execution.action agent from body.execution');
}

async function caseDialogModeSeed() {
  const { raw } = await createSession({
    mode: 'dialog',
    task: 'dialog mode seed',
  });
  const ctx = raw.session?.context ?? raw.context;
  assert(ctx?.execution?.action === 'dialog', 'expected execution.action dialog');
}

async function caseAsyncEndpointAfterCreate() {
  const { sessionId } = await createSession({ title: 'async probe' });
  const j = await fetchJson(`${CLIENT_API_URL}/api/a2a/sessions/${sessionId}/async`);
  assert(typeof j.asyncPending === 'boolean', 'expected asyncPending boolean');
}

async function caseSessionMessagesEndpoint() {
  const { sessionId } = await createSession({ title: 'messages probe' });
  const j = await fetchJson(`${CLIENT_API_URL}/api/a2a/sessions/${sessionId}/messages`);
  assert(j.sessionId === sessionId, 'messages payload sessionId');
  assert(Array.isArray(j.messages), 'expected messages array');
}

async function caseNextResultMessageShape() {
  const { sessionId } = await createSession({ title: 'result.message' });
  const ack = await sendNext(sessionId, { result: { message: 'typed result.message' } });
  assert(ack != null, 'next ack');
}

async function caseGetSessionIncludeContextDev() {
  const { sessionId } = await createSession({ title: 'includeContext' });
  const response = await fetch(
    `${CLIENT_API_URL}/api/a2a/sessions/${sessionId}?includeContext=1`
  );
  if (response.status === 403) {
    return;
  }
  assert(response.ok, `GET session includeContext: ${response.status}`);
  const session = await response.json();
  const ctx = session.session?.context ?? session.context;
  assert(ctx && typeof ctx === 'object', 'expected context when includeContext allowed');
}

async function caseInvokeHello() {
  const invokeResult = await invokeDirect('Hello');
  assert(invokeResult.success !== false, 'invoke should not report success=false');
  const data = invokeResult.data;
  if (data?.execute) {
    assertSingleActionKey(data.execute, 'invoke data.execute');
  }
  if (data?.result) {
    assertSingleActionKey(data.result, 'invoke data.result');
  }
}

async function caseDialogSessionRoundTrip() {
  const { sessionId } = await createSession({
    context: { execution: { action: 'dialog', step: 'init' } },
  });
  assert(sessionId, 'session id');
  await sendNext(sessionId, { result: { message: 'Hi' } });
  await sleep(800);
  await pollAsyncSettled(sessionId, 60_000);
  const session = await getSession(sessionId);
  const step = session.session?.context?.execution?.step ?? session.context?.execution?.step;
  assert(typeof step === 'string', 'expected execution.step string after message');
  if (session.session?.execute) {
    assertSingleActionKey(session.session.execute, 'session.execute');
  }
}

async function caseAgentSeededSession() {
  const { sessionId, raw } = await createSession({
    mode: 'agent',
    task: 'Smoke: no real work',
  });
  assert(sessionId, 'session id');
  const ctx = raw.session?.context ?? raw.context;
  const action = ctx?.execution?.action;
  assert(action === 'agent', `expected execution.action agent, got ${action}`);
}

async function caseNextTaskShorthand() {
  const { sessionId } = await createSession({ title: 'Shorthand', task: 'ping' });
  assert(sessionId, 'session id');
  const ack = await sendNext(sessionId, { task: 'second line' });
  assert(ack != null, 'next ack');
}

async function caseInvokeSyncShape() {
  const invokeResult = await invokeDirect('Schema check');
  const data = invokeResult.data;
  if (!data) return;
  if (data.execute && typeof data.execute === 'object') {
    const keys = Object.keys(data.execute).filter((k) => !k.startsWith('_'));
    assert(keys.length === 1, `execute must have exactly one key, got: ${keys.join(',')}`);
  }
}

const CASE_REGISTRY = {
  clientProjects: { name: 'clientProjects', desc: 'GET /api/a2a/projects', run: caseClientProjects },
  serverHealth: { name: 'serverHealth', desc: 'GET /health on A2A server', run: caseServerHealth },
  serverHealthJson: {
    name: 'serverHealthJson',
    desc: 'GET /health JSON shape (status, mode)',
    run: caseServerHealthJsonShape,
  },
  invokeEmptyBody400: {
    name: 'invokeEmptyBody400',
    desc: 'POST /invoke {} → 400 schema',
    run: caseInvokeEmptyBody400,
  },
  invokeUnknownRoot400: {
    name: 'invokeUnknownRoot400',
    desc: 'POST /invoke extra root property → 400',
    run: caseInvokeUnknownRootProperty400,
  },
  requestsStatusNoIds400: {
    name: 'requestsStatusNoIds400',
    desc: 'GET /requests/status without ids → 400',
    run: caseRequestsStatusMissingIds400,
  },
  requestsBatchFakeId: {
    name: 'requestsBatchFakeId',
    desc: 'GET /requests/status?ids=fake → found:false',
    run: caseRequestsBatchStatusFakeId,
  },
  requestsSingle404: {
    name: 'requestsSingle404',
    desc: 'GET /requests/:id/status missing → 404',
    run: caseRequestsSingleStatus404,
  },
  invokeContextFollowup: {
    name: 'invokeContextFollowup',
    desc: 'POST /invoke context+execution only (sync)',
    run: caseInvokeContextFollowupShape,
  },
  invokeSyncEnvelope: {
    name: 'invokeSyncEnvelope',
    desc: 'sync invoke response: data.sync + payload fields',
    run: caseInvokeSyncResponseEnvelope,
  },
  clientSessionsList: {
    name: 'clientSessionsList',
    desc: 'GET /api/a2a/sessions',
    run: caseClientSessionsList,
  },
  invokeHello: { name: 'invokeHello', desc: 'POST invoke sync + optional shape', run: caseInvokeHello },
  invokeSyncShape: {
    name: 'invokeSyncShape',
    desc: 'invoke: execute has exactly one action key',
    run: caseInvokeSyncShape,
  },
  agentSeed: {
    name: 'agentSeed',
    desc: 'POST session with mode:agent + task',
    run: caseAgentSeededSession,
  },
  agentExecutionSeed: {
    name: 'agentExecutionSeed',
    desc: 'POST session with execution.action agent (not mode)',
    run: caseAgentExecutionSeed,
  },
  dialogModeSeed: {
    name: 'dialogModeSeed',
    desc: 'POST session with mode:dialog',
    run: caseDialogModeSeed,
  },
  asyncAfterCreate: {
    name: 'asyncAfterCreate',
    desc: 'GET .../sessions/:id/async after create',
    run: caseAsyncEndpointAfterCreate,
  },
  sessionMessages: {
    name: 'sessionMessages',
    desc: 'GET .../sessions/:id/messages',
    run: caseSessionMessagesEndpoint,
  },
  nextResultMessage: {
    name: 'nextResultMessage',
    desc: '/next with result.message (explicit)',
    run: caseNextResultMessageShape,
  },
  getSessionIncludeContext: {
    name: 'getSessionIncludeContext',
    desc: 'GET session ?includeContext=1 (skipped if 403)',
    run: caseGetSessionIncludeContextDev,
  },
  dialogSession: {
    name: 'dialogSession',
    desc: 'session + /next message + hydrate',
    run: caseDialogSessionRoundTrip,
  },
  nextTaskShorthand: {
    name: 'nextTaskShorthand',
    desc: '/next with top-level task shorthand',
    run: caseNextTaskShorthand,
  },
};

const DEFAULT_ORDER = [
  'clientProjects',
  'serverHealth',
  'serverHealthJson',
  'invokeEmptyBody400',
  'invokeUnknownRoot400',
  'requestsStatusNoIds400',
  'requestsBatchFakeId',
  'requestsSingle404',
  'invokeContextFollowup',
  'invokeSyncEnvelope',
  'clientSessionsList',
  'invokeHello',
  'invokeSyncShape',
  'agentSeed',
  'agentExecutionSeed',
  'dialogModeSeed',
  'nextTaskShorthand',
  'nextResultMessage',
  'asyncAfterCreate',
  'sessionMessages',
  'getSessionIncludeContext',
  'dialogSession',
];

async function main() {
  const { list, only } = parseArgs(process.argv.slice(2));
  if (list) {
    console.log('Cases:');
    for (const id of DEFAULT_ORDER) {
      const c = CASE_REGISTRY[id];
      console.log(`  ${c.name} — ${c.desc}`);
    }
    return;
  }

  const order = only && only.length ? only : DEFAULT_ORDER;
  const unknown = order.filter((id) => !CASE_REGISTRY[id]);
  if (unknown.length) {
    console.error('Unknown case(s):', unknown.join(', '));
    console.error('Use --list');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('Direct E2E cases:', order.join(', '));
  console.log('='.repeat(60));

  let failed = 0;
  for (const id of order) {
    const { name, desc, run } = CASE_REGISTRY[id];
    process.stdout.write(`\n[${name}] ${desc} ... `);
    try {
      await run();
      console.log('OK');
    } catch (e) {
      failed++;
      console.log('FAIL');
      console.error(e.message || e);
    }
  }

  console.log('\n' + '='.repeat(60));
  if (failed) {
    console.log(`Done: ${failed} case(s) failed`);
    process.exit(1);
  }
  console.log('Done: all cases passed');
  console.log('='.repeat(60));
}

main();
