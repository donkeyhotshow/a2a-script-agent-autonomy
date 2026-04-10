import Ajv from 'ajv';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SERVER_INVOKE_REQUEST_SCHEMA_PATH = join(
  __dirname,
  '../../docs/new-request-flow/json-schemas/server-invoke-request.schema.json'
);

const ajv = new Ajv({ strict: false, allErrors: true, validateFormats: false });
const schema = JSON.parse(readFileSync(SERVER_INVOKE_REQUEST_SCHEMA_PATH, 'utf-8'));
export const validateServerInvokeRequest = ajv.compile(schema);

export const A2A_SERVER_URL = process.env.A2A_SERVER_URL || 'http://127.0.0.1:3000';

export function isRouterForm(execute) {
  if (!execute || typeof execute !== 'object') return false;
  const form = execute.form;
  if (!form || typeof form !== 'object') return false;
  const choices = form.choices;
  return (
    Array.isArray(choices) &&
    choices.length > 0 &&
    choices.some((c) => typeof c?.id === 'string')
  );
}

export async function invokeRaw(payload) {
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

/** Poll GET …/requests/:id/result until terminal (async-only invoke). No wall-clock cap (promiseId contract). */
export async function pollInvokeTerminal(promiseId, stepMs = 50) {
  const url = `${A2A_SERVER_URL}/api/v1/requests/${encodeURIComponent(promiseId)}/result`;
  for (;;) {
    const r = await fetch(url);
    if (!r.ok) {
      await new Promise((res) => setTimeout(res, stepMs));
      continue;
    }
    const wrap = await r.json();
    const st = wrap?.data?.status;
    if (st === 'completed' || st === 'failed' || st === 'cancelled') {
      return { envelope: wrap, data: wrap.data };
    }
    await new Promise((res) => setTimeout(res, stepMs));
  }
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

/**
 * Scripted router path: keyword-matched actions include `fix-vue-imports` — choosing it runs
 * action-registry code (no dialog/LLM pipeline), but still proves the router form does not repeat.
 */
export async function scriptedRouterChoiceNoStickyRouter() {
  const task = 'fix vue imports';

  const initial = { task };
  if (!validateServerInvokeRequest(initial)) {
    throw new Error(`Schema invalid (initial): ${ajv.errorsText(validateServerInvokeRequest.errors)}`);
  }

  const first = await invokeRaw(initial);
  if (first.status !== 200 || first.envelope?.success === false) {
    throw new Error(`Initial invoke failed: ${JSON.stringify(first.envelope ?? first)}`);
  }
  const pid1 = first.data?.promiseId;
  if (typeof pid1 !== 'string') {
    throw new Error('Expected first invoke to return data.promiseId');
  }
  const t1 = await pollInvokeTerminal(pid1);
  if (!t1?.data) throw new Error('First invoke poll did not return terminal data');
  if (!isRouterForm(t1.data.execute)) {
    throw new Error('Expected first response to include a router form (execute.form.choices)');
  }

  const followUp = {
    context: {
      // `/api/v1/invoke` responses may omit `session_id` from the returned context; for follow-ups we can
      // bind the stateless contour explicitly (same as invoke.service default when missing).
      session_id: 'stateless',
      task,
      execution: { action: 'task', step: 'router' },
    },
    result: { choice: 'fix-vue-imports' },
  };

  if (!validateServerInvokeRequest(followUp)) {
    throw new Error(`Schema invalid (follow-up): ${ajv.errorsText(validateServerInvokeRequest.errors)}`);
  }

  const second = await invokeRaw(followUp);
  if (second.status !== 200 || second.envelope?.success === false) {
    throw new Error(`Follow-up invoke failed: ${JSON.stringify(second.envelope ?? second)}`);
  }
  const pid2 = second.data?.promiseId;
  if (typeof pid2 !== 'string') {
    throw new Error('Expected follow-up invoke to return data.promiseId');
  }
  const t2 = await pollInvokeTerminal(pid2);
  if (!t2?.data) throw new Error('Follow-up invoke poll did not return terminal data');

  if (isRouterForm(t2.data.execute)) {
    throw new Error('Sticky router: second response still has router form.choices');
  }
}
