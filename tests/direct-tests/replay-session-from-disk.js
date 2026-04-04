#!/usr/bin/env node
/**
 * Replay stored Client API steps: POST /sessions from a JSON file, then for each numeric
 * subfolder (ascending) POST /next with that step's client-result.json when present.
 * Use to reproduce router loops or compare live stack behavior to disk captures.
 *
 * Usage:
 *   node tests/direct-tests/replay-session-from-disk.js <sessionDir> <createBody.json>
 *   node tests/direct-tests/replay-session-from-disk.js <sessionDir>
 *     (uses <sessionDir>/replay-create.json if it exists)
 *
 * Env: CLIENT_API_URL (default http://localhost:5173)
 * Flags: --dry-run — print bodies only, no HTTP
 *        --assert-no-sticky-router — after a router choice /next, fail if still task/router + form.choices (GET ?includeContext=1)
 */

import fs from 'fs/promises';
import path from 'path';

const CLIENT_API_URL = process.env.CLIENT_API_URL || 'http://localhost:5173';

/** Known pipeline choice ids (static router tail + registry examples). */
const ROUTER_CHOICE_IDS = new Set([
  'dialog',
  'agent',
  'task-decomposition',
  'fix-vue-imports',
  'fix-laravel-namespaces-and-uses',
]);

function isRouterChoiceSubmitBody(body) {
  if (!body || typeof body !== 'object') return false;
  const c = body.result?.choice;
  if (typeof c === 'string' && c && ROUTER_CHOICE_IDS.has(c)) return true;
  const t = body.task;
  if (typeof t === 'string' && t && ROUTER_CHOICE_IDS.has(t) && !body.result)
    return true;
  return false;
}

function sessionStillStuckOnRouter(pub) {
  const ex = pub.execute;
  const ctx = pub.context;
  const choices = ex?.form?.choices;
  if (!Array.isArray(choices) || choices.length < 2) return false;
  if (ctx?.execution?.step !== 'router') return false;
  if (ctx?.execution?.action !== 'task') return false;
  return true;
}

function parseArgs(argv) {
  const dryRun = argv.includes('--dry-run');
  const assertNoStickyRouter = argv.includes('--assert-no-sticky-router');
  const pos = argv.filter((a) => !a.startsWith('--'));
  return {
    dryRun,
    assertNoStickyRouter,
    sessionDir: pos[0],
    createPath: pos[1],
  };
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function readJson(p) {
  const raw = await fs.readFile(p, 'utf8');
  return JSON.parse(raw);
}

async function listNumericStepDirs(sessionDir) {
  const names = await fs.readdir(sessionDir, { withFileTypes: true });
  const nums = [];
  for (const d of names) {
    if (!d.isDirectory()) continue;
    const n = parseInt(d.name, 10);
    if (String(n) === d.name && n >= 1) nums.push(n);
  }
  nums.sort((a, b) => a - b);
  return nums;
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

async function main() {
  const {
    dryRun,
    assertNoStickyRouter,
    sessionDir,
    createPath: createPathArg,
  } = parseArgs(process.argv.slice(2));
  if (!sessionDir) {
    console.error(
      'Usage: node replay-session-from-disk.js <sessionDir> [createBody.json] [--dry-run] [--assert-no-sticky-router]'
    );
    process.exit(1);
  }

  const resolved = path.resolve(sessionDir);
  let createPath = createPathArg
    ? path.resolve(createPathArg)
    : path.join(resolved, 'replay-create.json');
  let createBody;
  try {
    createBody = await readJson(createPath);
  } catch (e) {
    console.error(
      `Missing or invalid create body. Provide second arg or create:\n  ${path.join(resolved, 'replay-create.json')}`
    );
    console.error(e.message || e);
    process.exit(1);
  }

  const steps = await listNumericStepDirs(resolved);
  if (!steps.length) {
    console.error('No numeric step directories under', resolved);
    process.exit(1);
  }

  console.log('Session dir:', resolved);
  console.log('Create:', createPath);
  console.log('Step dirs:', steps.join(', '));

  if (dryRun) {
    console.log('\n[dry-run] POST /sessions body:', JSON.stringify(createBody, null, 2));
    for (const n of steps) {
      const cr = path.join(resolved, String(n), 'client-result.json');
      try {
        const body = await readJson(cr);
        console.log(`\n[dry-run] step ${n} /next body:`, JSON.stringify(body, null, 2));
      } catch {
        // no client result for this step
      }
    }
    return;
  }

  const cRes = await fetch(`${CLIENT_API_URL}/api/a2a/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createBody),
  });
  if (!cRes.ok) {
    console.error('Create session failed:', cRes.status, await cRes.text());
    process.exit(1);
  }
  const created = await cRes.json();
  const sessionId =
    created.session?.id || created.id || created.sessionId || created.ID;
  if (!sessionId) {
    console.error('No session id in create response:', created);
    process.exit(1);
  }
  console.log('\nNew session:', sessionId);

  for (const n of steps) {
    const crPath = path.join(resolved, String(n), 'client-result.json');
    let body;
    try {
      body = await readJson(crPath);
    } catch {
      continue;
    }
    console.log(`\n--- /next replay from step folder ${n} ---`);
    const nRes = await fetch(
      `${CLIENT_API_URL}/api/a2a/sessions/${sessionId}/next`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
    if (!nRes.ok) {
      console.error('next failed:', nRes.status, await nRes.text());
      process.exit(1);
    }
    const ack = await nRes.json();
    if (ack.asyncPending) {
      console.log('async pending, polling…');
      await pollAsyncSettled(sessionId, 120_000);
    }
    const g = await fetch(`${CLIENT_API_URL}/api/a2a/sessions/${sessionId}`);
    const sess = await g.json();
    const pub = sess.session || sess;
    const ex = pub.execute;
    const choices = ex?.form?.choices?.length;
    const stage = pub.stage;
    console.log('stage:', stage, 'form.choices:', choices ?? 0);

    if (assertNoStickyRouter && isRouterChoiceSubmitBody(body)) {
      const gctx = await fetch(
        `${CLIENT_API_URL}/api/a2a/sessions/${sessionId}?includeContext=1`
      );
      if (!gctx.ok) {
        console.error(
          'assert-no-sticky-router: includeContext GET failed:',
          gctx.status,
          await gctx.text()
        );
        process.exit(1);
      }
      const sessCtx = await gctx.json();
      const pubCtx = sessCtx.session || sessCtx;
      if (sessionStillStuckOnRouter(pubCtx)) {
        console.error(
          `assert-no-sticky-router: still on router after choice submit (step folder ${n})`,
          JSON.stringify(
            {
              execution: pubCtx.context?.execution,
              choiceCount: pubCtx.execute?.form?.choices?.length,
            },
            null,
            2
          )
        );
        process.exit(1);
      }
    }
  }

  const final = await fetch(`${CLIENT_API_URL}/api/a2a/sessions/${sessionId}`);
  const j = await final.json();
  console.log('\nFinal session keys:', Object.keys(j.session || j));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
