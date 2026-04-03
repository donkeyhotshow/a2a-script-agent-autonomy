/**
 * Shared helpers for router choice transition checks (sync invoke against a2a-server).
 * Used by Vitest (`router-choice-transition.test.mjs`) and the CLI runner
 * (`router-choice-transition-run.mjs`).
 */

import { strict as assert } from 'assert';

export const A2A_SERVER_URL = process.env.A2A_SERVER_URL || 'http://localhost:3000';

export async function invoke(payload) {
  const res = await fetch(`${A2A_SERVER_URL}/api/v1/invoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  let envelope;
  try {
    envelope = await res.json();
  } catch {
    envelope = null;
  }
  const data = envelope && typeof envelope === 'object' ? envelope.data : undefined;
  return { status: res.status, envelope, data };
}

export function isRouterForm(execute) {
  if (!execute || typeof execute !== 'object') return false;
  const form = execute.form;
  if (!form || typeof form !== 'object') return false;
  const choices = form.choices;
  return (
    Array.isArray(choices) &&
    choices.length > 0 &&
    choices.some((c) => ['dialog', 'agent', 'task-decomposition'].includes(c?.id))
  );
}

export async function pingA2AServerHealth(timeoutMs = 800) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${A2A_SERVER_URL}/health`, { signal: ctrl.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

export async function testRouterTransition() {
  const sessionId = `test_sess_${Date.now()}`;

  const initialPayload = {
    task: 'test task',
    context: {
      session_id: sessionId,
      execution: { action: 'task', step: 'router' },
    },
    sync: true,
  };

  const initialRes = await invoke(initialPayload);
  assert(initialRes.status === 200, `Expected 200, got ${initialRes.status}`);
  assert(initialRes.envelope?.success !== false, 'Expected invoke envelope success');
  assert(initialRes.data?.execute, 'Expected execute in response');
  assert(isRouterForm(initialRes.data.execute), 'Expected router form in initial response');

  const choicePayload = {
    context: {
      session_id: sessionId,
      execution: { action: 'task', step: 'router' },
    },
    result: { choice: 'dialog' },
    sync: true,
  };

  const choiceRes = await invoke(choicePayload);
  assert(choiceRes.status === 200, `Expected 200, got ${choiceRes.status}`);
  assert(choiceRes.envelope?.success !== false, 'Expected invoke envelope success');

  const resultData = choiceRes.data;
  assert(resultData, 'Expected data in response');

  if (isRouterForm(resultData.execute)) {
    throw new Error(
      `BUG: Server re-emitted router form after choice submission. ` +
        `Expected transition to dialog mode, but got router form. ` +
        `Context: ${JSON.stringify(resultData.context, null, 2)}`
    );
  }

  const exec = resultData.context?.execution;
  assert(exec, 'Expected execution in context');
  assert(exec.action === 'dialog', `Expected action="dialog", got "${exec.action}"`);
  assert(exec.step !== 'router', `Expected step to change from "router", got "${exec.step}"`);

  const execute = resultData.execute;
  assert(execute, 'Expected execute in response');
  assert(!isRouterForm(execute), 'Execute should not be router form after choice');
}

export async function testAgentChoice() {
  const sessionId = `test_sess_${Date.now()}_agent`;

  const choicePayload = {
    context: {
      session_id: sessionId,
      execution: { action: 'task', step: 'router' },
    },
    result: { choice: 'agent' },
    sync: true,
  };

  const choiceRes = await invoke(choicePayload);
  assert(choiceRes.status === 200, `Expected 200, got ${choiceRes.status}`);
  assert(choiceRes.envelope?.success !== false, 'Expected invoke envelope success');

  const resultData = choiceRes.data;
  assert(resultData, 'Expected data in response');

  if (isRouterForm(resultData.execute)) {
    throw new Error('BUG: Server re-emitted router form after agent choice');
  }

  const exec = resultData.context?.execution;
  assert(exec?.action === 'agent', `Expected action="agent", got "${exec?.action}"`);
}

export async function testTaskDecompositionChoice() {
  const sessionId = `test_sess_${Date.now()}_decomp`;

  const choicePayload = {
    context: {
      session_id: sessionId,
      execution: { action: 'task', step: 'router' },
    },
    result: { choice: 'task-decomposition' },
    sync: true,
  };

  const choiceRes = await invoke(choicePayload);
  assert(choiceRes.status === 200, `Expected 200, got ${choiceRes.status}`);
  assert(choiceRes.envelope?.success !== false, 'Expected invoke envelope success');

  const resultData = choiceRes.data;
  assert(resultData, 'Expected data in response');

  if (isRouterForm(resultData.execute)) {
    throw new Error('BUG: Server re-emitted router form after task-decomposition choice');
  }

  const exec = resultData.context?.execution;
  assert(
    exec?.action === 'task-decomposition',
    `Expected action="task-decomposition", got "${exec?.action}"`
  );
}
