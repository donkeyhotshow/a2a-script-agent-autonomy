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
 *
 * Resilience (transient 503 from Vite→A2A proxy): E2E_FETCH_RETRIES (default 6), E2E_FETCH_RETRY_BASE_MS (default 200),
 * E2E_CASE_COOLDOWN_MS (default 75) between cases, E2E_RED_GRAY_ATTEMPTS (default 6) for redGrayRoom.
 *
 * Fewer LLM round-trips / sessions (same assertions, merged runners):
 *   E2E_DIRECT_LOW_LLM=1 — enables both merges below
 *   E2E_DIRECT_MERGE_INVOKE=1 — one invoke+poll replaces invokeAsyncEnvelope + invokeHello + invokeSyncShape (3→1 LLM)
 *   E2E_DIRECT_MERGE_CLIENT_SESSION_SCHEMA=1 — one session replaces asyncAfterCreate, waitingAsyncIdle, waitingGetSession,
 *     waitingLatest, waitingMessagesExecute, sessionMessages, getSessionIncludeContext, nextResultMessage, nextTaskShorthand (9→1 session)
 *
 * Full agent-mode dialog chain: node …/e2e-dialog-test.js --only=agentDialogWorkflow
 * (mode:agent → router → choice dialog → hello → thanks; mirrors test-dialog-flow.ps1, uses /async poll).
 * Router regression: --only=routerAgentNoLoop,routerAgentNoLoopTaskShorthand,routerAgentNoLoopUtf8Task,routerDialogNoLoop,routerDialogNoLoopTaskShorthand,routerWrongBeatMessage
 *
 * Web dialog projection (normative): a2a-client/docs/WEB_UI_PROTOCOL.md — GET /sessions/:id uses
 * toPublicSession(): projected execute (message / llmMessage / form / attachments), no raw tool keys;
 * optional slim context { task, projectId, execution? } from session-projection-dto.js; full context only with
 * ?includeContext=1. Response may use { session } wrapper; unwrapPublicSession() accepts both.
 */

import fs from 'fs/promises';
import path from 'path';

import {
  assert,
  assertExecuteSingleKeyOrDialogMessageForm,
  assertGrayRoomSlot,
  assertWebUiExecuteProjection,
  assertSingleActionKey,
  assertWaitingPublicSessionShape,
  getRouterFormChoiceArray,
  hasWebFormTextEntry,
} from './lib/a2a-schema-guards.mjs';
import {recordClientSession, recordServerPromise} from './artifacts-registry.js';

const SERVER_URL = process.env.A2A_SERVER_URL || 'http://localhost:3000';
const CLIENT_API_URL = process.env.CLIENT_API_URL || 'http://localhost:5173';
const REQUIRE_ASYNC_PIPELINE = process.env.REQUIRE_ASYNC_PIPELINE === '1';

/** Transient proxy errors to A2A (:3000) — retry with backoff (503 often empty `message`). */
const E2E_FETCH_RETRIES = Math.max(1, Number(process.env.E2E_FETCH_RETRIES) || 6);
const E2E_FETCH_RETRY_BASE_MS = Math.max(50, Number(process.env.E2E_FETCH_RETRY_BASE_MS) || 200);
/** Optional pause between E2E cases to avoid overloading the dev server connection pool. */
const E2E_CASE_COOLDOWN_MS = Math.max(0, Number(process.env.E2E_CASE_COOLDOWN_MS) || 75);
const E2E_RED_GRAY_ATTEMPTS = Math.max(1, Number(process.env.E2E_RED_GRAY_ATTEMPTS) || 6);

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

/**
 * Retry on transient Client API / proxy failures (502/503/429) and network errors.
 * @param {string} url
 * @param {RequestInit} [init]
 */
async function fetchWithRetry(url, init = {}) {
  let lastErr;
  for (let attempt = 0; attempt < E2E_FETCH_RETRIES; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok) return response;
      const status = response.status;
      const retryable = status === 503 || status === 502 || status === 429;
      if (retryable && attempt < E2E_FETCH_RETRIES - 1) {
        await sleep(E2E_FETCH_RETRY_BASE_MS * (attempt + 1));
        continue;
      }
      return response;
    } catch (e) {
      lastErr = e;
      if (attempt < E2E_FETCH_RETRIES - 1) {
        await sleep(E2E_FETCH_RETRY_BASE_MS * (attempt + 1));
        continue;
      }
      throw e;
    }
  }
  throw lastErr ?? new Error('fetchWithRetry: exhausted retries');
}

async function createSession(body = {}) {
  const response = await fetchWithRetry(`${CLIENT_API_URL}/api/a2a/sessions`, {
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
  if (sessionId) {
    await recordClientSession(sessionId);
  }
  return { sessionId, raw: session };
}

async function sendNext(sessionId, body) {
  const response = await fetchWithRetry(
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
  const ack = await response.json();
  if (ack && typeof ack === 'object' && ack.promiseId) {
    await recordServerPromise(ack.promiseId);
  }
  return ack;
}

async function getSession(sessionId, opts = {}) {
  const q = opts.includeContext ? '?includeContext=1' : '';
  const response = await fetchWithRetry(`${CLIENT_API_URL}/api/a2a/sessions/${sessionId}${q}`);
  if (response.status === 403 && opts.includeContext) {
    return null;
  }
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

/** Poll GET …/sessions/:id/async until `asyncPending` is false (same contract as promiseId: no wall-clock cap). */
async function pollAsyncSettled(sessionId, stepMs = 500) {
  for (;;) {
    const r = await fetchWithRetry(`${CLIENT_API_URL}/api/a2a/sessions/${sessionId}/async`);
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
    await pollAsyncSettled(sessionId);
  }

  return getSession(sessionId);
}

async function fetchJson(url, init) {
  const response = await fetchWithRetry(url, init);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${url}: ${response.status} ${text}`);
  }
  return response.json();
}

async function invokeDirect(task, context = {}) {
  const body = { task };
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
  const wrap = await response.json();
  const pid = wrap?.data?.promiseId;
  if (!pid || typeof pid !== 'string') {
    throw new Error(`async-only invoke: expected data.promiseId, got ${JSON.stringify(wrap)}`);
  }
  await recordServerPromise(pid);
  const terminal = await pollServerRequestResult(pid);
  if (!terminal?.data) {
    throw new Error(`invokeDirect: missing terminal data for ${pid}`);
  }
  const d = terminal.data;
  return {
    success: true,
    data: {
      status: d.status,
      execute: d.execute,
      context: d.context,
      message: d.message,
      result: d.result,
    },
  };
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

/** Poll GET /api/v1/requests/:id/result until terminal status (async invoke). No wall-clock cap. */
async function pollServerRequestResult(promiseId, stepMs = 500) {
  const url = `${SERVER_URL}/api/v1/requests/${encodeURIComponent(promiseId)}/result`;
  for (;;) {
    const r = await fetch(url);
    if (!r.ok) {
      await sleep(stepMs);
      continue;
    }
    const wrap = await r.json();
    const st = wrap?.data?.status;
    if (st === 'completed' || st === 'failed' || st === 'cancelled') {
      return wrap;
    }
    await sleep(stepMs);
  }
}

// --- cases ---

async function caseClientProjects() {
  const r = await fetchWithRetry(`${CLIENT_API_URL}/api/a2a/projects`);
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
    context: {
      task: 'follow-up invoke schema',
      execution: { action: 'dialog', step: 'init' },
    },
  });
  assert(status === 200, `context-only invoke: ${status}`);
  assert(body?.success !== false, 'follow-up invoke ack success');
  const pid = body?.data?.promiseId;
  assert(typeof pid === 'string' && pid.length > 0, 'follow-up async promiseId');
  await recordServerPromise(pid);
  const terminal = await pollServerRequestResult(pid);
  assert(terminal, 'follow-up invoke poll did not return terminal');
  const data = terminal.data;
  assert(data?.status === 'completed', `follow-up invoke terminal: ${data?.status} ${JSON.stringify(data?.error)}`);
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

async function caseInvokeAsyncResponseEnvelope() {
  const invokeResult = await invokeDirect('Envelope probe');
  assert(invokeResult.success === true, 'invoke envelope success');
  const data = invokeResult.data;
  assert(data?.status === 'completed', `terminal status ${data?.status}`);
  assert(data.sync === undefined, 'no legacy data.sync');
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

/** @param {{ sessionId?: string }} [opts] */
async function caseAsyncEndpointAfterCreate(opts = {}) {
  const sessionId =
    opts.sessionId ?? (await createSession({ title: 'async probe' })).sessionId;
  const j = await fetchJson(`${CLIENT_API_URL}/api/a2a/sessions/${sessionId}/async`);
  assert(typeof j.asyncPending === 'boolean', 'expected asyncPending boolean');
}

/** GET /async when no in-flight promise — idle envelope (WEB_UI_PROTOCOL lifecycle). */
/** @param {{ sessionId?: string }} [opts] */
async function caseWaitingAsyncIdleEnvelope(opts = {}) {
  const sessionId =
    opts.sessionId ?? (await createSession({ title: 'async idle envelope' })).sessionId;
  const j = await fetchJson(`${CLIENT_API_URL}/api/a2a/sessions/${sessionId}/async`);
  assert(j.asyncPending === false, 'idle: asyncPending false');
  assert(j.completed === true, 'idle: completed true');
  assert(j.status === 'idle', 'idle: status idle');
  assert(j.execute === null || j.execute === undefined, 'idle: execute absent');
  assert(j.result === null || j.result === undefined, 'idle: result absent');
}

/** GET /sessions/:id public DTO — loader fields + no transport id (WEB_UI_PROTOCOL). */
/** @param {{ sessionId?: string }} [opts] */
async function caseWaitingGetSessionSchema(opts = {}) {
  const sessionId =
    opts.sessionId ?? (await createSession({ title: 'waiting GET session' })).sessionId;
  const body = await fetchJson(`${CLIENT_API_URL}/api/a2a/sessions/${sessionId}`);
  assertWaitingPublicSessionShape(unwrapPublicSession(body), 'GET session');
}

/** GET /sessions/:id/latest — nested session matches public loader schema. */
/** @param {{ sessionId?: string }} [opts] */
async function caseWaitingLatestSessionSchema(opts = {}) {
  const sessionId =
    opts.sessionId ?? (await createSession({ title: 'waiting latest' })).sessionId;
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
}

/**
 * Dialog /next → optional in-flight /async → settle → idle + GET session + legacy GET .../promise/:id.
 * Stack is async-only: if REQUIRE_ASYNC_PIPELINE=1, /next must report asyncPending for this probe.
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

  let promiseId = null;
  for (;;) {
    const r = await fetchWithRetry(
      `${CLIENT_API_URL}/api/a2a/sessions/${sessionId}?includeContext=1`
    );
    if (r.ok) {
      const j = await r.json();
      const s = j.session ?? j;
      if (typeof s?.promiseId === 'string' && s.promiseId.length > 0) {
        promiseId = s.promiseId;
        break;
      }
    }
    await sleep(50);
  }
  assert(promiseId, 'pipeline: promiseId (GET session ?includeContext=1 while in flight)');

  let sawInFlight = false;
  for (;;) {
    const r = await fetchWithRetry(`${CLIENT_API_URL}/api/a2a/sessions/${sessionId}/async`);
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

  const settled = await pollAsyncSettled(sessionId);
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
/** @param {{ sessionId?: string }} [opts] */
async function caseWaitingMessagesWithExecute(opts = {}) {
  const sessionId =
    opts.sessionId ?? (await createSession({ title: 'messages withExecute' })).sessionId;
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

/** @param {{ sessionId?: string }} [opts] */
async function caseSessionMessagesEndpoint(opts = {}) {
  const sessionId =
    opts.sessionId ?? (await createSession({ title: 'messages probe' })).sessionId;
  const j = await fetchJson(`${CLIENT_API_URL}/api/a2a/sessions/${sessionId}/messages`);
  assert(j.sessionId === sessionId, 'messages payload sessionId');
  assert(Array.isArray(j.messages), 'expected messages array');
  assert(typeof j.asyncPending === 'boolean', 'messages.asyncPending boolean');
  const mps = j.promiseStatus;
  assert(mps === null || typeof mps === 'string', 'messages.promiseStatus null|string');
  assert(typeof j.currentStep === 'number', 'messages.currentStep number');
}

/** @param {{ sessionId?: string }} [opts] */
async function caseNextResultMessageShape(opts = {}) {
  const sessionId =
    opts.sessionId ?? (await createSession({ title: 'result.message' })).sessionId;
  const ack = await sendNext(sessionId, { result: { message: 'typed result.message' } });
  assert(ack != null, 'next ack');
}

/** @param {{ sessionId?: string }} [opts] */
async function caseGetSessionIncludeContextDev(opts = {}) {
  const sessionId =
    opts.sessionId ?? (await createSession({ title: 'includeContext' })).sessionId;
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

/**
 * Full dialog contour with agent-seeded session: task direction → router (choices) → dialog → hello → thanks.
 * Mirrors tests/direct-tests/test-dialog-flow.ps1; uses GET /sessions + poll /async (WEB_UI_PROTOCOL).
 */
async function caseAgentModeDialogWorkflow() {
  const { sessionId } = await createSession({
    mode: 'agent',
    task: 'direct-tests agent dialog workflow',
    title: 'e2e agent dialog workflow',
  });
  assert(sessionId, 'session id');

  let pickedDialog = false;
  let postDialogTurns = 0;

  for (let i = 0; i < 18; i++) {
    let pub = unwrapPublicSession(await getSession(sessionId));
    if (pub.asyncPending) {
      await pollAsyncSettled(sessionId);
      pub = unwrapPublicSession(await getSession(sessionId));
    }
    assertWaitingPublicSessionShape(pub, `agentDialogWorkflow step ${i}`);
    const ex = pub.execute;
    if (ex && typeof ex === 'object') {
      assertWebUiExecuteProjection(ex, `agentDialogWorkflow execute ${i}`);
    }

    const form = ex?.form;
    const choices = getRouterFormChoiceArray(form);

    if (choices.length > 0) {
      assert(
        choices.some((c) => c && c.id === 'dialog'),
        'router form must include id dialog'
      );
      const ack = await sendNext(sessionId, { result: { choice: 'dialog' } });
      assert(ack?.success !== false, 'submit router choice dialog');
      if (ack.asyncPending) await pollAsyncSettled(sessionId);
      pickedDialog = true;
      continue;
    }

    if (hasWebFormTextEntry(form) && !choices?.length) {
      if (!pickedDialog) {
        const ack = await sendNext(sessionId, {
          result: { message: 'direct-tests: agent dialog routing probe' },
        });
        assert(ack?.success !== false, 'task direction /next');
        if (ack.asyncPending) await pollAsyncSettled(sessionId);
        continue;
      }
      if (postDialogTurns === 0) {
        const ack = await sendNext(sessionId, { result: { message: 'hello world' } });
        assert(ack?.success !== false, 'dialog hello world');
        if (ack.asyncPending) await pollAsyncSettled(sessionId);
        postDialogTurns = 1;
        continue;
      }
      if (postDialogTurns === 1) {
        const ack = await sendNext(sessionId, { result: { message: 'Thanks!' } });
        assert(ack?.success !== false, 'dialog Thanks');
        if (ack.asyncPending) await pollAsyncSettled(sessionId);
        postDialogTurns = 2;
        const fin = unwrapPublicSession(await getSession(sessionId));
        if (fin.asyncPending) await pollAsyncSettled(sessionId);
        const final = unwrapPublicSession(await getSession(sessionId));
        assertWaitingPublicSessionShape(final, 'agentDialogWorkflow final');
        if (final.execute && typeof final.execute === 'object') {
          assertWebUiExecuteProjection(final.execute, 'agentDialogWorkflow final execute');
        }
        assert(
          Array.isArray(final.messages) && final.messages.length >= 1,
          'expected non-empty messages[] on GET session after dialog turns'
        );
        assert(pickedDialog, 'expected router step with dialog choice');
        return;
      }
    }

    throw new Error(
      `agentDialogWorkflow: unhandled UI state step ${i} pickedDialog=${pickedDialog} postDialogTurns=${postDialogTurns}`
    );
  }

  throw new Error('agentDialogWorkflow: exceeded max iterations');
}

/**
 * After a valid router beat B (choice picked), the server must not show the same choice router again.
 * @param {{ label: string; choiceId: string; sessionCreateBody: Record<string, unknown>; submitRouterChoice: (sessionId: string, pick: string) => Promise<unknown> }} opts
 */
async function runRouterChoiceNoLoopCore(opts) {
  const { label, choiceId, sessionCreateBody, submitRouterChoice } = opts;
  const { sessionId } = await createSession(sessionCreateBody);
  assert(sessionId, 'session id');

  let submittedRouterChoice = false;

  for (let i = 0; i < 22; i++) {
    let pub = unwrapPublicSession(await getSession(sessionId));
    if (pub.asyncPending) {
      await pollAsyncSettled(sessionId);
      pub = unwrapPublicSession(await getSession(sessionId));
    }
    assertWaitingPublicSessionShape(pub, `${label} step ${i}`);
    const ex = pub.execute;
    if (ex && typeof ex === 'object') {
      assertWebUiExecuteProjection(ex, `${label} execute ${i}`);
    }

    const form = ex?.form;
    const choices = getRouterFormChoiceArray(form);

    if (choices.length > 0) {
      if (submittedRouterChoice) {
        throw new Error(
          `${label}: router loop — form.choices again after ${choiceId} choice; server stuck on router`
        );
      }
      const pick = choices.find((c) => c && c.id === choiceId)?.id;
      assert(pick, `${label}: choice id "${choiceId}" missing from router form`);
      const ack = await submitRouterChoice(sessionId, pick);
      assert(ack?.success !== false, `${label}: submit choice`);
      if (ack.asyncPending) await pollAsyncSettled(sessionId);
      submittedRouterChoice = true;
      continue;
    }

    if (hasWebFormTextEntry(form) && !choices?.length) {
      if (submittedRouterChoice) {
        return;
      }
      const ack = await sendNext(sessionId, {
        result: { message: `direct-tests: task direction (${label})` },
      });
      assert(ack?.success !== false, `${label}: task direction /next`);
      if (ack.asyncPending) await pollAsyncSettled(sessionId);
      continue;
    }

    if (submittedRouterChoice) {
      const full = await getSession(sessionId, { includeContext: true });
      if (full) {
        const u = unwrapPublicSession(full);
        const step = u.context?.execution?.step;
        const action = u.context?.execution?.action;
        if (step === 'router' && action === 'task') {
          throw new Error(
            `${label}: context.execution still task/router after choice (includeContext)`
          );
        }
      }
      return;
    }

    throw new Error(`${label}: unhandled UI state step ${i}`);
  }

  throw new Error(`${label}: exceeded max iterations`);
}

async function caseRouterAgentNoLoop() {
  await runRouterChoiceNoLoopCore({
    label: 'routerAgentNoLoop',
    choiceId: 'agent',
    sessionCreateBody: {
      mode: 'agent',
      task: 'direct-tests router agent no-loop',
      title: 'router agent no-loop',
    },
    submitRouterChoice: (sessionId, pick) =>
      sendNext(sessionId, { result: { choice: pick } }),
  });
}

/** Same as routerAgentNoLoop but uses top-level `task` as choice id (Client API shorthand). */
async function caseRouterAgentNoLoopTaskShorthand() {
  await runRouterChoiceNoLoopCore({
    label: 'routerAgentNoLoopTaskShorthand',
    choiceId: 'agent',
    sessionCreateBody: {
      mode: 'agent',
      task: 'direct-tests router agent no-loop (task shorthand choice)',
      title: 'router task shorthand',
    },
    submitRouterChoice: (sessionId, pick) => sendNext(sessionId, { task: pick }),
  });
}

/** UTF-8 task text on create — catches encoding/classification issues vs ASCII-only probe. */
async function caseRouterAgentNoLoopUtf8Task() {
  await runRouterChoiceNoLoopCore({
    label: 'routerAgentNoLoopUtf8Task',
    choiceId: 'agent',
    sessionCreateBody: {
      mode: 'agent',
      task: 'Тест українською: direct-tests router agent no-loop',
      title: 'router utf8 task',
    },
    submitRouterChoice: (sessionId, pick) =>
      sendNext(sessionId, { result: { choice: pick } }),
  });
}

async function caseRouterDialogNoLoop() {
  await runRouterChoiceNoLoopCore({
    label: 'routerDialogNoLoop',
    choiceId: 'dialog',
    sessionCreateBody: {
      mode: 'agent',
      task: 'direct-tests router dialog no-loop',
      title: 'router dialog no-loop',
    },
    submitRouterChoice: (sessionId, pick) =>
      sendNext(sessionId, { result: { choice: pick } }),
  });
}

async function caseRouterDialogNoLoopTaskShorthand() {
  await runRouterChoiceNoLoopCore({
    label: 'routerDialogNoLoopTaskShorthand',
    choiceId: 'dialog',
    sessionCreateBody: {
      mode: 'agent',
      task: 'direct-tests router dialog no-loop (task shorthand)',
      title: 'router dialog task shorthand',
    },
    submitRouterChoice: (sessionId, pick) => sendNext(sessionId, { task: pick }),
  });
}

/**
 * Sending explicit `result.message` while `form.choices` is non-empty must not silently
 * pick a pipeline — expect routing stage or choices to remain (wrong beat vs choice id).
 */
async function caseRouterWrongBeatMessage() {
  const { sessionId } = await createSession({
    mode: 'agent',
    task: 'direct-tests router wrong beat',
    title: 'router wrong beat',
  });
  assert(sessionId, 'session id');

  for (let i = 0; i < 20; i++) {
    let pub = unwrapPublicSession(await getSession(sessionId));
    if (pub.asyncPending) {
      await pollAsyncSettled(sessionId);
      pub = unwrapPublicSession(await getSession(sessionId));
    }
    assertWaitingPublicSessionShape(pub, `routerWrongBeat step ${i}`);
    const ex = pub.execute;
    if (ex && typeof ex === 'object') {
      assertWebUiExecuteProjection(ex, `routerWrongBeat execute ${i}`);
    }

    const form = ex?.form;
    const choices = getRouterFormChoiceArray(form);

    if (choices.length > 0) {
      const ack = await sendNext(sessionId, {
        result: {
          message:
            'direct-tests: explicit result.message while router choices present (wrong beat)',
        },
      });
      assert(ack?.success !== false, 'routerWrongBeat: wrong-beat /next');
      if (ack.asyncPending) await pollAsyncSettled(sessionId);
      const after = unwrapPublicSession(await getSession(sessionId));
      if (after.asyncPending) await pollAsyncSettled(sessionId);
      const settled = unwrapPublicSession(await getSession(sessionId));
      assertWaitingPublicSessionShape(settled, 'routerWrongBeat after wrong beat');
      const c2 = getRouterFormChoiceArray(settled.execute?.form);
      const stillRouting =
        settled.stage === 'routing' || c2.length > 0;
      assert(
        stillRouting,
        'routerWrongBeat: expected routing stage or form.choices after message-with-choices (wrong beat must not advance like choice)'
      );
      return;
    }

    if (hasWebFormTextEntry(form) && !choices?.length) {
      const ack = await sendNext(sessionId, {
        result: { message: 'direct-tests: task direction for wrong-beat probe' },
      });
      assert(ack?.success !== false, 'routerWrongBeat: task direction');
      if (ack.asyncPending) await pollAsyncSettled(sessionId);
      continue;
    }

    throw new Error(`routerWrongBeat: unhandled UI state step ${i}`);
  }

  throw new Error('routerWrongBeat: exceeded max iterations (never saw router choices)');
}

async function caseDialogSessionRoundTrip() {
  const { sessionId } = await createSession({
    context: { execution: { action: 'dialog', step: 'init' } },
  });
  assert(sessionId, 'session id');
  await sendNext(sessionId, { result: { message: 'Hi' } });
  await sleep(800);
  await pollAsyncSettled(sessionId);
  const body = await getSession(sessionId);
  const pub = unwrapPublicSession(body);
  assert(pub && typeof pub === 'object', 'GET /sessions/:id public DTO');
  assertWaitingPublicSessionShape(pub, 'dialog after settle');
  if (pub.execute && typeof pub.execute === 'object') {
    assertWebUiExecuteProjection(pub.execute, 'dialog Web DTO execute');
  }
  // Public DTO: slim context is task/projectId + optional execution slice (session-projection-dto.js).
  const slimCtx = pub.context;
  if (slimCtx && typeof slimCtx === 'object') {
    const extra = Object.keys(slimCtx).filter((k) => k !== 'task' && k !== 'projectId' && k !== 'execution');
    assert(
      extra.length === 0,
      `public context must be slim (task/projectId/execution only), got extra: ${extra.join(', ')}`
    );
  }
}

function hasCanonicalToolExecute(execute) {
  if (!execute || typeof execute !== 'object') return false;
  const keys = Object.keys(execute).filter((k) => !k.startsWith('_'));
  if (!keys.length) return false;
  return keys.some((k) =>
    ['read-file', 'list-directory', 'file-exists', 'rag-search', 'script'].includes(k)
  );
}

/** After mode:agent seed, first user text goes to router; pick agent before LLM / Gray Room probes. */
async function navigateThroughRouterToAgent(sessionId, label) {
  for (let i = 0; i < 22; i++) {
    let pub = unwrapPublicSession(await getSession(sessionId));
    if (pub.asyncPending) {
      await pollAsyncSettled(sessionId);
      pub = unwrapPublicSession(await getSession(sessionId));
    }
    const ex = pub.execute;
    const choices = getRouterFormChoiceArray(ex?.form);
    if (choices.length > 0) {
      const pick = choices.find((c) => c && c.id === 'agent')?.id;
      assert(pick, `${label}: router missing agent choice`);
      const ack = await sendNext(sessionId, { result: { choice: pick } });
      assert(ack?.success !== false, `${label}: router pick agent`);
      if (ack.asyncPending) await pollAsyncSettled(sessionId);
      return;
    }
    if (hasWebFormTextEntry(ex?.form) && !choices?.length) {
      const ack = await sendNext(sessionId, {
        result: { message: `${label}: task direction for router` },
      });
      assert(ack?.success !== false, `${label}: task direction`);
      if (ack.asyncPending) await pollAsyncSettled(sessionId);
      continue;
    }
    return;
  }
  throw new Error(`${label}: navigateThroughRouterToAgent exceeded max iterations`);
}

/** Gray room slot can lag session persistence after async settle (storage/index); poll briefly. */
async function pollGrayRoomSlotVisible(sessionId, label, maxWaitMs = 20000, stepMs = 400) {
  const deadline = Date.now() + maxWaitMs;
  let lastErr;
  while (Date.now() < deadline) {
    const full = await getSession(sessionId, { includeContext: true });
    try {
      assertGrayRoomSlot(full, label);
      return full;
    } catch (e) {
      lastErr = e;
      await sleep(stepMs);
    }
  }
  throw lastErr ?? new Error(`${label}: grayRoom slot not visible within ${maxWaitMs}ms`);
}

/** Raw tool keys must not appear on GET /sessions/:id Web DTO (WEB_UI_PROTOCOL execute projection). */
function assertNoRawToolKeysOnWebExecute(execute, label) {
  if (!execute || typeof execute !== 'object') return;
  const raw = [
    'read-file',
    'write-file',
    'list-directory',
    'rag-search',
    'script',
    'execute-command',
    'grep-search',
    'file-exists',
    'edit-patch',
    'run-script',
  ];
  const hit = raw.filter((k) => Object.prototype.hasOwnProperty.call(execute, k));
  assert(hit.length === 0, `${label}: Web DTO must not expose raw tool keys: ${hit.join(', ')}`);
}

async function caseRedAndGrayRoomCycle() {
  const { sessionId } = await createSession({ mode: 'agent', task: 'Red/Gray room coverage test' });
  assert(sessionId, 'session id');

  await navigateThroughRouterToAgent(sessionId, 'redGrayRoom');

  const fullProbe = await getSession(sessionId, { includeContext: true });
  if (fullProbe == null) {
    console.warn('[redGrayRoom] skip: GET ?includeContext=1 returned 403 (production?)');
    return;
  }

  const promptText =
    'You must emit a client tool step. Prefer read-file: use action read-file with path README.md at repo root (relative path README.md).';

  let redExecute;
  for (let attempt = 0; attempt < E2E_RED_GRAY_ATTEMPTS; attempt++) {
    const ack = await sendNext(sessionId, { result: { message: promptText } });
    assert(ack?.accepted === true, 'red-gray room: /next accepted');

    const settled = await pollAsyncSettled(sessionId);
    assert(settled, 'red-gray room: first settle');

    const full = await pollGrayRoomSlotVisible(sessionId, 'after first settle');

    const executeObj = full.execute;
    if (hasCanonicalToolExecute(executeObj)) {
      redExecute = executeObj;
      break;
    }
    await sleep(400);
  }

  assert(redExecute, 'red-gray room: no tool execute observed after attempts');

  await performRedRoomClientExecute(sessionId, redExecute);

  const fullAfterRed = await pollGrayRoomSlotVisible(sessionId, 'after red room', 15000);

  const pub = unwrapPublicSession(await getSession(sessionId));
  assertNoRawToolKeysOnWebExecute(pub.execute, 'after red room hydrate');
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

/** @param {{ sessionId?: string }} [opts] */
async function caseNextTaskShorthand(opts = {}) {
  const sessionId =
    opts.sessionId ?? (await createSession({ title: 'Shorthand', task: 'ping' })).sessionId;
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

/** Single invoke + poll: envelope + hello + single-key execute (merge flags). */
async function caseMergedInvokeHelloEnvelopeShape() {
  const invokeResult = await invokeDirect('Hello');
  assert(invokeResult.success === true, 'invoke envelope success');
  assert(invokeResult.success !== false, 'invoke should not report success=false');
  const data = invokeResult.data;
  assert(data?.status === 'completed', `terminal status ${data?.status}`);
  assert(data.sync === undefined, 'no legacy data.sync');
  assert(
    data.execute !== undefined || data.message !== undefined || data.context !== undefined,
    'data has execute, message, or context'
  );
  if (data?.execute) {
    assertSingleActionKey(data.execute, 'invoke data.execute');
  }
  if (data?.result) {
    assertSingleActionKey(data.result, 'invoke data.result');
  }
  if (data.execute && typeof data.execute === 'object') {
    const keys = Object.keys(data.execute).filter((k) => !k.startsWith('_'));
    assert(keys.length === 1, `execute must have exactly one key, got: ${keys.join(',')}`);
  }
}

/** One Client API session: async/idle/GET/latest/messages/includeContext + two /next shapes. */
async function caseMergedClientSessionSchema() {
  const { sessionId } = await createSession({
    title: 'merged client API schema',
    task: 'ping',
  });
  assert(sessionId, 'session id');
  const o = { sessionId };
  await caseAsyncEndpointAfterCreate(o);
  await caseWaitingAsyncIdleEnvelope(o);
  await caseWaitingGetSessionSchema(o);
  await caseWaitingLatestSessionSchema(o);
  await caseWaitingMessagesWithExecute(o);
  await caseSessionMessagesEndpoint(o);
  await caseGetSessionIncludeContextDev(o);
  await caseNextResultMessageShape(o);
  await caseNextTaskShorthand(o);
}

function collectMergeFlags() {
  const low = process.env.E2E_DIRECT_LOW_LLM === '1';
  return {
    mergeInvoke: low || process.env.E2E_DIRECT_MERGE_INVOKE === '1',
    mergeClientSessionSchema:
      low || process.env.E2E_DIRECT_MERGE_CLIENT_SESSION_SCHEMA === '1',
  };
}

/** @param {string[] | null} only */
function buildEffectiveOrder(only) {
  if (only && only.length) return only;
  const { mergeInvoke, mergeClientSessionSchema } = collectMergeFlags();
  let order = [...DEFAULT_ORDER];
  if (mergeInvoke) {
    const drop = new Set(['invokeAsyncEnvelope', 'invokeHello', 'invokeSyncShape']);
    order = order.filter((id) => !drop.has(id));
    const afterCtx = order.indexOf('invokeContextFollowup');
    const ins = afterCtx >= 0 ? afterCtx + 1 : 0;
    order.splice(ins, 0, 'mergedInvokeHelloEnvelopeShape');
  }
  if (mergeClientSessionSchema) {
    const drop = new Set([
      'asyncAfterCreate',
      'waitingAsyncIdle',
      'waitingGetSession',
      'waitingLatest',
      'waitingMessagesExecute',
      'sessionMessages',
      'getSessionIncludeContext',
      'nextResultMessage',
      'nextTaskShorthand',
    ]);
    order = order.filter((id) => !drop.has(id));
    const anchor = order.indexOf('waitingNextAck');
    const ins = anchor >= 0 ? anchor : 0;
    order.splice(ins, 0, 'mergedClientSessionSchema');
  }
  return order;
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
    desc: 'POST /invoke context+execution only (async + poll /requests/:id/result)',
    run: caseInvokeContextFollowupShape,
  },
  invokeAsyncEnvelope: {
    name: 'invokeAsyncEnvelope',
    desc: 'POST /invoke → promiseId + poll: payload fields on terminal data',
    run: caseInvokeAsyncResponseEnvelope,
  },
  mergedInvokeHelloEnvelopeShape: {
    name: 'mergedInvokeHelloEnvelopeShape',
    desc: 'single invoke: envelope + hello + execute single-key (merge flags)',
    run: caseMergedInvokeHelloEnvelopeShape,
  },
  clientSessionsList: {
    name: 'clientSessionsList',
    desc: 'GET /api/a2a/sessions',
    run: caseClientSessionsList,
  },
  invokeHello: { name: 'invokeHello', desc: 'POST invoke + poll: optional execute shape', run: caseInvokeHello },
  invokeSyncShape: {
    name: 'invokeSyncShape',
    desc: 'POST /invoke + poll: execute has exactly one action key (registry id legacy)',
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
  agentDialogWorkflow: {
    name: 'agentDialogWorkflow',
    desc: 'mode:agent → router → dialog → hello → thanks (full Client API chain)',
    run: caseAgentModeDialogWorkflow,
  },
  routerAgentNoLoop: {
    name: 'routerAgentNoLoop',
    desc: 'router → result.choice(agent); must not return form.choices again (sticky router)',
    run: caseRouterAgentNoLoop,
  },
  routerWrongBeatMessage: {
    name: 'routerWrongBeatMessage',
    desc: 'with form.choices, result.message must not advance like choice (stay routing)',
    run: caseRouterWrongBeatMessage,
  },
  routerAgentNoLoopTaskShorthand: {
    name: 'routerAgentNoLoopTaskShorthand',
    desc: 'sticky router probe via top-level /next { task: agent } (not result.choice)',
    run: caseRouterAgentNoLoopTaskShorthand,
  },
  routerAgentNoLoopUtf8Task: {
    name: 'routerAgentNoLoopUtf8Task',
    desc: 'sticky router probe with Cyrillic task on session create (UTF-8)',
    run: caseRouterAgentNoLoopUtf8Task,
  },
  routerDialogNoLoop: {
    name: 'routerDialogNoLoop',
    desc: 'router → result.choice(dialog); must not return same form.choices (sticky router)',
    run: caseRouterDialogNoLoop,
  },
  routerDialogNoLoopTaskShorthand: {
    name: 'routerDialogNoLoopTaskShorthand',
    desc: 'sticky router probe for dialog via top-level /next { task: dialog }',
    run: caseRouterDialogNoLoopTaskShorthand,
  },
  nextTaskShorthand: {
    name: 'nextTaskShorthand',
    desc: '/next with top-level task shorthand',
    run: caseNextTaskShorthand,
  },
  mergedClientSessionSchema: {
    name: 'mergedClientSessionSchema',
    desc: 'one session: async+idle+GET+messages+includeContext+result.message+task shorthand',
    run: caseMergedClientSessionSchema,
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
  'invokeAsyncEnvelope',
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
  'routerAgentNoLoop',
  'routerAgentNoLoopTaskShorthand',
  'routerAgentNoLoopUtf8Task',
  'routerDialogNoLoop',
  'routerDialogNoLoopTaskShorthand',
  'routerWrongBeatMessage',
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

  const order = buildEffectiveOrder(only);
  const unknown = order.filter((id) => !CASE_REGISTRY[id]);
  if (unknown.length) {
    console.error('Unknown case(s):', unknown.join(', '));
    console.error('Use --list');
    process.exit(1);
  }

  const flags = collectMergeFlags();
  if (flags.mergeInvoke || flags.mergeClientSessionSchema) {
    console.log(
      '[e2e-dialog-test] merge:',
      [
        flags.mergeInvoke && 'invoke(3→1)',
        flags.mergeClientSessionSchema && 'client-session-schema(9→1)',
      ]
        .filter(Boolean)
        .join(', ')
    );
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
    if (E2E_CASE_COOLDOWN_MS > 0) {
      await sleep(E2E_CASE_COOLDOWN_MS);
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
