#!/usr/bin/env node
/**
 * E2E / schema-oriented direct tests (Client API + optional invoke).
 *
 * Usage:
 *   node tests/direct-tests/e2e-dialog-test.js
 *   node tests/direct-tests/e2e-dialog-test.js --list
 *   node tests/direct-tests/e2e-dialog-test.js --only=invokeHello,agentSeed,clientProjects
 *
 * Env: A2A_SERVER_URL, CLIENT_API_URL
 * Optional: REQUIRE_ASYNC_PIPELINE=1 — fail if dialog /next does not go async or no in-flight /async seen
 */

import fs from 'fs/promises';
import path from 'path';

import {
  assert,
  assertExecuteSingleKeyOrDialogMessageForm,
  assertGrayRoomSlot,
  assertSingleActionKey,
  assertWaitingPublicSessionShape,
} from './lib/a2a-schema-guards.mjs';

const SERVER_URL = process.env.A2A_SERVER_URL || 'http://localhost:3000';
const CLIENT_API_URL = process.env.CLIENT_API_URL || 'http://localhost:5173';
const REQUIRE_ASYNC_PIPELINE = process.env.REQUIRE_ASYNC_PIPELINE === '1';

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

/** Public session DTO (WEB_UI_PROTOCOL / SESSION-READ-MODEL — loader metadata). */
function unwrapPublicSession(body) {
  if (body && typeof body === 'object' && body.session) return body.session;
  return body;
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

async function performRedRoomClientExecute(sessionId, executeBlock) {
  const keys = Object.keys(executeBlock).filter((k) => !k.startsWith('_'));
  assert(keys.length === 1, 'red-room: execute must have exactly one action key');
  const action = keys[0];
  const cfg = executeBlock[action];

  let result;
  if (action === 'read-file') {
    assert(cfg && cfg.path, 'red-room: read-file path missing');
    const repoPath = path.isAbsolute(cfg.path) ? cfg.path : path.resolve(process.cwd(), cfg.path);
    const content = await fs.readFile(repoPath, 'utf8');
    result = { 'read-file': { path: cfg.path, content } };
  } else if (action === 'list-directory') {
    assert(cfg && cfg.path, 'red-room: list-directory path missing');
    const dirPath = path.isAbsolute(cfg.path) ? cfg.path : path.resolve(process.cwd(), cfg.path);
    const entries = await fs.readdir(dirPath);
    result = { 'list-directory': { path: cfg.path, entries } };
  } else if (action === 'file-exists') {
    assert(cfg && cfg.path, 'red-room: file-exists path missing');
    const checkPath = path.isAbsolute(cfg.path) ? cfg.path : path.resolve(process.cwd(), cfg.path);
    let exists = true;
    try {
      await fs.access(checkPath);
    } catch {
      exists = false;
    }
    result = { 'file-exists': { path: cfg.path, exists } };
  } else {
    throw new Error(`red-room: unsupported execute action ${action}`);
  }

  const ack = await sendNext(sessionId, { result });
  assert(ack?.success === true, 'red-room /next ack success expected');

  if (ack.asyncPending) {
    await pollAsyncSettled(sessionId, 120_000);
  }

  return getSession(sessionId);
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
    assertExecuteSingleKeyOrDialogMessageForm(data.execute, 'follow-up data.execute');
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

/** GET /async when no in-flight promise — idle envelope (WEB_UI_PROTOCOL lifecycle). */
async function caseWaitingAsyncIdleEnvelope() {
  const { sessionId } = await createSession({ title: 'async idle envelope' });
  const j = await fetchJson(`${CLIENT_API_URL}/api/a2a/sessions/${sessionId}/async`);
  assert(j.asyncPending === false, 'idle: asyncPending false');
  assert(j.completed === true, 'idle: completed true');
  assert(j.status === 'idle', 'idle: status idle');
  assert(j.execute === null || j.execute === undefined, 'idle: execute absent');
  assert(j.result === null || j.result === undefined, 'idle: result absent');
}

/** GET /sessions/:id public DTO — loader fields + no transport id (WEB_UI_PROTOCOL). */
async function caseWaitingGetSessionSchema() {
  const { sessionId } = await createSession({ title: 'waiting GET session' });
  const body = await fetchJson(`${CLIENT_API_URL}/api/a2a/sessions/${sessionId}`);
  assertWaitingPublicSessionShape(unwrapPublicSession(body), 'GET session');
}

/** GET /sessions/:id/latest — nested session matches public loader schema. */
async function caseWaitingLatestSessionSchema() {
  const { sessionId } = await createSession({ title: 'waiting latest' });
  const j = await fetchJson(`${CLIENT_API_URL}/api/a2a/sessions/${sessionId}/latest`);
  assert(j.session && typeof j.session === 'object', 'latest.session object');
  assertWaitingPublicSessionShape(j.session, 'GET latest.session');
}

/** POST /next ack — asyncPending boolean (ack + hydrate; preloader uses same flag). */
async function caseWaitingNextAckShape() {
  const { sessionId } = await createSession({
    context: { execution: { action: 'dialog', step: 'init' } },
  });
  const ack = await sendNext(sessionId, { result: { message: 'waiting next ack probe' } });
  assert(ack && typeof ack === 'object', 'next ack object');
  assert(ack.success === true, 'next success');
  assert(ack.accepted === true, 'next accepted');
  assert(typeof ack.asyncPending === 'boolean', 'next ack asyncPending boolean');
  if (ack.asyncPending) {
    assert(typeof ack.promiseId === 'string' && ack.promiseId.length > 0, 'next ack promiseId when async');
  }
}

/**
 * Dialog /next → optional in-flight /async → settle → idle + GET session + legacy GET .../promise/:id.
 * When stack is sync-only, passes unless REQUIRE_ASYNC_PIPELINE=1.
 */
async function caseWaitingAsyncPipeline() {
  const { sessionId } = await createSession({
    context: { execution: { action: 'dialog', step: 'init' } },
  });
  const ack = await sendNext(sessionId, { result: { message: 'async pipeline probe' } });
  assert(ack.success === true, 'pipeline: next success');

  if (!ack.asyncPending) {
    if (REQUIRE_ASYNC_PIPELINE) {
      throw new Error('REQUIRE_ASYNC_PIPELINE=1 but /next returned sync (asyncPending false)');
    }
    return;
  }

  const promiseId = ack.promiseId;
  assert(typeof promiseId === 'string' && promiseId.length > 0, 'pipeline: promiseId');

  let sawInFlight = false;
  for (let i = 0; i < 40; i++) {
    const r = await fetch(`${CLIENT_API_URL}/api/a2a/sessions/${sessionId}/async`);
    assert(r.ok, `pipeline: /async ${r.status}`);
    const j = await r.json();
    if (j.asyncPending === true && j.status !== 'idle') {
      sawInFlight = true;
      assert(typeof j.status === 'string', 'pipeline: in-flight status string');
      break;
    }
    if (j.asyncPending === false && j.completed === true && j.status === 'idle') {
      break;
    }
    await sleep(100);
  }
  if (REQUIRE_ASYNC_PIPELINE && !sawInFlight) {
    throw new Error('REQUIRE_ASYNC_PIPELINE=1 but never observed in-flight GET /async');
  }

  const settled = await pollAsyncSettled(sessionId, 120_000);
  assert(settled != null, 'pipeline: poll settled');
  assert(settled.asyncPending === false, 'pipeline: settled asyncPending false');

  const idle = await fetchJson(`${CLIENT_API_URL}/api/a2a/sessions/${sessionId}/async`);
  assert(idle.asyncPending === false, 'pipeline: idle asyncPending');
  assert(idle.status === 'idle', 'pipeline: idle status');

  const body = await fetchJson(`${CLIENT_API_URL}/api/a2a/sessions/${sessionId}`);
  const pub = unwrapPublicSession(body);
  assert(pub.asyncPending === false, 'pipeline: GET session asyncPending false');
  assert(pub.stage !== 'awaiting-async', 'pipeline: stage not awaiting-async');
  assertWaitingPublicSessionShape(pub, 'pipeline after settle');

  const prom = await fetchJson(
    `${CLIENT_API_URL}/api/a2a/sessions/${sessionId}/promise/${encodeURIComponent(promiseId)}`
  );
  assert(prom.promiseId === promiseId, 'legacy /promise: promiseId');
  assert(typeof prom.completed === 'boolean', 'legacy /promise: completed boolean');
  assert(typeof prom.status === 'string', 'legacy /promise: status string');
}

/** GET /messages?withExecute=1 — projected execute + loader fields (sessionRoutes). */
async function caseWaitingMessagesWithExecute() {
  const { sessionId } = await createSession({ title: 'messages withExecute' });
  const j = await fetchJson(
    `${CLIENT_API_URL}/api/a2a/sessions/${sessionId}/messages?withExecute=1`
  );
  assert(j.sessionId === sessionId, 'withExecute sessionId');
  assert(Object.prototype.hasOwnProperty.call(j, 'execute'), 'withExecute: execute key present');
  assert(j.execute === null || typeof j.execute === 'object', 'withExecute: execute null|object');
  assert(typeof j.asyncPending === 'boolean', 'withExecute: asyncPending');
  const mps = j.promiseStatus;
  assert(mps === null || typeof mps === 'string', 'withExecute: promiseStatus');
}

async function caseSessionMessagesEndpoint() {
  const { sessionId } = await createSession({ title: 'messages probe' });
  const j = await fetchJson(`${CLIENT_API_URL}/api/a2a/sessions/${sessionId}/messages`);
  assert(j.sessionId === sessionId, 'messages payload sessionId');
  assert(Array.isArray(j.messages), 'expected messages array');
  assert(typeof j.asyncPending === 'boolean', 'messages.asyncPending boolean');
  const mps = j.promiseStatus;
  assert(mps === null || typeof mps === 'string', 'messages.promiseStatus null|string');
  assert(typeof j.currentStep === 'number', 'messages.currentStep number');
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

async function caseRedAndGrayRoomCycle() {
  const { sessionId } = await createSession({ mode: 'agent', task: 'Red/Gray room coverage test' });
  assert(sessionId, 'session id');

  const promptText =
    'Please start a tool execution for a file operation. For example: execute {"read-file":{"path":"README.md"}}.';

  let redExecute;
  for (let attempt = 0; attempt < 3; attempt++) {
    const ack = await sendNext(sessionId, { result: { message: promptText } });
    assert(ack?.accepted === true, 'red-gray room: /next accepted');

    const settled = await pollAsyncSettled(sessionId, 120_000);
    assert(settled, 'red-gray room: first settle');

    const session = await getSession(sessionId);
    assertGrayRoomSlot(session, 'after first settle');

    const executeObj = session.session?.execute ?? session.execute;
    if (executeObj && Object.keys(executeObj).filter((k) => !k.startsWith('_')).length > 0) {
      redExecute = executeObj;
      break;
    }
  }

  assert(redExecute, 'red-gray room: no tool execute observed after attempts');

  const sessionAfterRedRoom = await performRedRoomClientExecute(sessionId, redExecute);
  assertGrayRoomSlot(sessionAfterRedRoom, 'after red room');

  const finalExecute = sessionAfterRedRoom.session?.execute ?? sessionAfterRedRoom.execute;
  if (finalExecute) {
    assert(
      Object.keys(finalExecute).filter((k) => !k.startsWith('_')).length <= 1,
      'final execute must still be single-key shape if present'
    );
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
  waitingAsyncIdle: {
    name: 'waitingAsyncIdle',
    desc: 'GET /async idle envelope (asyncPending, completed, status)',
    run: caseWaitingAsyncIdleEnvelope,
  },
  waitingGetSession: {
    name: 'waitingGetSession',
    desc: 'GET session: asyncPending, promiseStatus, stage, no promiseId',
    run: caseWaitingGetSessionSchema,
  },
  waitingLatest: {
    name: 'waitingLatest',
    desc: 'GET /latest nested session: same loader DTO',
    run: caseWaitingLatestSessionSchema,
  },
  waitingNextAck: {
    name: 'waitingNextAck',
    desc: 'POST /next ack: asyncPending (+ promiseId if async)',
    run: caseWaitingNextAckShape,
  },
  waitingAsyncPipeline: {
    name: 'waitingAsyncPipeline',
    desc: 'async /next → in-flight /async → settle → idle + legacy /promise (strict: REQUIRE_ASYNC_PIPELINE=1)',
    run: caseWaitingAsyncPipeline,
  },
  waitingMessagesExecute: {
    name: 'waitingMessagesExecute',
    desc: 'GET /messages?withExecute=1 (+ loader fields)',
    run: caseWaitingMessagesWithExecute,
  },
  sessionMessages: {
    name: 'sessionMessages',
    desc: 'GET .../messages + asyncPending/promiseStatus/currentStep',
    run: caseSessionMessagesEndpoint,
  },
  redGrayRoom: {
    name: 'redGrayRoom',
    desc: 'Red Room tool execute cycle + Gray Room slot presence',
    run: caseRedAndGrayRoomCycle,
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
  'waitingAsyncIdle',
  'waitingGetSession',
  'waitingLatest',
  'waitingNextAck',
  'waitingAsyncPipeline',
  'waitingMessagesExecute',
  'sessionMessages',
  'redGrayRoom',
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
