#!/usr/bin/env node
/**
 * Every N minutes (default 10) writes hook files under hooks/ for Cursor / IDE agents
 * watching the repo (file change = wake signal). Distinct from Task Monitor's task_monitor_issue.
 *
 *   npm run cursor:hook-ticker          # loop
 *   npm run cursor:hook-ticker:once     # single write, exit
 *
 * Cursor IDE Hooks (https://cursor.com/docs/hooks): `.cursor/hooks.json` can call this
 * script on lifecycle events (e.g. afterAgentResponse).
 *
 * Env: CURSOR_HOOK_INTERVAL_MS (default 600000), CURSOR_HOOK_SIGNAL_DIR (default hooks),
 *      CURSOR_HOOK_DEFER_FIRST_MS — wait before first write (default 0 = write immediately)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const INTERVAL_MS = Number(process.env.CURSOR_HOOK_INTERVAL_MS || 600_000);
const SIGNAL_DIR = path.resolve(
  REPO_ROOT,
  process.env.CURSOR_HOOK_SIGNAL_DIR || 'hooks'
);
const DEFER_FIRST_MS = Number(process.env.CURSOR_HOOK_DEFER_FIRST_MS || 0);
const ONCE = process.argv.includes('--once');

const JSON_NAME = 'CURSOR_AGENT_SIGNAL.json';
const MD_NAME = 'CURSOR_AGENT_SIGNAL.md';

function buildPayload() {
  const createdAt = new Date().toISOString();
  const hookId = `cursor_agent_signal_${Date.now()}`;
  return {
    hookId,
    type: 'cursor_agent_signal',
    status: 'heartbeat',
    message:
      'Scheduled IDE agent wake: reconcile DEV_STATE (root + modules), tasks/pending/, AGENTS empty-queue protocol; optional npm run gang:orient-session when stack is up.',
    intervalMinutes: INTERVAL_MS / 60_000,
    createdAt,
    suggestedActions: [
      'Read this file + hooks/CURSOR_AGENT_SIGNAL.md',
      'Prune/discover/write per AGENTS.md if queue looks empty',
      'Run npm run test:gang before deep changes when unsure; npm run test:recon:mama (offline) or test:recon (stack up) for stricter recon',
    ],
    references: {
      agents: 'AGENTS.md',
      papaMama: 'PAPA-MAMA.md',
      orientScript: 'tests/gang-orient-session.mjs',
      fullSpectrum: 'START-FULL-SPECTRUM.md',
    },
  };
}

function writeSignals() {
  fs.mkdirSync(SIGNAL_DIR, { recursive: true });
  const payload = buildPayload();
  const jsonPath = path.join(SIGNAL_DIR, JSON_NAME);
  const mdPath = path.join(SIGNAL_DIR, MD_NAME);

  fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  const md = `# Cursor / IDE agent signal

**Tick:** \`${payload.createdAt}\`  
**hookId:** \`${payload.hookId}\`

${payload.message}

## Suggested actions

${payload.suggestedActions.map((a) => `- ${a}`).join('\n')}

## References

- \`${payload.references.agents}\`
- \`${payload.references.papaMama}\`
- \`${payload.references.orientScript}\`
- \`${payload.references.fullSpectrum}\`

---
*Written by \`scripts/cursor-hook-ticker.mjs\` — not Task Monitor.*
`;
  fs.writeFileSync(mdPath, md, 'utf8');

  console.log(`[cursor-hook-ticker] wrote ${jsonPath} + ${mdPath}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  if (!Number.isFinite(INTERVAL_MS) || INTERVAL_MS < 10_000) {
    console.error('[cursor-hook-ticker] CURSOR_HOOK_INTERVAL_MS must be >= 10000');
    process.exit(1);
  }

  if (ONCE) {
    if (DEFER_FIRST_MS > 0) await sleep(DEFER_FIRST_MS);
    writeSignals();
    return;
  }

  console.log(
    `[cursor-hook-ticker] interval ${INTERVAL_MS}ms, dir ${SIGNAL_DIR} (Ctrl+C to stop)`
  );

  if (DEFER_FIRST_MS > 0) await sleep(DEFER_FIRST_MS);
  writeSignals();

  setInterval(writeSignals, INTERVAL_MS);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
