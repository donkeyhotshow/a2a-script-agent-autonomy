/**
 * Direct hub API check: first POST /api/chat?promise=1 fills L3 disk cache;
 * second identical body returns HTTP 200 with cached: true (try_resolve_promise_from_cache).
 *
 * Requires: ai-integration (AI_HUB_URL) + Local LLM upstream with at least one model.
 *   node tests/proba-servera/cache-api-smoke.mjs
 * Env: AI_HUB_URL, LOCAL_LLM_TAGS_URL (default http://localhost:11435/api/tags), PROBA_CACHE_SMOKE_MODEL
 */
import process from 'node:process';

const hub = (process.env.AI_HUB_URL || 'http://localhost:11434').replace(/\/$/, '');
const tagsUrl = (process.env.LOCAL_LLM_TAGS_URL || 'http://localhost:11435/api/tags').replace(/\/$/, '');
const deadlineMs = Number(process.env.PROBA_CACHE_SMOKE_TIMEOUT_MS || '180000') || 180000;

async function pickModel() {
  const envModel = (process.env.PROBA_CACHE_SMOKE_MODEL || '').trim();
  if (envModel) return envModel;
  const r = await fetch(tagsUrl);
  if (!r.ok) throw new Error(`Local LLM upstream tags ${tagsUrl} → ${r.status}`);
  const j = await r.json();
  const name = j?.models?.[0]?.name;
  if (typeof name !== 'string' || !name) throw new Error('No Local LLM upstream models; pull one or set PROBA_CACHE_SMOKE_MODEL');
  return name;
}

function chatBody(model) {
  return {
    model,
    messages: [{ role: 'user', content: 'proba L3 disk cache smoke — fixed deterministic prompt' }],
    stream: false,
    options: { temperature: 0, num_predict: 8 },
  };
}

async function postPromiseChat(body, serverPromiseId) {
  const r = await fetch(`${hub}/api/chat?promise=1`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Server-Promise-Id': serverPromiseId,
    },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`POST /api/chat?promise=1 → ${r.status} non-JSON: ${text.slice(0, 400)}`);
  }
  return { httpStatus: r.status, json, raw: text };
}

async function waitDone(promiseId) {
  const end = Date.now() + deadlineMs;
  while (Date.now() < end) {
    const r = await fetch(`${hub}/promise/${encodeURIComponent(promiseId)}`);
    if (r.status === 404) throw new Error(`promise ${promiseId} not found`);
    if (r.status === 500) {
      const t = await r.text();
      throw new Error(`promise error: ${t.slice(0, 500)}`);
    }
    if (r.status === 200) {
      const j = await r.json();
      if (j.status === 'done') return j;
    }
    await new Promise((res) => setTimeout(res, 400));
  }
  throw new Error(`timeout ${deadlineMs}ms waiting for promise ${promiseId}`);
}

async function main() {
  const h = await fetch(`${hub}/health`).catch(() => null);
  if (!h?.ok) {
    console.error(`FAIL: ai-integration health ${hub}/health — start stack (start-all.bat) or set AI_HUB_URL`);
    process.exit(2);
  }

  const model = await pickModel();
  const body = chatBody(model);
  console.log(`Hub ${hub} model ${model}`);

  const a = await postPromiseChat(body, `smoke-a-${Date.now()}`);
  if (a.httpStatus === 200 && a.json.cached === true) {
    console.log('First response was already cached (warm cache). Running second POST to confirm hit…');
  } else if (a.httpStatus === 202 && a.json.promiseId) {
    console.log('First POST → 202 pending, waiting for Local LLM upstream…');
    await waitDone(a.json.promiseId);
    console.log('First promise done (cache populated).');
  } else {
    console.error('Unexpected first response:', a.httpStatus, a.json);
    process.exit(1);
  }

  const b = await postPromiseChat(body, `smoke-b-${Date.now()}`);
  if (b.httpStatus !== 200 || b.json.cached !== true) {
    console.error('FAIL: second identical body should be HTTP 200 + cached: true', b.httpStatus, b.json);
    process.exit(1);
  }
  if (typeof b.json.responseBody !== 'string' || b.json.responseBody.length < 2) {
    console.error('FAIL: missing responseBody on cached response', b.json);
    process.exit(1);
  }

  const c = await postPromiseChat(
    {
      ...body,
      client_timestamp: Date.now(),
      request_id: `noise-${Math.random()}`,
    },
    `smoke-c-${Date.now()}`
  );
  if (c.httpStatus !== 200 || c.json.cached !== true) {
    console.error(
      'FAIL: third POST with extra volatile fields should still hit cache',
      c.httpStatus,
      c.json
    );
    process.exit(1);
  }

  console.log('OK: second + third POST returned cached: true (same key after normalization).');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
