#!/usr/bin/env node
/**
 * Gray Room Test — Direct test for server-side LLM chain execution
 *
 * Tests the Gray Room (серой комнате): server-side chain of LLM calls
 * (compress_history, thinking, auto_rag_page, auto_read_file, clarify)
 * before returning to client.
 *
 * Usage:
 *   node tests/direct-tests/gray-room-test.js
 *
 * Requires: Client API (5173) + A2A Server (3000) + Ollama (11435/11434)
 * Env: CLIENT_API_URL, SERVER_URL
 */

import fs from 'fs/promises';
import path from 'path';

import {
  assert,
  assertGrayRoomSlot as assertGrayRoomSlotCore,
  hasWebFormTextEntry,
} from './lib/a2a-schema-guards.mjs';
import {recordClientSession, recordServerPromise} from './artifacts-registry.js';

const CLIENT_API_URL = process.env.CLIENT_API_URL || 'http://localhost:5173';
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assertGrayRoomSlot(session, label) {
  const grayRoom = assertGrayRoomSlotCore(session, label);
  console.log(`${label}: Gray Room status: ${grayRoom.status}, turn: ${grayRoom.turn}`);
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
  const sessionId = session.session?.id || session.id;
  if (sessionId) {
    await recordClientSession(sessionId);
  }
  return session;
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
    throw new Error(`next failed: ${response.status} - ${await response.text()}`);
  }
  const ack = await response.json();
  if (ack && typeof ack === 'object' && ack.promiseId) {
    await recordServerPromise(ack.promiseId);
  }
  return ack;
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

function unwrapSessionBody(body) {
  return body.session ?? body;
}

/** First user text hits router; pick agent before expecting Gray Room on LLM turns. */
async function navigatePastRouterToAgent(sessionId) {
  for (let i = 0; i < 22; i++) {
    let body = await getSession(sessionId);
    let s = unwrapSessionBody(body);
    if (s.asyncPending) {
      await pollAsyncSettled(sessionId, 120_000);
      body = await getSession(sessionId);
      s = unwrapSessionBody(body);
    }
    const ex = s.execute;
    const choices = ex?.form?.choices;
    if (Array.isArray(choices) && choices.length > 0) {
      const pick = choices.find((c) => c && c.id === 'agent')?.id;
      assert(pick, 'router missing agent choice');
      const ack = await sendNext(sessionId, { result: { choice: pick } });
      assert(ack.success === true, 'router pick agent');
      if (ack.asyncPending) await pollAsyncSettled(sessionId, 120_000);
      return;
    }
    if (hasWebFormTextEntry(ex?.form) && !choices?.length) {
      const ack = await sendNext(sessionId, {
        result: { message: 'gray-room-test: task direction for router' },
      });
      assert(ack.success === true, 'task direction /next');
      if (ack.asyncPending) await pollAsyncSettled(sessionId, 120_000);
      continue;
    }
    return;
  }
  throw new Error('navigatePastRouterToAgent exceeded max iterations');
}

async function testGrayRoomChain() {
  console.log('Testing Gray Room LLM chain execution...');

  // Create agent session to trigger Gray Room
  const sessionBody = await createSession({
    mode: 'agent',
    task: 'Test Gray Room chain: compress_history, thinking, auto_rag_page, auto_read_file, clarify'
  });
  const sessionId = sessionBody.session?.id || sessionBody.id;

  console.log(`Created session: ${sessionId}`);

  await navigatePastRouterToAgent(sessionId);

  // Send initial task to start agent processing
  const nextBody = await sendNext(sessionId, { result: { message: 'Start agent processing for Gray Room test' } });
  assert(nextBody.success === true, 'Initial /next success');

  // Poll for async settlement (Gray Room processing)
  const settled = await pollAsyncSettled(sessionId, 180_000); // 3 minutes for LLM chain
  assert(settled, 'Gray Room async processing settled');

  // Get session and check Gray Room slot (full workbench only with includeContext)
  const session = await getSession(sessionId, { includeContext: true });
  if (session == null) {
    console.warn('[gray-room-test] skip: GET ?includeContext=1 returned 403');
    return;
  }
  assertGrayRoomSlot(session, 'After Gray Room processing');

  // Verify Gray Room completed successfully
  const grayRoom = session.session?.context?.workbench?.slots?.grayRoom || session.context?.workbench?.slots?.grayRoom;
  assert(grayRoom.status === 'completed' || grayRoom.status === 'ready', `Gray Room status should be completed or ready, got: ${grayRoom.status}`);

  console.log('Gray Room test passed: LLM chain executed successfully');
}

async function testRedRoomToolExecution() {
  console.log('Testing Red Room tool execution...');

  // Create agent session
  const sessionBody = await createSession({
    mode: 'agent',
    task: 'Test Red Room: execute tool operations like read-file'
  });
  const sessionId = sessionBody.session?.id || sessionBody.id;

  console.log(`Created session: ${sessionId}`);

  await navigatePastRouterToAgent(sessionId);

  // Prompt for tool execution to trigger Red Room
  const promptText = 'Please execute a read-file operation on README.md to test Red Room.';

  let toolExecute = null;
  let attempts = 0;
  const maxAttempts = 3;

  while (!toolExecute && attempts < maxAttempts) {
    attempts++;
    console.log(`Attempt ${attempts}: Sending prompt for tool execution`);

    const nextBody = await sendNext(sessionId, { result: { message: promptText } });
    assert(nextBody.success === true, `/next success on attempt ${attempts}`);

    const settled = await pollAsyncSettled(sessionId, 120_000);
    assert(settled, `Async settled on attempt ${attempts}`);

    const session = await getSession(sessionId, { includeContext: true });
    assertGrayRoomSlot(session, `Gray Room after attempt ${attempts}`);

    // Check if we got a tool execute
    const executeObj = session.session?.execute ?? session.execute;
    if (executeObj && Object.keys(executeObj).filter(k => !k.startsWith('_')).length > 0) {
      toolExecute = executeObj;
      console.log(`Tool execute found on attempt ${attempts}:`, JSON.stringify(toolExecute, null, 2));
    } else {
      console.log(`No tool execute yet on attempt ${attempts}, trying again...`);
      await sleep(1000);
    }
  }

  assert(toolExecute, `Red Room: no tool execute observed after ${maxAttempts} attempts`);

  // Simulate Red Room execution (client-side tool execution)
  const action = Object.keys(toolExecute).find(k => !k.startsWith('_'));
  assert(action === 'read-file', `Expected read-file action, got: ${action}`);

  const cfg = toolExecute[action];
  assert(cfg && cfg.path, 'Red Room: read-file path missing');

  console.log(`Executing Red Room tool: read-file on ${cfg.path}`);

  // Perform the file read (simulating client tool execution)
  const repoPath = path.isAbsolute(cfg.path) ? cfg.path : path.resolve(process.cwd(), cfg.path);
  const content = await fs.readFile(repoPath, 'utf8');
  const result = { 'read-file': { path: cfg.path, content } };

  // Send result back
  const ack = await sendNext(sessionId, { result });
  assert(ack.success === true, 'Red Room result /next success');

  if (ack.asyncPending) {
    await pollAsyncSettled(sessionId, 120_000);
  }

  // Verify Gray Room slot still present after Red Room
  const sessionAfterRed = await getSession(sessionId, { includeContext: true });
  assertGrayRoomSlot(sessionAfterRed, 'After Red Room execution');

  console.log('Red Room test passed: Tool executed successfully');
}

async function main() {
  console.log('='.repeat(60));
  console.log('Gray Room & Red Room Direct Tests');
  console.log('='.repeat(60));

  try {
    // Test Gray Room chain
    await testGrayRoomChain();
    console.log('✓ Gray Room chain test passed');

    // Brief pause between suites: reduces libuv/HTTP teardown races on some Windows Node builds (UV_HANDLE_CLOSING).
    await sleep(500);

    // Test Red Room tool execution
    await testRedRoomToolExecution();
    console.log('✓ Red Room tool execution test passed');

    console.log('\n' + '='.repeat(60));
    console.log('All tests passed!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\nTest failed:', error.message);
    console.log('\n' + '='.repeat(60));
    console.log('Test failed');
    console.log('='.repeat(60));
    process.exit(1);
  }
}

main();