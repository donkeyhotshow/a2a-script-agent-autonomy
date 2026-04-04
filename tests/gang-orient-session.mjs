#!/usr/bin/env node
/**
 * Post–Papa–Mama hook: open an agent-mode Client API session seeded with an orientation task
 * (DEV_STATE sweep, tasks/, AGENTS protocol). Requires live stack: Vite Client API + A2A server.
 *
 * Standalone: npm run gang:orient-session
 * After gang (green): GANG_ORIENT_SESSION=1 npm run test:gang
 *
 * Env: CLIENT_API_URL (default http://localhost:5173), A2A_SERVER_URL (default http://localhost:3000)
 */
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const CLIENT_API_URL = process.env.CLIENT_API_URL || 'http://localhost:5173';
const SERVER_URL = process.env.A2A_SERVER_URL || 'http://localhost:3000';

const ORIENTATION_TASK = `Continue repo work (orientation pass). Order:
1) Read AGENTS.md at repo root — Client API path, router two beats, empty-queue protocol.
2) Read DEV_STATE.md at root, a2a-server/DEV_STATE.md, a2a-client/DEV_STATE.md, ai-integration/DEV_STATE.md — reconcile; module queues may differ.
3) Read PAPA-MAMA.md and skim tasks/pending/ + tasks/ide-prompts/ — pick the next concrete, testable item per AGENTS self-upgrade order.
4) Execute: tools + code; update DEV_STATE before/after. If queue looks empty, prune → discover → write tasks (do not stop).
5) For live stack verification use Client API only: POST /api/a2a/sessions (mode agent), then /next and poll /async; inspect GET …/sessions/{id} for router vs free-text beat.

Project root for file tools: ${REPO_ROOT.replace(/\\/g, '/')}`;

function fetchWithTimeout(url, ms = 8000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  return fetch(url, { signal: ac.signal }).finally(() => clearTimeout(t));
}

async function clientReachable() {
  try {
    const r = await fetchWithTimeout(`${CLIENT_API_URL}/api/a2a/projects`);
    return r.ok;
  } catch {
    return false;
  }
}

async function serverReachable() {
  try {
    const r = await fetchWithTimeout(`${SERVER_URL}/health`);
    return r.ok;
  } catch {
    return false;
  }
}

async function resolveProjectId() {
  try {
    const r = await fetch(`${CLIENT_API_URL}/api/a2a/projects`);
    if (!r.ok) return 'default';
    const j = await r.json();
    const list = j.projects || j;
    if (Array.isArray(list) && list[0]?.id) return list[0].id;
  } catch {
    /* ignore */
  }
  return 'default';
}

async function createOrientSession(projectId) {
  const response = await fetch(`${CLIENT_API_URL}/api/a2a/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId,
      mode: 'agent',
      task: ORIENTATION_TASK,
    }),
  });
  if (!response.ok) {
    const t = await response.text();
    throw new Error(`create session ${response.status}: ${t}`);
  }
  const raw = await response.json();
  const session = raw.session ?? raw;
  const sessionId = session?.id || raw.sessionId || raw.id;
  return { sessionId, raw };
}

function printOfflineFallback() {
  console.log('\n[GANG ORIENT] Client API or server not reachable.');
  console.log('Start stack (e.g. start-all.bat), then: npm run gang:orient-session');
  console.log('--- Paste into IDE agent or seed session task ---\n');
  console.log(ORIENTATION_TASK);
  console.log('\n--- end ---\n');
}

async function main() {
  const okClient = await clientReachable();
  const okServer = await serverReachable();
  if (!okClient || !okServer) {
    printOfflineFallback();
    process.exit(0);
  }

  const projectId = await resolveProjectId();
  const { sessionId } = await createOrientSession(projectId);

  console.log('\n====================================================');
  console.log('[GANG ORIENT] Agent session opened (orientation hook)');
  console.log('====================================================');
  console.log(`sessionId: ${sessionId}`);
  console.log(`projectId: ${projectId}`);
  console.log(`Open UI or drive: GET ${CLIENT_API_URL}/api/a2a/sessions/${sessionId}?includeContext=1`);
  console.log('Then POST …/next + poll …/async per AGENTS.md (router two beats).');
  console.log('====================================================\n');
}

main().catch((e) => {
  console.error('[GANG ORIENT]', e.message || e);
  printOfflineFallback();
  process.exit(1);
});
