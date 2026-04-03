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
 * Full agent-mode dialog chain: node …/e2e-dialog-test.js --only=agentDialogWorkflow
 * (mode:agent → router → choice dialog → hello → thanks; mirrors test-dialog-flow.ps1, uses /async poll).
 * Router regression: --only=routerAgentNoLoop,routerAgentNoLoopTaskShorthand,routerAgentNoLoopUtf8Task,routerDialogNoLoop,routerDialogNoLoopTaskShorthand,routerWrongBeatMessage
 *
 * Web dialog projection (normative): a2a-client/docs/WEB_UI_PROTOCOL.md — GET /sessions/:id uses
 * toPublicSession(): projected execute (message / llmMessage / form / attachments), no raw tool keys;
 * optional slim context { task, projectId } from session-projection-dto.js; full context only with
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
} from './lib/a2a-schema-guards.mjs';
import {recordClientSession, recordServerPromise} from './artifacts-registry.js';

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
  if (sessionId) {
    await recordClientSession(sessionId);
  }
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
  const ack = await response.json();
  if (ack && typeof ack === 'object' && ack.promiseId) {
    await recordServerPromise(ack.promiseId);
  }
  return ack;
}

async function getSession(sessionId, opts = {}) {
  const q = opts.includeContext ? '?includeContext=1' : '';
  const response = await fetch(`${CLIENT_API_URL}/api/a2a/sessions/${sessionId}${q}`);
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
      await pollAsyncSettled(sessionId, 120_000);
      pub = unwrapPublicSession(await getSession(sessionId));
    }
    assertWaitingPublicSessionShape(pub, `agentDialogWorkflow step ${i}`);
    const ex = pub.execute;
    if (ex && typeof ex === 'object') {
      assertWebUiExecuteProjection(ex, `agentDialogWorkflow execute ${i}`);
    }

    const form = ex?.form;
    const choices = form?.choices;
    const inputs = form?.input;

    if (Array.isArray(choices) && choices.length > 0) {
      assert(
        choices.some((c) => c && c.id === 'dialog'),
        'router form must include id dialog'
      );
      const ack = await sendNext(sessionId, { result: { choice: 'dialog' } });
      assert(ack?.success !== false, 'submit router choice dialog');
      if (ack.asyncPending) await pollAsyncSettled(sessionId, 120_000);
      pickedDialog = true;
      continue;
    }

    if (Array.isArray(inputs) && inputs.length > 0 && !choices?.length) {
      if (!pickedDialog) {
        const ack = await sendNext(sessionId, {
          result: { message: 'direct-tests: agent dialog routing probe' },
        });
        assert(ack?.success !== false, 'task direction /next');
        if (ack.asyncPending) await pollAsyncSettled(sessionId, 120_000);
        continue;
      }
      if (postDialogTurns === 0) {
        const ack = await sendNext(sessionId, { result: { message: 'hello world' } });
        assert(ack?.success !== false, 'dialog hello world');
        if (ack.asyncPending) await pollAsyncSettled(sessionId, 120_000);
        postDialogTurns = 1;
        continue;
      }
      if (postDialogTurns === 1) {
        const ack = await sendNext(sessionId, { result: { message: 'Thanks!' } });
        assert(ack?.success !== false, 'dialog Thanks');
        if (ack.asyncPending) await pollAsyncSettled(sessionId, 120_000);
        postDialogTurns = 2;
        const fin = unwrapPublicSession(await getSession(sessionId));
        if (fin.asyncPending) await pollAsyncSettled(sessionId, 120_000);
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
      await pollAsyncSettled(sessionId, 120_000);
      pub = unwrapPublicSession(await getSession(sessionId));
    }
    assertWaitingPublicSessionShape(pub, `${label} step ${i}`);
    const ex = pub.execute;
    if (ex && typeof ex === 'object') {
      assertWebUiExecuteProjection(ex, `${label} execute ${i}`);
    }

    const form = ex?.form;
    const choices = form?.choices;
    const inputs = form?.input;

    if (Array.isArray(choices) && choices.length > 0) {
      if (submittedRouterChoice) {
        throw new Error(
          `${label}: router loop — form.choices again after ${choiceId} choice; server stuck on router`
        );
      }
      const pick = choices.find((c) => c && c.id === choiceId)?.id;
      assert(pick, `${label}: choice id "${choiceId}" missing from router form`);
      const ack = await submitRouterChoice(sessionId, pick);
      assert(ack?.success !== false, `${label}: submit choice`);
      if (ack.asyncPending) await pollAsyncSettled(sessionId, 120_000);
      submittedRouterChoice = true;
      continue;
    }

    if (Array.isArray(inputs) && inputs.length > 0 && !choices?.length) {
      if (submittedRouterChoice) {
        return;
      }
      const ack = await sendNext(sessionId, {
        result: { message: `direct-tests: task direction (${label})` },
      });
      assert(ack?.success !== false, `${label}: task direction /next`);
      if (ack.asyncPending) await pollAsyncSettled(sessionId, 120_000);
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
      await pollAsyncSettled(sessionId, 120_000);
      pub = unwrapPublicSession(await getSession(sessionId));
    }
    assertWaitingPublicSessionShape(pub, `routerWrongBeat step ${i}`);
    const ex = pub.execute;
    if (ex && typeof ex === 'object') {
      assertWebUiExecuteProjection(ex, `routerWrongBeat execute ${i}`);
    }

    const form = ex?.form;
    const choices = form?.choices;
    const inputs = form?.input;

    if (Array.isArray(choices) && choices.length > 0) {
      const ack = await sendNext(sessionId, {
        result: {
          message:
            'direct-tests: explicit result.message while router choices present (wrong beat)',
        },
      });
      assert(ack?.success !== false, 'routerWrongBeat: wrong-beat /next');
      if (ack.asyncPending) await pollAsyncSettled(sessionId, 120_000);
      const after = unwrapPublicSession(await getSession(sessionId));
      if (after.asyncPending) await pollAsyncSettled(sessionId, 120_000);
      const settled = unwrapPublicSession(await getSession(sessionId));
      assertWaitingPublicSessionShape(settled, 'routerWrongBeat after wrong beat');
      const c2 = settled.execute?.form?.choices;
      const stillRouting =
        settled.stage === 'routing' ||
        (Array.isArray(c2) && c2.length > 0);
      assert(
        stillRouting,
        'routerWrongBeat: expected routing stage or form.choices after message-with-choices (wrong beat must not advance like choice)'
      );
      return;
    }

    if (Array.isArray(inputs) && inputs.length > 0 && !choices?.length) {
      const ack = await sendNext(sessionId, {
        result: { message: 'direct-tests: task direction for wrong-beat probe' },
      });
      assert(ack?.success !== false, 'routerWrongBeat: task direction');
      if (ack.asyncPending) await pollAsyncSettled(sessionId, 120_000);
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
  await pollAsyncSettled(sessionId, 60_000);
  const body = await getSession(sessionId);
  const pub = unwrapPublicSession(body);
  assert(pub && typeof pub === 'object', 'GET /sessions/:id public DTO');
  assertWaitingPublicSessionShape(pub, 'dialog after settle');
  if (pub.execute && typeof pub.execute === 'object') {
    assertWebUiExecuteProjection(pub.execute, 'dialog Web DTO execute');
  }
  // Public DTO: no full context unless ?includeContext=1; when present, only task/projectId (session-projection-dto.js).
  const slimCtx = pub.context;
  if (slimCtx && typeof slimCtx === 'object') {
    const extra = Object.keys(slimCtx).filter((k) => k !== 'task' && k !== 'projectId');
    assert(
      extra.length === 0,
      `public context must be slim (task/projectId only), got extra: ${extra.join(', ')}`
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
      await pollAsyncSettled(sessionId, 120_000);
      pub = unwrapPublicSession(await getSession(sessionId));
    }
    const ex = pub.execute;
    const choices = ex?.form?.choices;
    const inputs = ex?.form?.input;
    if (Array.isArray(choices) && choices.length > 0) {
      const pick = choices.find((c) => c && c.id === 'agent')?.id;
      assert(pick, `${label}: router missing agent choice`);
      const ack = await sendNext(sessionId, { result: { choice: pick } });
      assert(ack?.success !== false, `${label}: router pick agent`);
      if (ack.asyncPending) await pollAsyncSettled(sessionId, 120_000);
      return;
    }
    if (Array.isArray(inputs) && inputs.length > 0 && !choices?.length) {
      const ack = await sendNext(sessionId, {
        result: { message: `${label}: task direction for router` },
      });
      assert(ack?.success !== false, `${label}: task direction`);
      if (ack.asyncPending) await pollAsyncSettled(sessionId, 120_000);
      continue;
    }
    return;
  }
  throw new Error(`${label}: navigateThroughRouterToAgent exceeded max iterations`);
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
    'Please start a tool execution for a file operation. For example: execute {"read-file":{"path":"README.md"}}.';

  let redExecute;
  for (let attempt = 0; attempt < 3; attempt++) {
    const ack = await sendNext(sessionId, { result: { message: promptText } });
    assert(ack?.accepted === true, 'red-gray room: /next accepted');

    const settled = await pollAsyncSettled(sessionId, 120_000);
    assert(settled, 'red-gray room: first settle');

    const full = await getSession(sessionId, { includeContext: true });
    assert(full, 'red-gray room: full session (includeContext)');
    assertGrayRoomSlot(full, 'after first settle');

    const executeObj = full.execute;
    if (hasCanonicalToolExecute(executeObj)) {
      redExecute = executeObj;
      break;
    }
  }

  assert(redExecute, 'red-gray room: no tool execute observed after attempts');

  await performRedRoomClientExecute(sessionId, redExecute);

  const fullAfterRed = await getSession(sessionId, { includeContext: true });
  assert(fullAfterRed, 'red-gray room: full session after red');
  assertGrayRoomSlot(fullAfterRed, 'after red room');

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
